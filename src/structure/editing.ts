// Offers made while you write. Each reads the block being edited and, when it has
// something, puts one quiet line under it; nothing is written until the accept key.
//   03 · one name, one node   — "[[Dr Mei chen" when "Dr. Mei Chen" exists
//   04 · shorthand that stays — "due Friday", "for Fatigue": the words stay, properties fill
//   05 · the last block's shape — an empty block after a tagged sibling
//   06 · create without leaving — a new page linked from a block that carries a tag

import {
  allProps, idOf, labelsOf, pageId, pageNames, q, setValue, tagsOf, valuesOf, type Prop,
} from "./graph";
import {
  escapeHtml, findShorthand, notValue, journalDay, matchReason, nearMatches, pageAtStart, parseAliases, parseList, parseTyped,
  type Shorthand,
} from "./text";
import { openPanel } from "./ui";
import type { Offer, StructureSettings } from "./index";

export interface Editing { textarea: HTMLTextAreaElement; uuid: string; anchor: Element }

/** The block being edited, if the focus is in Logseq's editor. */
export function editing(doc: Document): Editing | null {
  const ta = doc.activeElement;
  if (!ta || ta.tagName !== "TEXTAREA") return null;
  const blk = ta.closest(".ls-block");
  const uuid = blk?.getAttribute("blockid");
  if (!blk || !uuid) return null;
  return { textarea: ta as HTMLTextAreaElement, uuid, anchor: blk.querySelector(":scope > .block-main-container") ?? blk };
}

/** Sets the textarea the way typing would, so Logseq's editor state follows. */
function setText(ta: HTMLTextAreaElement, value: string, caret: number) {
  const proto = Object.getPrototypeOf(ta) as HTMLTextAreaElement;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(ta, value);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.setSelectionRange(caret, caret);
}

// ── 03 · one name, one node ───────────────────────────────────────────────────

export function nameOffer(e: Editing): Offer | null {
  const ta = e.textarea, caret = ta.selectionStart, before = ta.value.slice(0, caret);
  const open = before.lastIndexOf("[[");
  if (open < 0 || before.slice(open).includes("]]")) return null;
  const typed = before.slice(open + 2);
  const [title] = nearMatches(typed, [...pageNames().values()]);
  if (!title) return null;
  return {
    source: "names", priority: 3, anchor: e.anchor, verb: "to use it",
    html: `<b>${escapeHtml(title)}</b> already exists · ${matchReason(typed, title)}`,
    accept: async () => {
      const value = ta.value.slice(0, open + 2) + title + ta.value.slice(caret);
      setText(ta, value, open + 2 + title.length);
    },
  };
}

// ── 04 · shorthand that stays ─────────────────────────────────────────────────

function shorthandProps(aliases: string) {
  const typed = allProps().filter((p) => ["date", "datetime", "node", "number"].includes(p.type));
  const list = typed.map((p) => ({ name: p.title.toLowerCase(), title: p.title, type: p.type }));
  for (const [alias, name] of parseAliases(aliases)) {
    const p = typed.find((x) => x.title.toLowerCase() === name);
    if (p) list.push({ name: alias, title: p.title, type: p.type });
  }
  return list;
}

/** Drops phrases whose value the block already has, so an accepted phrase doesn't come back. */
async function unset(block: number, found: Shorthand[]) {
  const props = found.map((f) => allProps().find((p) => p.title === f.prop.title)!);
  const have = await valuesOf([block], props.map((p) => p.ident));
  const ids = have.map(([, , v]) => v).filter((v): v is number => typeof v === "number");
  const days = new Map((await q<[number, number]>(`[:find ?v ?d :where [(ground [${ids.join(" ")}]) [?v ...]] [?v :block/journal-day ?d]]`)));
  const labels = await labelsOf(ids);
  return found.filter((f, i) => !have.some(([, a, v]) => {
    if (a !== props[i].ident) return false;
    if (f.value.kind === "node") return v === pageId(f.value.title);
    if (f.value.kind === "date") return typeof v === "number" && days.get(v) === journalDay(f.value.date);
    return (typeof v === "number" ? labels.get(v) : String(v)) === String(f.value.n);
  }));
}

export async function shorthandOffer(e: Editing, s: StructureSettings): Promise<Offer | null> {
  const found = findShorthand(e.textarea.value, shorthandProps(s.st_aliases ?? ""), (rest) => pageAtStart(rest, pageNames()), new Date());
  if (!found.length) return null;
  const block = await idOf(e.uuid);
  const todo = block ? await unset(block, found) : found;
  if (!todo.length) return null;
  return {
    source: "shorthand", priority: 2, anchor: e.anchor, verb: todo.length > 1 ? "to set them" : "to set it",
    html: todo.map((f) => `<b>${escapeHtml(f.prop.title)}</b> ${escapeHtml(f.show)}`).join(" · "),
    accept: async () => {
      for (const f of todo) {
        const prop = allProps().find((p) => p.title === f.prop.title)!;
        const v = f.value;
        await setValue(e.uuid, prop, v.kind === "number" ? v : v.kind === "node" ? v : { kind: "date", date: v.date });
      }
    },
  };
}

// ── 05 · the last block's shape ───────────────────────────────────────────────

export async function shapeOffer(e: Editing, s: StructureSettings): Promise<Offer | null> {
  if (e.textarea.value.trim()) return null;
  const prev = await logseq.Editor.getPreviousSiblingBlock(e.uuid);
  const block = await idOf(e.uuid);
  if (!prev || !block || (await tagsOf(block)).length) return null;
  const tags = await tagsOf(prev.id);
  if (!tags.length) return null;
  const repeat = parseList(s.st_repeat ?? "");
  const fields = [...new Set(tags.flatMap((t) => t.props.map((p) => p.title)))];
  return {
    source: "shape", priority: 1, anchor: e.anchor, verb: "to repeat it",
    html: `${tags.map((t) => `<b>#${escapeHtml(t.title)}</b>`).join(" ")}${fields.length ? ` · ${fields.map(escapeHtml).join(" · ")}` : ""}`,
    accept: async () => {
      for (const t of tags) await logseq.Editor.addBlockTag(e.uuid, t.uuid);
      const copy = allProps().filter((p) => repeat.includes(p.title.toLowerCase()) && ["node", "date", "checkbox"].includes(p.type));
      for (const [, ident, v] of await valuesOf([prev.id], copy.map((p) => p.ident))) {
        await logseq.Editor.upsertBlockProperty(e.uuid, ident, v);
      }
    },
  };
}

// ── 06 · create without leaving ───────────────────────────────────────────────

/** Pages made in the last few seconds, not journals or properties. */
export async function newPages(since: number) {
  return q<[number, string, string]>(`
    [:find ?p ?t ?u :where [?p :block/name] [?p :block/created-at ?c] [(> ?c ${since})] [?p :block/title ?t] [?p :block/uuid ?u]
                        (not [?p :block/journal-day]) (not [?p :logseq.property/type]) (not [?p :logseq.property/built-in?])]`);
}

/** Opens the fields line for a page: one row, the tag's properties as columns. */
export function fieldsPanel(doc: Document, page: { id: number; title: string }, props: Prop[], anchor: Element | null, back: () => void) {
  openPanel(doc, {
    id: "qs-fields", title: `New page · ${page.title}`, anchor,
    note: "Enter saves and moves on. Esc leaves the rest for the sweep.",
    columns: props.map((p) => ({ key: p.ident, title: p.title, hint: p.type === "default" ? "" : p.type })),
    rows: [{ id: page.id, title: page.title, cells: {} }],
    save: async (row, col, text) => {
      const prop = props.find((p) => p.ident === col.key)!;
      const typed = parseTyped(text, prop.type, pageNames(), new Date());
      if (!typed) return notValue(text, prop);
      await setValue(row.id, prop, typed);
      return null;
    },
    onClose: back,
  });
}

export async function newPageOffer(doc: Document, e: Editing, page: { id: number; uuid: string; title: string }): Promise<Offer | null> {
  const block = await idOf(e.uuid);
  if (!block) return null;
  const linked = await q<[number]>(`[:find ?b :where [(ground ${block}) ?b] [?b :block/refs ${page.id}]]`);
  if (!linked.length) return null;
  const tag = (await tagsOf(block)).find((t) => t.props.length);
  if (!tag || tag.id === page.id) return null;
  return {
    source: "newpage", priority: 4, anchor: e.anchor, ttl: 30000, verb: "to do it here",
    html: `Make <b>${escapeHtml(page.title)}</b> a <b>#${escapeHtml(tag.title)}</b> and fill ${tag.props.map((p) => escapeHtml(p.title)).join(", ")}`,
    accept: async () => {
      await logseq.Editor.addBlockTag(page.uuid, tag.uuid);
      fieldsPanel(doc, page, tag.props, e.anchor, () => logseq.Editor.editBlock(e.uuid, { pos: e.textarea.value.length }));
    },
  };
}
