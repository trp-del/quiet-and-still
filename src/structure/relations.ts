// 02 · Relations, not a reference pile. Above a page's linked references: who points
// here through which property (paired ones marked ⇄), what carries it as a tag, and a
// folded count of plain mentions. Notes that inherit an ambient property (07) are
// counted under the property their parent holds.

import { propByIdent, q, readable } from "./graph";
import { escapeHtml } from "./text";

const KEY = "qs-relations";
const ground = (xs: number[]) => `[${xs.join(" ")}]`;
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

interface Source { id: number; uuid: string; label: string; page: string; isPage: boolean; journal: boolean; tag: string }

async function sources(ids: number[]) {
  const map = new Map<number, Source>();
  if (!ids.length) return map;
  const pages = await q<[number, string, number, string]>(`
    [:find ?b ?t ?j ?u :where [(ground ${ground(ids)}) [?b ...]] [?b :block/name] [?b :block/title ?t] [?b :block/uuid ?u]
                              [(get-else $ ?b :block/journal-day 0) ?j]]`);
  for (const [id, t, j, u] of pages) map.set(id, { id, uuid: String(u), label: t, page: t, isPage: true, journal: j > 0, tag: "" });
  const blocks = (await q<[number, string, string, number, string]>(`
    [:find ?b ?t ?pt ?j ?u :where [(ground ${ground(ids)}) [?b ...]] [?b :block/page ?pg] [(get-else $ ?b :block/title "") ?t]
                                  [?b :block/uuid ?u] [?pg :block/title ?pt] [(get-else $ ?pg :block/journal-day 0) ?j]]`))
    .filter(([id]) => !map.has(id));
  const text = await readable(blocks.map(([, t]) => t));
  // Blocks fold under their first own tag, so fifty consultations read as one line.
  const tags = new Map((await q<[number, string, string]>(`
    [:find ?b ?tt ?tid :where [(ground ${ground(blocks.map(([b]) => b))}) [?b ...]] [?b :block/tags ?t] [?t :block/title ?tt] [?t :db/ident ?tid]]`))
    .filter(([, , tid]) => !String(tid).replace(/^:/, "").startsWith("logseq.class/"))
    .map(([b, tt]) => [b, tt]));
  blocks.forEach(([id, , pt, j, u], i) =>
    map.set(id, { id, uuid: String(u), label: short(text[i]) || pt, page: pt, isPage: false, journal: j > 0, tag: tags.get(id) ?? "" }));
  return map;
}

/** Descendants of these blocks, a level at a time (outlines are rarely deeper than eight). */
async function descendants(parents: number[]) {
  const all = new Set<number>();
  let level = parents;
  for (let i = 0; i < 8 && level.length; i++) {
    const rows = await q<[number]>(`[:find ?c :where [(ground ${ground(level)}) [?p ...]] [?c :block/parent ?p]]`);
    level = rows.map(([c]) => c).filter((c) => !all.has(c));
    level.forEach((c) => all.add(c));
  }
  return all;
}

const link = (s: Source) => s.isPage
  ? `<a class="page-ref" data-on-click="qsOpen" data-page="${escapeHtml(s.page)}">${escapeHtml(s.label)}</a>`
  : `<a data-on-click="qsOpenBlock" data-uuid="${escapeHtml(s.uuid)}" title="${escapeHtml(s.page)}">${escapeHtml(s.label)}</a>`;

/** Pages as links; blocks folded by tag into "#Consultation · 24", which opens to the list. */
function items(list: Source[]) {
  const pages = list.filter((s) => s.isPage);
  const byTag = new Map<string, Source[]>();
  for (const s of list.filter((x) => !x.isPage)) byTag.set(s.tag, [...(byTag.get(s.tag) ?? []), s]);
  const folds = [...byTag].map(([tag, bs]) => `<details class="qs-fold"><summary>${tag ? `#${escapeHtml(tag)}` : "blocks"} · ${bs.length}</summary>
    <div class="qs-fold-list">${bs.map(link).join("")}</div></details>`);
  return [...pages.map(link), ...folds].join(" · ");
}

export async function renderRelations(page: number, isPaired: (ident: string) => boolean, ambient: string[]) {
  const viaProps = await q<[number, string]>(`
    [:find ?b ?a :where [?b :block/refs ${page}] [?b ?a ${page}] [?prop :db/ident ?a] [?prop :logseq.property/type :node]]`);
  const tagged = await q<[number]>(`[:find ?b :where [?b :block/tags ${page}]]`);
  const refs = await q<[number]>(`[:find ?b :where [?b :block/refs ${page}]]`);

  const byProp = new Map<string, number[]>();
  for (const [b, a] of viaProps) {
    const ident = String(a).replace(/^:/, "");
    if (b === page || !propByIdent(ident)) continue;
    byProp.set(ident, [...(byProp.get(ident) ?? []), b]);
  }
  const counted = new Set([...viaProps.map(([b]) => b), ...tagged.map(([b]) => b)]);
  const mentions = refs.map(([b]) => b).filter((b) => !counted.has(b) && b !== page);
  const info = await sources([...counted, ...mentions]);

  const groups: string[] = [];
  for (const [ident, ids] of byProp) {
    const p = propByIdent(ident)!;
    const list = ids.map((id) => info.get(id)).filter((s): s is Source => !!s);
    let extra = "";
    if (ambient.includes(p.title.toLowerCase())) {
      const n = (await descendants(ids)).size;
      if (n) extra = ` <span class="qs-quiet">+ ${n} note${n === 1 ? "" : "s"} under ${ids.length === 1 ? "it" : "them"}</span>`;
    }
    groups.push(`<div class="qs-rgroup"><span class="qs-rh">${escapeHtml(p.title)}${isPaired(ident) ? " ⇄" : ""}</span>
      <span>${items(list)}${extra}</span></div>`);
  }
  if (tagged.length) {
    const list = tagged.map(([b]) => info.get(b)).filter((s): s is Source => !!s);
    groups.push(`<div class="qs-rgroup"><span class="qs-rh">Tagged with this</span><span>${items(list)}</span></div>`);
  }
  if (mentions.length) {
    const j = mentions.filter((b) => info.get(b)?.journal).length, other = mentions.length - j;
    const parts = [j && `${j} journal block${j === 1 ? "" : "s"}`, other && `${other} on other pages`].filter(Boolean).join(" · ");
    groups.push(`<div class="qs-rgroup qs-quiet"><span class="qs-rh">Mentioned in prose</span><span>${parts}, in the list below</span></div>`);
  }
  // Only worth showing once a property or tag gives the links a shape.
  const shaped = byProp.size || tagged.length;
  logseq.provideUI({
    key: KEY, path: "#main-content-container .references", reset: true,
    template: shaped ? `<div class="qs-relations">${groups.join("")}</div>` : "",
  });
}

export const clearRelations = () => logseq.provideUI({ key: KEY, path: "#main-content-container .references", reset: true, template: "" });
