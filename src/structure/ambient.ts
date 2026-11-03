// 07 · Ambient properties. A property named in the "ambient" setting, set on a block
// (or the page), carries to every block under it. Nothing is written to the children:
// the plugin works it out from the outline and marks the rendered blocks, so each note
// shows "↳ Fatigue" at quiet and its parent's thread line rises from whisper.

import { labelsOf, propByTitle, q } from "./graph";

interface Holder { uuid: string | null; ident: string; label: string }

let holders: Holder[] = [];

/** Loads which blocks on the page hold an ambient value. The page itself has uuid null. */
export async function loadAmbient(page: number, names: string[]) {
  const ids = names.map((n) => propByTitle(n)?.ident).filter((x): x is string => !!x);
  if (!ids.length) return void (holders = []);
  const kws = `[${ids.map((i) => `:${i}`).join(" ")}]`;
  const rows = await q<[string, string, number]>(`
    [:find ?uuid ?a ?v :where [?b :block/page ${page}] [(ground ${kws}) [?a ...]] [?b ?a ?v] [?b :block/uuid ?uuid]]`);
  const own = await q<[string, number]>(`[:find ?a ?v :where [(ground ${kws}) [?a ...]] [${page} ?a ?v]]`);
  const labels = await labelsOf([...rows.map(([, , v]) => v), ...own.map(([, v]) => v)].filter((v) => typeof v === "number"));
  const merge = (list: Holder[], h: Holder) => {
    const same = list.find((x) => x.uuid === h.uuid && x.ident === h.ident);
    if (same) same.label += ` · ${h.label}`; else list.push(h);
    return list;
  };
  holders = [
    ...own.map(([a, v]) => ({ uuid: null, ident: String(a), label: labels.get(v) ?? "" })),
    ...rows.map(([uuid, a, v]) => ({ uuid: String(uuid), ident: String(a), label: labels.get(v) ?? "" })),
  ].filter((h) => h.label).reduce(merge, [] as Holder[]);
}

export const clearAmbient = () => { holders = []; };

const depth = (el: Element) => { let n = 0; for (let p = el.parentElement; p; p = p.parentElement) if (p.classList.contains("ls-block")) n++; return n; };
/** The block's own title text, inline, so the mark follows it on the same line. */
const titleOf = (blk: Element) => blk.querySelector(":scope > .block-main-container .block-title-wrap");

/** Marks the rendered blocks. Cheap, so it reruns whenever Logseq re-renders. */
export function markAmbient(doc: Document) {
  const scope = doc.querySelector("#main-content-container");
  if (!scope) return;
  for (const el of scope.querySelectorAll("[data-qs-inherit]")) el.removeAttribute("data-qs-inherit");
  for (const el of scope.querySelectorAll("[data-qs-ambient]")) el.removeAttribute("data-qs-ambient");
  if (!holders.length) return;

  const onPage = [...scope.querySelectorAll<HTMLElement>(".ls-block")].filter((b) => !b.closest(".references, [id$='qs-relations']"));
  const byUuid = new Map(onPage.map((b) => [b.getAttribute("blockid"), b]));
  const inherited = new Map<Element, Map<string, string>>();
  const ownIdents = new Map<Element, Set<string>>();
  const sorted = holders
    .map((h) => ({ h, el: h.uuid ? byUuid.get(h.uuid) : null }))
    .filter(({ h, el }) => !h.uuid || el)
    .sort((a, b) => (a.el ? depth(a.el) + 1 : 0) - (b.el ? depth(b.el) + 1 : 0));
  for (const { h, el } of sorted) {
    if (el) {
      ownIdents.set(el, (ownIdents.get(el) ?? new Set()).add(h.ident));
      el.setAttribute("data-qs-ambient", "");
    }
    const under = el ? [...el.querySelectorAll(".ls-block")] : onPage;
    for (const c of under) {
      const m = inherited.get(c) ?? new Map<string, string>();
      m.set(h.ident, h.label); // deeper holders run later, so the nearest parent wins
      inherited.set(c, m);
    }
  }
  for (const [blk, m] of inherited) {
    for (const ident of ownIdents.get(blk) ?? []) m.delete(ident); // a block's own value wins
    const text = [...m.values()].join(" · ");
    if (text) titleOf(blk)?.setAttribute("data-qs-inherit", text);
  }
}

/** Re-marks after Logseq re-renders, like the repeat-mention marking in live.ts. */
export function watchAmbient(doc: Document): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver((records) => {
    if (records.every((r) => r.type === "attributes")) return;
    clearTimeout(timer);
    timer = setTimeout(() => markAmbient(doc), 200);
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => {
    clearTimeout(timer);
    observer.disconnect();
    holders = [];
    markAmbient(doc);
  };
}
