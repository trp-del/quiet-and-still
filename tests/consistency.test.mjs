// Checks the shipped bundle (dist/preview.js shares every module with dist/index.js)
// for the rules that keep the library consistent. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as esbuild from "esbuild";

const ctx = {};
vm.runInNewContext(readFileSync("dist/preview.js", "utf8"), ctx);
const { QS } = ctx;
const BASE_NAMES = new Set(
  // Token names, recovered from a built light token block.
  [...QS.tokens(QS.SYSTEMS[0].id, ":root", ".dark").matchAll(/^\s*(--qs-[a-z-]+):/gm)].map((m) => m[1]),
);
const LEVELS = new Set(["ink", "quiet", "whisper"]);

test("element ids are unique and prefixed by their group", () => {
  const ids = QS.ELEMENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of QS.ELEMENTS) assert.match(e.id, /^(chrome|structure|inline|meta|task|type)\.[a-z-]+$/, e.id);
});

test("every element declares a valid level and source", () => {
  for (const e of QS.ELEMENTS) {
    assert.ok(LEVELS.has(e.level), `${e.id} level ${e.level}`);
    assert.ok(e.source === "src" || e.source === "live", `${e.id} source ${e.source}`);
  }
});

test("elements only read tokens that exist", () => {
  for (const e of QS.ELEMENTS) {
    for (const [, name] of e.css.matchAll(/var\((--[a-z-]+)/g)) {
      if (name.startsWith("--ls-")) continue;
      assert.ok(BASE_NAMES.has(name), `${e.id} reads undefined token ${name}`);
    }
  }
});

test("elements style through tokens, not literal colors", () => {
  for (const e of QS.ELEMENTS) {
    assert.doesNotMatch(e.css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, `${e.id} hard-codes a color`);
  }
});

test("neutrals resolve under every Logseq accent color, not just the classic one", () => {
  const css = QS.tokens(QS.SYSTEMS[0].id, ":root", ".dark");
  for (const m of css.matchAll(/var\(--ls-primary-text-color\)/g)) {
    assert.fail(`bare --ls-primary-text-color without the --lx-gray-12 chain near: ${css.slice(m.index - 40, m.index + 40)}`);
  }
  assert.match(css, /var\(--lx-gray-12, var\(--ls-primary-text-color/);
});

test("system ids are unique and every system defines its visual keys", () => {
  const ids = QS.SYSTEMS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of QS.SYSTEMS) assert.ok(Object.keys(s.keys).length >= 3, `${s.id} documents too few keys`);
});

test("systems only set known tokens", () => {
  for (const s of QS.SYSTEMS) {
    for (const k of [...Object.keys(s.tokens), ...Object.keys(s.dark)]) {
      assert.ok(BASE_NAMES.has(k), `${s.id} sets unknown token ${k}`);
    }
  }
});

test("every system x mode stylesheet parses as valid CSS", async () => {
  const all = QS.ELEMENTS.map((e) => e.id);
  for (const s of QS.SYSTEMS) {
    const css = `${QS.tokens(s.id, ":root", ":root.dark")}\n${QS.elements(all, "html")}`;
    const { warnings } = await esbuild.transform(css, { loader: "css", target: "chrome120" });
    assert.deepEqual(warnings.map((w) => w.text), [], `${s.id} produced CSS warnings`);
  }
});

// live.ts and contrast.ts are not in the preview bundle; bundle them on their own.
const lib = {};
vm.runInNewContext(
  (await esbuild.build({
    stdin: { contents: `export * from "./live"; export * from "./contrast"; export { SYSTEMS } from "./systems";`, resolveDir: "src", loader: "ts" },
    bundle: true, format: "iife", globalName: "lib", write: false,
  })).outputFiles[0].text + ";globalThis.out = lib;",
  lib,
);
const { out } = lib;

test("every system keeps whisper above the findability floor in both modes", () => {
  for (const mode of ["light", "dark"]) {
    for (const s of QS.SYSTEMS) {
      const css = QS.tokens(s.id, ":root", ".dark");
      const block = mode === "light" ? css.split(".dark {")[0] : css.slice(css.indexOf(".dark {"));
      const whisper = Number(block.match(/--qs-whisper: ([\d.]+);/)[1]);
      const ratio = out.fadedContrast(out.REFERENCE[mode], whisper);
      assert.ok(ratio >= out.FLOOR - 1e-9, `${s.id} ${mode} whisper ${whisper} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test("the key popover can spotlight every kind a system documents", async () => {
  for (const s of out.SYSTEMS) {
    for (const kind of Object.keys(s.keys)) {
      const css = out.spotlightCss(kind);
      assert.notEqual(css, "", `${s.id} key "${kind}" has no selector in live.ts`);
      const { warnings } = await esbuild.transform(css, { loader: "css", target: "chrome120" });
      assert.deepEqual(warnings.map((w) => w.text), [], kind);
    }
  }
  assert.equal(out.spotlightCss(null), "");
});

test("the key popover CSS parses and reads only known tokens", async () => {
  const { warnings } = await esbuild.transform(out.KEY_CSS, { loader: "css", target: "chrome120" });
  assert.deepEqual(warnings.map((w) => w.text), []);
  for (const [, name] of out.KEY_CSS.matchAll(/var\((--qs-[a-z-]+)/g)) assert.ok(BASE_NAMES.has(name), name);
});
