// 01 · Paired relations. Declared in settings ("Treated by <-> Treats"). When a block
// gains or loses a value for one end, the other end is written or removed on the
// target, and a quiet confirmation offers undo. "Check pairs" finds pairs with an end
// missing (say, edited while the plugin was off) and offers to fix them all.
// Logseq's change event carries no datoms, doesn't fire for page properties, and a
// removed value doesn't touch :block/updated-at. So each nudge (an event, a route
// change, a slow tick) reads every value of the paired properties, one indexed scan,
// and diffs it against the last read.

import { labelsOf, propByTitle, q, setRefs, type Prop } from "./graph";
import { escapeHtml, parsePairs } from "./text";
import type { Offer } from "./index";

type Values = Map<string, Set<number>>; // ident → targets

export class Pairs {
  private inverse = new Map<string, Prop>();
  private cache = new Map<number, Values>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private warned = "";

  constructor(private offer: (o: Offer | null) => void) {}

  get idents() { return [...this.inverse.keys()]; }
  isPaired = (ident: string) => this.inverse.has(ident);

  /** Reads the pairs setting against the graph's node properties, then loads current values. */
  async configure(setting: string) {
    this.inverse.clear();
    this.cache.clear();
    const bad: string[] = [];
    for (const { a, b } of parsePairs(setting)) {
      const pa = propByTitle(a), pb = propByTitle(b);
      if (pa?.type !== "node" || pb?.type !== "node") { bad.push(`${a} ↔ ${b}`); continue; }
      this.inverse.set(pa.ident, pb);
      this.inverse.set(pb.ident, pa);
    }
    const msg = bad.join(", ");
    if (msg && msg !== this.warned) {
      logseq.UI.showMsg(`Quiet & Still: ${msg} needs two existing node properties. Create them, then the pair starts working.`, "warning");
    }
    this.warned = msg;
    if (!this.inverse.size) return;
    for (const [b, vals] of await this.read()) this.cache.set(b, vals);
  }

  /** Every current value of the paired properties, by entity. */
  private async read() {
    const now = new Map<number, Values>();
    const rows = await q<[number, string, number]>(`
      [:find ?b ?a ?v :where [(ground [${this.idents.map((i) => `:${i}`).join(" ")}]) [?a ...]] [?b ?a ?v]]`);
    for (const [b, a, v] of rows) {
      if (typeof v !== "number") continue;
      if (!now.has(b)) now.set(b, new Map(this.idents.map((i) => [i, new Set<number>()])));
      now.get(b)!.get(String(a).replace(/^:/, ""))?.add(v);
    }
    return now;
  }

  private values(b: number): Values {
    let m = this.cache.get(b);
    if (!m) this.cache.set(b, (m = new Map(this.idents.map((i) => [i, new Set<number>()]))));
    return m;
  }

  /** Something may have changed. Batched, since one edit arrives as several nudges. */
  nudge() {
    if (!this.inverse.size) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 250);
  }

  private running = false;
  private written = new Set<string>(); // "entity ident" pairs this sync wrote, so its stale read skips them

  private async sync() {
    if (this.running) return this.nudge();
    this.running = true;
    try { await this.diff(); } finally { this.running = false; this.written.clear(); }
  }

  private async diff() {
    const now = await this.read();
    const ids = [...new Set([...this.cache.keys(), ...now.keys()])];
    const added: [number, Prop, number][] = [];
    for (const id of ids) {
      const before = this.values(id);
      for (const ident of this.idents) {
        if (this.written.has(`${id} ${ident}`)) continue;
        const was = before.get(ident)!, is = now.get(id)?.get(ident) ?? new Set<number>();
        const inv = this.inverse.get(ident)!;
        for (const t of is) if (!was.has(t)) { added.push([id, inv, t]); await this.mirror(t, inv, id, true); }
        for (const t of was) if (!is.has(t)) await this.mirror(t, inv, id, false);
        before.set(ident, new Set(is));
      }
    }
    if (added.length) this.confirm(added);
  }

  /** Makes sure `target` has (or no longer has) `source` under `prop`. */
  private async mirror(target: number, prop: Prop, source: number, on: boolean) {
    const cur = this.values(target).get(prop.ident)!;
    if (cur.has(source) === on) return;
    const next = on ? (prop.many ? [...cur, source] : [source]) : [...cur].filter((x) => x !== source);
    this.values(target).set(prop.ident, new Set(next)); // first, so our own write reads as no change
    this.written.add(`${target} ${prop.ident}`);
    await setRefs(target, prop, next);
  }

  private async confirm(added: [number, Prop, number][]) {
    const labels = await labelsOf(added.map(([, , t]) => t));
    const [, prop, t] = added[0];
    const more = added.length > 1 ? ` and ${added.length - 1} more` : "";
    this.offer({
      source: "pairs", priority: 5, ttl: 10000, verb: "to undo",
      html: `⇄ Added to <b>${escapeHtml(labels.get(t) ?? "the page")}</b> as ${escapeHtml(prop.title)}${more}`,
      accept: async () => {
        for (const [source, inv, target] of added) {
          await this.mirror(target, inv, source, false);
          await this.mirror(source, this.inverse.get(inv.ident)!, target, false);
        }
        logseq.UI.showMsg("Quiet & Still: undone, both ends");
      },
    });
  }

  /** Pairs with one end missing, as [has it, missing on, the property it's missing]. */
  async missing() {
    const out: [number, number, Prop][] = [];
    for (const [ident, inv] of this.inverse) {
      const rows = await q<[number, number]>(`[:find ?b ?t :where [?b :${ident} ?t] (not [?t :${inv.ident} ?b])]`);
      for (const [b, t] of rows) out.push([b, t, inv]);
    }
    return out;
  }

  async check() {
    if (!this.inverse.size) return void logseq.UI.showMsg("Quiet & Still: no pairs set. Add them in the plugin's settings.");
    const gaps = await this.missing();
    if (!gaps.length) return void logseq.UI.showMsg("Quiet & Still: every pair has both ends.");
    const labels = await labelsOf(gaps.map(([, t]) => t));
    const names = [...new Set(gaps.map(([, t]) => labels.get(t) ?? ""))].filter(Boolean).slice(0, 3).map(escapeHtml).join(", ");
    this.offer({
      source: "pairs", priority: 5, ttl: 15000, verb: "to fix them all",
      html: `⇄ ${gaps.length} pair${gaps.length === 1 ? " is" : "s are"} missing an end (${names}${gaps.length > 3 ? ", …" : ""})`,
      accept: async () => {
        for (const [b, t, inv] of gaps) await this.mirror(t, inv, b, true);
        logseq.UI.showMsg(`Quiet & Still: filled ${gaps.length} missing end${gaps.length === 1 ? "" : "s"}`);
      },
    });
  }
}
