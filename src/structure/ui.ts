// The few surfaces the structure features draw, all in Logseq's document beside the
// key popover: one quiet hint line under the block being edited, a small table panel
// (sweep, new-page fields, children as a table), and the page's fill-later count.
// Nothing here writes to the graph; callers pass the actions.

import { escapeHtml } from "./text";

// ── The accept key ─────────────────────────────────────────────────────────────
// Hyper is ⌃⌥⇧⌘ pressed together (usually Caps Lock remapped). It fires when the
// modifiers are released without another key, so Hyper shortcuts keep working.
// Tab can't be used: it indents in Logseq.

export type AcceptKey = "Hyper" | "Ctrl+Shift+Enter" | "off";

const isModifier = (k: string) => k === "Control" || k === "Alt" || k === "Shift" || k === "Meta" || k === "Hyper";
const allFour = (e: KeyboardEvent) => e.ctrlKey && e.altKey && e.shiftKey && e.metaKey;

export function watchAccept(doc: Document, key: () => AcceptKey, accept: () => boolean): () => void {
  let armed = false;
  const down = (e: KeyboardEvent) => {
    const k = key();
    if (k === "Hyper") {
      if (isModifier(e.key) && (allFour(e) || e.key === "Hyper")) armed = true;
      else if (!isModifier(e.key)) armed = false;
    } else if (k === "Ctrl+Shift+Enter" && e.key === "Enter" && e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey) {
      if (accept()) { e.preventDefault(); e.stopPropagation(); }
    }
  };
  const up = (e: KeyboardEvent) => {
    if (armed && isModifier(e.key)) { armed = false; accept(); }
  };
  const blur = () => { armed = false; };
  doc.addEventListener("keydown", down, true);
  doc.addEventListener("keyup", up, true);
  doc.defaultView?.addEventListener("blur", blur);
  return () => {
    doc.removeEventListener("keydown", down, true);
    doc.removeEventListener("keyup", up, true);
    doc.defaultView?.removeEventListener("blur", blur);
  };
}

export const keyLabel = (k: AcceptKey) => (k === "Hyper" ? "Hyper" : k === "off" ? "" : "⌃⇧↩");

// ── The hint ───────────────────────────────────────────────────────────────────
// One line, quiet, just under the anchor (the block being edited). Never focusable,
// never in the way of the pointer.

export function showHint(doc: Document, anchor: Element | null, html: string) {
  let el = doc.getElementById("qs-hint");
  if (!el) {
    el = Object.assign(doc.createElement("div"), { id: "qs-hint" });
    el.setAttribute("role", "status");
    doc.body.append(el);
  }
  el.innerHTML = html;
  place(el, anchor);
}

export const hideHint = (doc: Document) => doc.getElementById("qs-hint")?.remove();

function place(el: HTMLElement, anchor: Element | null) {
  const win = el.ownerDocument.defaultView!;
  const r = anchor?.getBoundingClientRect();
  if (!r || !r.width) {
    Object.assign(el.style, { left: "", top: "", right: "16px", bottom: "16px" });
    return;
  }
  const top = Math.min(r.bottom + 2, win.innerHeight - 28);
  Object.assign(el.style, { left: `${Math.max(8, r.left)}px`, top: `${top}px`, right: "", bottom: "" });
}

// ── The table panel ────────────────────────────────────────────────────────────
// Rows of blocks, columns of properties, one input per cell. Enter saves the cell and
// moves down its column; Esc closes. Used by the sweep, the new-page fields and the
// children-as-table flip.

export interface Column { key: string; title: string; hint?: string }
export interface Row { id: number; title: string; cells: Record<string, string> }
export interface PanelOptions {
  id: string;
  title: string;
  note?: string;
  columns: Column[];
  rows: Row[];
  /** Saves one cell. Resolves to an error message, or null when saved. */
  save: (row: Row, col: Column, text: string) => Promise<string | null>;
  anchor?: Element | null;
  onClose?: () => void;
  /** Only empty cells take input; filled ones show their value. */
  onlyEmpty?: boolean;
}

export function openPanel(doc: Document, o: PanelOptions) {
  doc.getElementById(o.id)?.dispatchEvent(new Event("qs-close"));
  const el = Object.assign(doc.createElement("div"), { id: o.id, className: "qs-panel" });
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", o.title);
  const cell = (row: Row, col: Column, r: number, c: number) => {
    const v = row.cells[col.key] ?? "";
    if (o.onlyEmpty && v) return `<td class="qs-filled">${escapeHtml(v)}</td>`;
    return `<td><input data-r="${r}" data-c="${c}" value="${escapeHtml(v)}" placeholder="${escapeHtml(col.hint ?? "")}" aria-label="${escapeHtml(`${col.title} for ${row.title}`)}"></td>`;
  };
  el.innerHTML = `
    <div class="qs-panel-head"><span>${escapeHtml(o.title)}</span><button type="button" class="qs-panel-close" aria-label="Close">Esc</button></div>
    ${o.note ? `<div class="qs-panel-note">${escapeHtml(o.note)}</div>` : ""}
    <div class="qs-panel-scroll"><table>
      <thead><tr><th></th>${o.columns.map((c) => `<th>${escapeHtml(c.title)}</th>`).join("")}</tr></thead>
      <tbody>${o.rows.map((row, r) => `<tr><th scope="row">${escapeHtml(row.title)}</th>${o.columns.map((col, c) => cell(row, col, r, c)).join("")}</tr>`).join("")}</tbody>
    </table></div>
    <div class="qs-panel-msg" role="status"></div>`;
  const msg = el.querySelector<HTMLElement>(".qs-panel-msg")!;
  const inputs = () => [...el.querySelectorAll<HTMLInputElement>("input")];
  const close = () => {
    el.remove();
    doc.removeEventListener("pointerdown", outside, true);
    o.onClose?.();
  };
  const outside = (e: Event) => { if (!el.contains(e.target as Node)) close(); };
  const next = (from: HTMLInputElement) => {
    const all = inputs(), c = from.dataset.c;
    const sameCol = all.filter((i) => i.dataset.c === c);
    return sameCol[sameCol.indexOf(from) + 1] ?? all[all.indexOf(from) + 1] ?? null;
  };
  el.addEventListener("keydown", async (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); return close(); }
    const input = e.target as HTMLInputElement;
    if (e.key !== "Enter" || input.tagName !== "INPUT") return;
    e.preventDefault(); e.stopPropagation();
    const row = o.rows[+input.dataset.r!], col = o.columns[+input.dataset.c!];
    const text = input.value.trim();
    if (text !== (row.cells[col.key] ?? "")) {
      const err = text ? await o.save(row, col, text) : null;
      msg.textContent = err ?? `Saved ${col.title} for ${row.title}`;
      if (err) return;
      row.cells[col.key] = text;
      input.classList.add("qs-saved");
    }
    const n = next(input);
    if (n) n.focus(); else close();
  });
  // Typing inside the panel must not reach Logseq's own shortcuts.
  el.addEventListener("keyup", (e) => e.stopPropagation());
  el.addEventListener("qs-close", close);
  el.querySelector(".qs-panel-close")!.addEventListener("click", close);
  doc.addEventListener("pointerdown", outside, true);
  doc.body.append(el);
  const r = o.anchor?.getBoundingClientRect();
  if (r && r.width) Object.assign(el.style, { transform: "none", left: `${Math.max(8, r.left)}px`, top: `${Math.min(r.top, doc.defaultView!.innerHeight - 260)}px`, width: `${Math.max(360, Math.min(r.width, 720))}px` });
  (inputs().find((i) => !i.value) ?? inputs()[0])?.focus();
  return close;
}

// ── The fill-later count ──────────────────────────────────────────────────────

export function showTally(doc: Document, count: number, open: () => void) {
  let el = doc.getElementById("qs-tally") as HTMLButtonElement | null;
  if (!count) return el?.remove();
  if (!el) {
    el = Object.assign(doc.createElement("button"), { id: "qs-tally", type: "button" });
    doc.body.append(el);
  }
  el.onclick = () => open(); // rebound each time, so it never calls a stale page
  el.textContent = `${count} field${count === 1 ? "" : "s"} to fill · sweep`;
}

/** Styles for the hint, panel and count: Logseq's surface colors and the system's tokens. */
export const STRUCTURE_CSS = `
#qs-hint {
  position: fixed; z-index: 998; pointer-events: none; max-width: min(640px, calc(100vw - 32px));
  font-size: 12px; line-height: 1.5; padding: 1px 0;
  color: var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground, 0 0% 10%)))); opacity: var(--qs-quiet, 0.5);
}
#qs-hint b { font-weight: 600; }
#qs-hint kbd {
  font: 11px ui-monospace, Menlo, monospace; padding: 0 4px; border-radius: 3px;
  border: 1px solid var(--ls-border-color, hsl(var(--border, 0 0% 90%)));
}
.qs-panel {
  position: fixed; z-index: 999; left: 50%; top: 20%; transform: translateX(-50%); width: min(640px, calc(100vw - 32px));
  display: grid; gap: 6px; padding: 10px 12px;
  background: var(--ls-primary-background-color, hsl(var(--popover, 0 0% 100%)));
  color: var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground, 0 0% 10%))));
  border: 1px solid var(--ls-border-color, hsl(var(--border, 0 0% 90%))); border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12); font-size: 13px;
}
.qs-panel-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--qs-prop-key); }
.qs-panel-close { border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.qs-panel-note, .qs-panel-msg { font-size: 12px; color: var(--qs-prop-key); }
.qs-panel-msg:empty { display: none; }
.qs-panel-scroll { overflow: auto; max-height: 50vh; }
.qs-panel table { width: 100%; border-collapse: collapse; }
.qs-panel th { text-align: left; font-weight: 400; font-size: 11px; color: var(--qs-prop-key); padding: 2px 8px 4px 0; }
.qs-panel tbody th { font-size: 13px; color: inherit; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qs-panel td { border-top: 1px solid var(--ls-border-color, hsl(var(--border, 0 0% 90%))); padding: 2px 8px 2px 0; }
.qs-panel tbody th { border-top: 1px solid var(--ls-border-color, hsl(var(--border, 0 0% 90%))); }
.qs-panel td.qs-filled { color: var(--qs-prop-key); }
.qs-panel input {
  width: 100%; min-width: 7em; border: 0; background: transparent; color: inherit; font: inherit; padding: 2px 0;
  box-shadow: inset 0 -1px 0 transparent;
}
.qs-panel input:focus { outline: none; box-shadow: inset 0 -1.5px 0 var(--qs-state); }
.qs-panel input.qs-saved { color: var(--qs-prop-key); }
#qs-tally {
  position: fixed; right: 16px; bottom: 16px; z-index: 997; border: 0; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground, 0 0% 10%))));
  opacity: var(--qs-quiet, 0.5); transition: opacity var(--qs-ease, 150ms ease);
}
#qs-tally:is(:hover, :focus-visible) { opacity: 1; }
.qs-relations { display: grid; gap: 8px; margin: 8px 0 16px; font-size: 14px; }
.qs-relations .qs-rh { font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--qs-prop-key); }
.qs-relations .qs-rgroup { display: grid; gap: 1px; }
.qs-relations a { cursor: pointer; }
.qs-relations .qs-fold { display: inline; }
.qs-relations .qs-fold summary { display: inline; cursor: pointer; list-style: none; color: var(--qs-prop-key); }
.qs-relations .qs-fold summary::-webkit-details-marker { display: none; }
.qs-relations .qs-fold[open] { display: block; }
.qs-relations .qs-fold-list { display: grid; gap: 1px; padding: 2px 0 4px 12px; font-size: 13px; }
.qs-relations .qs-quiet { opacity: var(--qs-quiet, 0.5); }
#main-content-container .references:has(> [id$="qs-relations"]) { display: flex; flex-direction: column; }
#main-content-container .references > [id$="qs-relations"] { order: -1; }
.block-title-wrap[data-qs-inherit]::after {
  content: "↳ " attr(data-qs-inherit); margin-left: 0.5em; font-size: 0.8em; white-space: nowrap;
  color: var(--qs-prop-key); opacity: var(--qs-quiet, 0.5);
}
.ls-block[data-qs-ambient] > .block-children-container > .block-children-left-border {
  opacity: var(--qs-quiet, 0.5);
}`;
