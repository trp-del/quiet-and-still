// The structure features' pure logic: name matching, settings text, dates and
// shorthand. The parts that talk to Logseq are thin and need a live graph.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const code = (
  await esbuild.build({ entryPoints: ["src/structure/text.ts"], bundle: true, format: "esm", write: false })
).outputFiles[0].text;
const T = await import(`data:text/javascript,${encodeURIComponent(code)}`);

const TODAY = new Date(2026, 10, 2); // Monday, 2 November 2026
const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");

test("near matches: punctuation and case, a typo, initials; nothing for an existing name", () => {
  const titles = ["Dr. Mei Chen", "Dr. Helen Brooks", "Melatonin", "Fatigue"];
  assert.deepEqual(T.nearMatches("Dr Mei chen", titles), ["Dr. Mei Chen"]);
  assert.deepEqual(T.nearMatches("Melatonim", titles), ["Melatonin"]);
  assert.deepEqual(T.nearMatches("Dr. M. Chen", titles), ["Dr. Mei Chen"]);
  assert.deepEqual(T.nearMatches("dr. mei chen", titles), []); // same page: Logseq names ignore case
  assert.deepEqual(T.nearMatches("Insomnia", titles), []);
  assert.deepEqual(T.nearMatches("Fa", titles), []);
});

test("pairs, lists and aliases read from settings text", () => {
  assert.deepEqual(T.parsePairs("Treated by <-> Treats; Part of ↔ Has part;Related"), [
    { a: "Treated by", b: "Treats" }, { a: "Part of", b: "Has part" }, { a: "Related", b: "Related" },
  ]);
  assert.deepEqual(T.parseList(" Project, Area ;"), ["project", "area"]);
  assert.deepEqual([...T.parseAliases("for = Project; by=Due")], [["for", "project"], ["by", "due"]]);
});

test("date phrases resolve relative to today", () => {
  const d = (s) => { const h = T.parseDatePhrase(s, TODAY); return h && ymd(h.date); };
  assert.equal(d("friday and more"), "2026-11-6");
  assert.equal(d("Monday"), "2026-11-2"); // today counts
  assert.equal(d("next monday"), "2026-11-9");
  assert.equal(d("tomorrow"), "2026-11-3");
  assert.equal(d("in 2 weeks"), "2026-11-16");
  assert.equal(d("Nov 6th"), "2026-11-6");
  assert.equal(d("6 November 2027"), "2027-11-6");
  assert.equal(d("Jan 5"), "2027-1-5"); // past months roll to next year
  assert.equal(d("2026-12-01"), "2026-12-1");
  assert.equal(d("fridays"), null);
  assert.equal(d("to the iron"), null);
  assert.equal(T.journalDay(new Date(2026, 10, 6)), 20261106);
  assert.equal(T.showDate(new Date(2026, 10, 6)), "Fri, Nov 6");
});

const PROPS = [
  { name: "due", title: "Due", type: "date" },
  { name: "project", title: "Project", type: "node" },
  { name: "for", title: "Project", type: "node" },
  { name: "severity", title: "Severity", type: "number" },
];
const PAGES = new Map([["fatigue", "Fatigue"], ["dr. helen brooks", "Dr. Helen Brooks"], ["sleep", "Sleep"]]);
const find = (text) => T.findShorthand(text, PROPS, (s) => T.pageAtStart(s, PAGES), TODAY)
  .map((f) => [f.prop.title, f.show, text.slice(f.start, f.end)]);

test("shorthand needs no colon, and keeps to values that resolve", () => {
  assert.deepEqual(find("Ask Dr. Brooks about ferritin, due Friday, for Fatigue"), [
    ["Due", "Fri, Nov 6", "due Friday"], ["Project", "Fatigue", "for Fatigue"],
  ]);
  assert.deepEqual(find("headache, severity 3"), [["Severity", "3", "severity 3"]]);
  assert.deepEqual(find("tired due to the iron, for a while"), []); // "to the iron" isn't a date; "a while" isn't a page
  assert.deepEqual(find("Referred for [[Dr. Helen Brooks]]"), [["Project", "Dr. Helen Brooks", "for [[Dr. Helen Brooks]]"]]);
  assert.deepEqual(find("see [[Due Process]] notes"), []); // inside a page link
  assert.deepEqual(find("project Fatigue, then for Sleep"), [["Project", "Fatigue", "project Fatigue"]]); // one per property
});

test("typed cell values parse by property type", () => {
  assert.deepEqual(T.parseTyped("65", "number", PAGES, TODAY), { kind: "number", n: 65 });
  assert.equal(T.parseTyped("65 mg", "number", PAGES, TODAY), null);
  assert.deepEqual(T.parseTyped("fatigue", "node", PAGES, TODAY), { kind: "node", title: "Fatigue" });
  assert.equal(T.parseTyped("Nobody", "node", PAGES, TODAY), null);
  assert.equal(ymd(T.parseTyped("fri", "date", PAGES, TODAY).date), "2026-11-6");
  assert.equal(T.parseTyped("fri at 3", "date", PAGES, TODAY), null);
  assert.deepEqual(T.parseTyped("yes", "checkbox", PAGES, TODAY), { kind: "checkbox", b: true });
  assert.deepEqual(T.parseTyped(" Sleep medicine ", "default", PAGES, TODAY), { kind: "text", s: "Sleep medicine" });
});
