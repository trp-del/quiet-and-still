// The peek key against a stand-in document: hold to peek, double-tap to latch,
// and nothing for the key pressed with others (⌥-letters, Hyper).

import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const code = (
  await esbuild.build({ entryPoints: ["src/live.ts"], bundle: true, format: "esm", write: false })
).outputFiles[0].text;
const { watchPeek, togglePeek } = await import(`data:text/javascript,${encodeURIComponent(code)}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeDoc() {
  const classes = new Set();
  const doc = new EventTarget();
  doc.defaultView = new EventTarget();
  doc.documentElement = {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on = !classes.has(c)) => (on ? classes.add(c) : classes.delete(c), on),
    },
  };
  const key = (type, k, mods = {}) =>
    doc.dispatchEvent(Object.assign(new Event(type), { key: k, repeat: false, ctrlKey: false, altKey: k === "Alt", shiftKey: false, metaKey: false, ...mods }));
  const tap = async (k = "Alt") => { key("keydown", k); await sleep(20); key("keyup", k); };
  return { doc, key, tap, peeking: () => classes.has("qs-peek"), latched: () => classes.has("qs-peek-latched") };
}

test("holding the key peeks only while held", async () => {
  const d = fakeDoc();
  const stop = watchPeek(d.doc, () => "Alt");
  d.key("keydown", "Alt");
  await sleep(220);
  assert.ok(d.peeking());
  d.key("keyup", "Alt");
  assert.ok(!d.peeking());
  stop();
});

test("a double tap latches peek on, and another turns it off", async () => {
  const d = fakeDoc();
  const stop = watchPeek(d.doc, () => "Alt");
  await d.tap(); await sleep(60); await d.tap();
  assert.ok(d.peeking() && d.latched());
  d.key("keydown", "a"); // typing doesn't end it
  await d.tap(); // one tap doesn't either
  assert.ok(d.peeking());
  await sleep(450);
  await d.tap(); await sleep(60); await d.tap();
  assert.ok(!d.peeking() && !d.latched());
  await sleep(250); // past the hold threshold: the last press's timer must not bring it back
  assert.ok(!d.peeking());
  stop();
});

test("a hold while latched leaves it latched", async () => {
  const d = fakeDoc();
  const stop = watchPeek(d.doc, () => "Alt");
  togglePeek(d.doc); // the command
  d.key("keydown", "Alt"); await sleep(220); d.key("keyup", "Alt");
  assert.ok(d.peeking());
  stop();
  assert.ok(!d.peeking() && !d.latched());
});

test("taps that are slow, or with another key, don't latch", async () => {
  const d = fakeDoc();
  const stop = watchPeek(d.doc, () => "Alt");
  await d.tap(); await sleep(450); await d.tap();
  assert.ok(!d.peeking());
  await sleep(450);
  await d.tap(); d.key("keydown", "e", { altKey: true }); await d.tap(); // ⌥e between taps
  assert.ok(!d.peeking());
  d.key("keydown", "Alt", { ctrlKey: true, shiftKey: true, metaKey: true }); // Hyper
  d.key("keyup", "Alt", { ctrlKey: true, shiftKey: true, metaKey: true });
  d.key("keydown", "Alt", { ctrlKey: true, shiftKey: true, metaKey: true });
  d.key("keyup", "Alt", { ctrlKey: true, shiftKey: true, metaKey: true });
  assert.ok(!d.peeking());
  stop();
});
