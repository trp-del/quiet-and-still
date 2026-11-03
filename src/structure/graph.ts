// Reads and writes for the structure features, over Logseq DB's plugin API.
// Reads are Datalog queries built here, so the shape of every result is known.
// Writes go through upsertBlockProperty with the property's full ident
// (user.property/…), which Logseq accepts for existing user properties.

import { journalDay } from "./text";

export interface Prop { id: number; ident: string; title: string; type: string; many: boolean }

/** Keywords come back as strings, with or without the leading colon. */
const kw = (v: unknown) => String(v ?? "").replace(/^:/, "");
const str = (s: string) => JSON.stringify(s);
const ground = (xs: (number | string)[]) => `[${xs.join(" ")}]`;
const idents = (xs: string[]) => ground(xs.map((x) => `:${x}`));

export async function q<T = unknown[]>(query: string): Promise<T[]> {
  // Logseq rejects get-else ("unknown source vars: [$]") unless the source is named.
  const named = /:in\s/.test(query) ? query : query.replace(":where", ":in $ :where");
  try {
    return ((await logseq.DB.datascriptQuery(named)) ?? []) as T[];
  } catch (e) {
    console.warn("[quiet-and-still] query failed", e, query);
    return [];
  }
}

// ── Caches: properties and page names, refreshed after the graph changes ──────

let props: Prop[] = [];
let names = new Map<string, string>();   // lower-case title → title
let pageIds = new Map<string, number>(); // lower-case title → entity id

export async function refreshCaches() {
  const rows = await q<[number, string, string, string, string]>(`
    [:find ?p ?ident ?title ?type ?card
     :where [?p :logseq.property/type ?type] [?p :db/ident ?ident] [?p :block/title ?title]
            [(get-else $ ?p :db/cardinality :db.cardinality/one) ?card]]`);
  props = rows
    .map(([id, ident, title, type, card]) => ({ id, ident: kw(ident), title, type: kw(type), many: kw(card).endsWith("many") }))
    .filter((p) => p.ident.startsWith("user.property/"));
  const pages = await q<[number, string]>(`
    [:find ?p ?t :where [?p :block/name] [?p :block/title ?t] (not [?p :logseq.property/type])]`);
  names = new Map(pages.map(([, t]) => [t.toLowerCase(), t]));
  pageIds = new Map(pages.map(([id, t]) => [t.toLowerCase(), id]));
}

export const allProps = () => props;
export const propByTitle = (title: string) => props.find((p) => p.title.toLowerCase() === title.toLowerCase());
export const propByIdent = (ident: string) => props.find((p) => p.ident === kw(ident));
export const pageNames = () => names;
export const pageId = (title: string) => pageIds.get(title.toLowerCase());

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function idOf(uuid: string): Promise<number | null> {
  const [row] = await q<[number]>(`[:find ?b :where [?b :block/uuid #uuid ${str(uuid)}]]`);
  return row?.[0] ?? null;
}

/** [block, ident, value] for these blocks and properties. Ref values are entity ids. */
export async function valuesOf(blocks: number[], ids: string[]) {
  if (!blocks.length || !ids.length) return [];
  const rows = await q<[number, string, unknown]>(`
    [:find ?b ?a ?v :where [(ground ${ground(blocks)}) [?b ...]] [(ground ${idents(ids)}) [?a ...]] [?b ?a ?v]]`);
  return rows.map(([b, a, v]) => [b, kw(a), v] as const);
}

const UUID_REF = /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/g;

/** Block titles store links as [[uuid]]; this puts the page names back. */
export async function readable(titles: string[]) {
  const uuids = [...new Set(titles.flatMap((t) => [...t.matchAll(UUID_REF)].map((m) => m[1])))];
  if (!uuids.length) return titles;
  const rows = await q<[string, string]>(`
    [:find ?u ?t :where [(ground [${uuids.map((u) => `#uuid ${str(u)}`).join(" ")}]) [?u ...]] [?e :block/uuid ?u] [?e :block/title ?t]]`);
  const names = new Map(rows.map(([u, t]) => [String(u), t]));
  return titles.map((t) => t.replace(UUID_REF, (all, u) => names.get(u) ?? all));
}

/** A readable label for each entity: its title, or a property value's own value. */
export async function labelsOf(ids: number[]) {
  const map = new Map<number, string>();
  if (!ids.length) return map;
  const rows = await q<[number, unknown, unknown]>(`
    [:find ?v ?t ?pv :where [(ground ${ground([...new Set(ids)])}) [?v ...]]
                            [(get-else $ ?v :block/title "") ?t] [(get-else $ ?v :logseq.property/value "") ?pv]]`);
  const text = await readable(rows.map(([, t, pv]) => String(t || pv || "")));
  rows.forEach(([v], i) => map.set(v, text[i]));
  return map;
}

/** Turns a raw value into text: ref ids become labels, the rest prints as is. */
export async function showValues(raw: unknown[]) {
  const labels = await labelsOf(raw.filter((v): v is number => typeof v === "number"));
  return (v: unknown) => (typeof v === "number" ? labels.get(v) ?? "" : typeof v === "boolean" ? (v ? "yes" : "no") : String(v ?? ""));
}

/** The tags a block carries, with the properties each tag asks for. Built-in tags are left out. */
export async function tagsOf(block: number) {
  const bare = await q<[number, string, string, string]>(`
    [:find ?t ?tt ?tid ?u :where [(ground ${block}) ?b] [?b :block/tags ?t] [?t :block/title ?tt] [?t :db/ident ?tid] [?t :block/uuid ?u]]`);
  const rows = await q<[number, string, string]>(`
    [:find ?t ?p ?ident :where [(ground ${block}) ?b] [?b :block/tags ?t]
                               [?t :logseq.property.class/properties ?p] [?p :db/ident ?ident]]`);
  const tags = new Map<number, { id: number; uuid: string; title: string; props: Prop[] }>();
  for (const [id, title, tid, uuid] of bare) if (!kw(tid).startsWith("logseq.class/")) tags.set(id, { id, uuid: String(uuid), title, props: [] });
  for (const [id, , ident] of rows) {
    const p = ident && propByIdent(ident);
    if (p) tags.get(id)?.props.push(p);
  }
  return [...tags.values()];
}

// ── Writes ─────────────────────────────────────────────────────────────────────

export type Typed =
  | { kind: "date"; date: Date } | { kind: "node"; title: string } | { kind: "number"; n: number }
  | { kind: "checkbox"; b: boolean } | { kind: "text"; s: string };

async function journalId(date: Date) {
  const [row] = await q<[number]>(`[:find ?p :where [?p :block/journal-day ${journalDay(date)}]]`);
  if (row) return row[0];
  return (await logseq.Editor.createJournalPage(date))?.id ?? null;
}

/** Sets a typed value on a block (uuid or entity id). Adds to many-valued properties. */
export async function setValue(block: string | number, prop: Prop, value: Typed) {
  let v: unknown;
  if (value.kind === "date") v = await journalId(value.date);
  else if (value.kind === "node") v = pageId(value.title);
  else if (value.kind === "number") v = value.n;
  else if (value.kind === "checkbox") v = value.b;
  else v = value.s;
  if (v == null) throw new Error(`No page named ${value.kind === "node" ? value.title : "that"}`);
  await logseq.Editor.upsertBlockProperty(block, prop.ident, v);
}

/** Sets exactly these ref values (none removes the property). */
export async function setRefs(block: number, prop: Prop, ids: number[]) {
  if (!ids.length) return logseq.Editor.removeBlockProperty(block, prop.ident);
  return logseq.Editor.upsertBlockProperty(block, prop.ident, prop.many ? ids : ids[0], { reset: true });
}
