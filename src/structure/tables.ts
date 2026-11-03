// 08 · Fill later, in one sweep: tags never stop you for their properties; the page
// keeps a quiet count of the fields its tagged blocks still lack, and the sweep opens
// them as one table. 10 · Prose and table: a block's children, with their properties
// as columns, one shortcut away and back.

import { allProps, labelsOf, pageNames, propByIdent, propByTitle, q, setValue, showValues, valuesOf, type Prop } from "./graph";
import { notValue, parseTyped } from "./text";
import { openPanel, type Row } from "./ui";

const ground = (xs: number[]) => `[${xs.join(" ")}]`;

/** [block, property] for every tag property a block on the page lacks. */
export async function gaps(page: number) {
  const rows = await q<[number, string]>(`
    [:find ?b ?a :where [?b :block/page ${page}] [?b :block/tags ?t] [?t :logseq.property.class/properties ?p]
                        [?p :db/ident ?a] (not [?b ?a _])]`);
  return rows.map(([b, a]) => [b, propByIdent(String(a))] as const).filter((r): r is readonly [number, Prop] => !!r[1]);
}

async function save(row: Row, prop: Prop, text: string, replace: boolean) {
  const typed = parseTyped(text, prop.type, pageNames(), new Date());
  if (!typed) return notValue(text, prop);
  if (replace && prop.many) await logseq.Editor.removeBlockProperty(row.id, prop.ident);
  await setValue(row.id, prop, typed);
  return null;
}

export async function openSweep(doc: Document, page: number) {
  const missing = await gaps(page);
  if (!missing.length) return void logseq.UI.showMsg("Quiet & Still: nothing to fill on this page.");
  const blocks = [...new Set(missing.map(([b]) => b))];
  const props = [...new Map(missing.map(([, p]) => [p.ident, p])).values()];
  const titles = await labelsOf(blocks);
  const have = await valuesOf(blocks, props.map((p) => p.ident));
  const show = await showValues(have.map(([, , v]) => v));
  const rows: Row[] = blocks.map((id) => ({ id, title: titles.get(id) || "(untitled)", cells: {} }));
  for (const [b, a, v] of have) {
    const row = rows.find((r) => r.id === b)!;
    row.cells[a] = row.cells[a] ? `${row.cells[a]}, ${show(v)}` : show(v);
  }
  openPanel(doc, {
    id: "qs-sweep", title: `Sweep · ${missing.length} field${missing.length === 1 ? "" : "s"} to fill`, onlyEmpty: true,
    note: "Enter saves and moves down the column.",
    columns: props.map((p) => ({ key: p.ident, title: p.title, hint: p.type === "default" ? "" : p.type })),
    rows,
    save: (row, col, text) => save(row, propByIdent(col.key)!, text, false),
  });
}

/** Ambient values over this block (from it and its parents), by property ident. */
async function ambientOver(block: number, ambient: string[]) {
  const props = ambient.map((n) => propByTitle(n)).filter((p): p is Prop => !!p);
  if (!props.length) return new Map<string, string>();
  const chain: number[] = [block];
  for (let i = 0; i < 12; i++) {
    const [row] = await q<[number]>(`[:find ?p :where [(ground ${chain.at(-1)}) ?b] [?b :block/parent ?p]]`);
    if (!row) break;
    chain.push(row[0]);
  }
  const have = await valuesOf(chain, props.map((p) => p.ident));
  const show = await showValues(have.map(([, , v]) => v));
  const out = new Map<string, string>();
  for (const id of chain) for (const [b, a, v] of have) if (b === id && !out.has(a)) out.set(a, show(v)); // nearest wins
  return out;
}

export async function toggleTable(doc: Document, ambient: string[]) {
  const open = doc.getElementById("qs-table");
  if (open) return void open.dispatchEvent(new Event("qs-close"));
  const current = (await logseq.Editor.getCurrentBlock()) ?? (await logseq.Editor.getSelectedBlocks())?.[0];
  if (!current) return void logseq.UI.showMsg("Quiet & Still: put the cursor in a block to see its children as a table.");
  const kids = (await q<[number, string, string]>(`
    [:find ?c ?o ?t :where [?c :block/parent ${current.id}] [?c :block/order ?o] [(get-else $ ?c :block/title "") ?t]]`))
    .sort((a, b) => (a[1] < b[1] ? -1 : 1));
  if (!kids.length) return void logseq.UI.showMsg("Quiet & Still: this block has no children to show as a table.");
  const ids = kids.map(([c]) => c);
  const userIdents = allProps().map((p) => p.ident);
  const have = await valuesOf(ids, userIdents);
  const tagProps = await q<[string]>(`
    [:find ?a :where [(ground ${ground(ids)}) [?c ...]] [?c :block/tags ?t] [?t :logseq.property.class/properties ?p] [?p :db/ident ?a]]`);
  const inherited = await ambientOver(current.id, ambient);
  const idents = [...new Set([...have.map(([, a]) => a), ...tagProps.map(([a]) => String(a).replace(/^:/, "")), ...inherited.keys()])];
  const props = idents.map((i) => propByIdent(i)).filter((p): p is Prop => !!p);
  if (!props.length) return void logseq.UI.showMsg("Quiet & Still: these blocks have no properties yet. Tag them, or use shorthand, and the columns appear.");
  const show = await showValues(have.map(([, , v]) => v));
  const rows: Row[] = kids.map(([id, , t]) => ({ id, title: t || "(untitled)", cells: {} }));
  for (const [b, a, v] of have) {
    const row = rows.find((r) => r.id === b)!;
    row.cells[a] = row.cells[a] ? `${row.cells[a]}, ${show(v)}` : show(v);
  }
  const anchor = doc.querySelector(`.ls-block[blockid="${current.uuid}"]`);
  openPanel(doc, {
    id: "qs-table", title: `${current.title || "Block"} · as a table`, anchor,
    note: "Same blocks, same values. Edit a cell and press Enter. The shortcut flips back.",
    columns: props.map((p) => ({ key: p.ident, title: p.title, hint: inherited.has(p.ident) ? `↳ ${inherited.get(p.ident)}` : "" })),
    rows,
    save: (row, col, text) => save(row, propByIdent(col.key)!, text, true),
  });
}
