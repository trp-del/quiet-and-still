// Behaviour CSS can't do alone: the peek key, marking repeat page mentions, and the
// key popover. Each works on Logseq's own document (the plugin runs in an iframe)
// and only toggles classes or reads styles that the library already defines.

import type { System } from "./systems";

/** Logseq's document, or null where there is none (tests, a detached iframe). */
export function hostDocument(): Document | null {
  try {
    return typeof window !== "undefined" && window.parent !== window ? window.parent.document : null;
  } catch {
    return null;
  }
}

// ── Peek ───────────────────────────────────────────────────────────────────────
// Holding the key alone adds .qs-peek to <html>; chrome.peek raises the levels.
// A short hold threshold keeps ⌥-letter typing and shortcuts from flashing it.

const HOLD_MS = 180;

export function watchPeek(doc: Document, key: () => string | null): () => void {
  const root = doc.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const off = () => { clearTimeout(timer); root.classList.remove("qs-peek"); };
  const down = (e: KeyboardEvent) => {
    // Only the key on its own: Hyper (⌃⌥⇧⌘) also presses Alt, and must not peek.
    const k = key();
    const others = (e.ctrlKey && k !== "Control") || (e.altKey && k !== "Alt") || e.shiftKey || e.metaKey;
    if (e.key !== k || others) return off();
    if (!e.repeat) timer = setTimeout(() => root.classList.add("qs-peek"), HOLD_MS);
  };
  const up = (e: KeyboardEvent) => { if (e.key === key()) off(); };
  const win = doc.defaultView!;
  doc.addEventListener("keydown", down, true);
  doc.addEventListener("keyup", up, true);
  win.addEventListener("blur", off);
  return () => {
    off();
    doc.removeEventListener("keydown", down, true);
    doc.removeEventListener("keyup", up, true);
    win.removeEventListener("blur", off);
  };
}

export const togglePeek = (doc: Document) => doc.documentElement.classList.toggle("qs-peek");

// ── Repeat mentions ────────────────────────────────────────────────────────────
// Within each scope (the main page, each right-sidebar item) the first link to a
// page keeps its line; later ones get .qs-repeat. Re-marked after the DOM settles.

const SCOPES = "#main-content-container, #right-sidebar .sidebar-item";

export function markRepeats(doc: Document) {
  for (const scope of doc.querySelectorAll(SCOPES)) {
    const seen = new Set<string>();
    for (const a of scope.querySelectorAll<HTMLElement>("a.page-ref")) {
      const id = a.dataset.uuid ?? a.dataset.ref ?? a.textContent ?? "";
      a.classList.toggle("qs-repeat", seen.has(id));
      seen.add(id);
    }
  }
}

export function watchRepeats(doc: Document): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => markRepeats(doc), 200);
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  markRepeats(doc);
  return () => {
    clearTimeout(timer);
    observer.disconnect();
    for (const a of doc.querySelectorAll(".qs-repeat")) a.classList.remove("qs-repeat");
  };
}

// ── The key ────────────────────────────────────────────────────────────────────
// A popover listing the system's keys. Each row shows a sample drawn with Logseq's
// own classes, so the plugin's styles render it exactly as on the page. Pointing at
// a row fades every block that doesn't contain that type.

const KINDS: Record<string, { sample: string; selector?: string }> = {
  "page ref": { sample: `<a class="page-ref">Page</a>`, selector: "a.page-ref" },
  "tag": { sample: `<a class="tag">#tag</a>`, selector: "a.tag" },
  "block ref": { sample: `<span class="block-ref">block</span>`, selector: ".block-ref" },
  "date": { sample: `<span class="ls-datetime">Nov 2nd</span>`, selector: ":is(.ls-datetime, .timestamp)" },
  "properties": { sample: `<span class="property-key">key</span>`, selector: ".ls-properties-area" },
  "highlight": { sample: `<span class="block-content"><mark>text</mark></span>`, selector: "mark" },
  "state": { sample: `<span class="positioned-properties block-left">●</span>`, selector: ".positioned-properties.block-left" },
  "doing": { sample: `<span class="positioned-properties block-left">●</span>`, selector: ".positioned-properties.block-left" },
  "doing / overdue": { sample: `<span class="overdue"><span class="ls-datetime">●</span></span>`, selector: ":is(.positioned-properties.block-left, .overdue)" },
  "open task": { sample: `<span class="qs-key-box"></span>`, selector: ".block-title-wrap > .ui__checkbox:not(.checked)" },
  "done": { sample: `<span class="qs-key-done">done</span>`, selector: ".ui__checkbox.checked" },
};

/** Fades blocks without the kind; empty string clears. Used as its own stylesheet. */
export const spotlightCss = (kind: string | null) => {
  const sel = kind ? KINDS[kind]?.selector : undefined;
  return sel
    ? `html #main-content-container .block-main-container:not(:has(${sel})) {
        opacity: var(--qs-whisper); transition: opacity var(--qs-ease);
      }`
    : "";
};

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function keyHtml(system: System) {
  const rows = Object.entries(system.keys).map(([kind, how]) => `
    <button type="button" class="qs-key-row" data-kind="${escape(kind)}">
      <span class="qs-key-sample">${KINDS[kind]?.sample ?? ""}</span>
      <span><span class="qs-key-kind">${escape(kind)}</span> · ${escape(how)}</span>
    </button>`).join("");
  return `<div class="qs-key-head">The key · ${escape(system.name)}</div>${rows}`;
}

/** Opens the key, or closes it if open. `spot` receives the kind being pointed at. */
export function toggleKey(doc: Document, system: System, spot: (kind: string | null) => void) {
  const open = doc.getElementById("qs-key");
  if (open) return void (open as HTMLElement & { qsClose?: () => void }).qsClose?.();

  const el = Object.assign(doc.createElement("div"), { id: "qs-key", innerHTML: keyHtml(system) });
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", `The key for ${system.name}`);
  const point = (e: Event) => {
    const row = (e.target as Element).closest<HTMLElement>(".qs-key-row");
    spot(row?.dataset.kind ?? null);
  };
  const close = () => {
    spot(null);
    el.remove();
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("pointerdown", onOutside, true);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
  const onOutside = (e: Event) => { if (!el.contains(e.target as Node)) close(); };
  el.addEventListener("pointerover", point);
  el.addEventListener("focusin", point);
  el.addEventListener("pointerleave", () => spot(null));
  doc.addEventListener("keydown", onKey, true);
  doc.addEventListener("pointerdown", onOutside, true);
  Object.assign(el, { qsClose: close });
  doc.body.append(el);
  el.querySelector<HTMLElement>(".qs-key-row")?.focus();
}

/** Styles for the popover itself: Logseq's surface colors and the system's tokens. */
export const KEY_CSS = `
#qs-key {
  position: fixed; right: 16px; bottom: 16px; z-index: 999; width: min(360px, calc(100vw - 32px));
  display: grid; gap: 1px; padding: 8px;
  background: var(--ls-primary-background-color, hsl(var(--popover, 0 0% 100%)));
  color: var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground, 0 0% 10%))));
  border: 1px solid var(--ls-border-color, hsl(var(--border, 0 0% 90%))); border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12); font-size: 13px;
}
#qs-key .qs-key-head {
  font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--qs-prop-key); padding: 2px 8px 6px;
}
#qs-key .qs-key-row {
  display: grid; grid-template-columns: 64px 1fr; gap: 8px; align-items: baseline; text-align: left;
  padding: 4px 8px; border: 0; border-radius: 5px; background: transparent; color: inherit; font: inherit; cursor: default;
}
#qs-key .qs-key-row:is(:hover, :focus-visible) { background: var(--qs-select-bg); outline: none; }
#qs-key .qs-key-row > span:last-child { color: var(--qs-prop-key); }
#qs-key .qs-key-kind { color: var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground, 0 0% 10%)))); }
#qs-key .qs-key-sample .block-content { display: inline; }
#qs-key .qs-key-box {
  display: inline-block; width: 11px; height: 11px; border: 1.5px solid var(--qs-todo); border-radius: 3px;
}
#qs-key .qs-key-done { opacity: var(--qs-done-opacity); }`;
