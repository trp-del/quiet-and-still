// Exercises src/main.ts against a stub of the Logseq plugin API, checking that it
// wires settings, theme mode and commands to the stylesheet it provides.

import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import * as esbuild from "esbuild";

function stubLogseq({ themeMode = "light", settings = {} } = {}) {
  const calls = { styles: [], commands: [], msgs: [] };
  const hooks = {};
  const logseq = {
    settings: { ...settings },
    ready: (fn) => Promise.resolve().then(fn),
    useSettingsSchema(schema) { calls.schema = schema; return this; },
    provideStyle: (s) => calls.styles.push(s),
    onSettingsChanged: (cb) => (hooks.settings = cb),
    updateSettings(attrs) { Object.assign(this.settings, attrs); hooks.settings?.(this.settings, {}); },
    App: {
      getUserConfigs: async () => ({ preferredThemeMode: themeMode }),
      onThemeModeChanged: (cb) => (hooks.theme = cb),
      registerCommandPalette: (opts, action) => calls.commands.push({ ...opts, action }),
    },
    UI: { showMsg: async (m) => calls.msgs.push(m) },
  };
  return { logseq, calls, hooks, last: () => calls.styles.at(-1) };
}

const bundle = (
  await esbuild.build({
    entryPoints: ["src/main.ts"], bundle: true, format: "iife", write: false,
    // The real @logseq/libs needs a Logseq host; the stub stands in for it.
    alias: { "@logseq/libs": "./tests/empty.js" },
  })
).outputFiles[0].text;

async function load(opts) {
  const stub = stubLogseq(opts);
  vm.runInNewContext(bundle, { logseq: stub.logseq, console });
  await new Promise((r) => setTimeout(r, 0));
  return stub;
}

test("provides one keyed stylesheet with the default system on start", async () => {
  const { calls, last } = await load();
  assert.equal(calls.styles.length, 1);
  assert.equal(last().key, "quiet-and-still");
  assert.match(last().style, /--qs-heading-weight: 600;/);
  assert.match(last().style, /--qs-done-opacity: 0\.3;/); // Still, the default
  assert.match(last().style, /^html \{/m);
});

test("settings schema has the master switch, system picker and every element", async () => {
  const { calls } = await load();
  // Array.from: the schema comes from the vm realm, whose Array prototype differs.
  const keys = Array.from(calls.schema, (s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(keys.slice(0, 4), ["enabled", "system", "floor", "peekKey"]);
  assert.ok(keys.includes("el_inline_page_ref"));
});

test("dark theme mode switches to the system's dark tokens", async () => {
  const { hooks, last } = await load();
  assert.match(last().style, /--qs-state: #d0761c;/);
  hooks.theme({ mode: "dark" });
  assert.match(last().style, /--qs-state: #f0a04b;/);
});

test("starting in dark mode uses dark tokens immediately", async () => {
  const { last } = await load({ themeMode: "dark" });
  assert.match(last().style, /--qs-state: #f0a04b;/);
});

test("turning an element off removes only that element", async () => {
  const { logseq, last } = await load();
  assert.match(last().style, /\/\* chrome\.header \*\//);
  logseq.updateSettings({ el_chrome_header: false });
  assert.doesNotMatch(last().style, /\/\* chrome\.header \*\//);
  assert.match(last().style, /\/\* chrome\.left-sidebar \*\//);
});

test("toggle command empties the stylesheet and restores it", async () => {
  const { calls, last } = await load();
  const toggle = calls.commands.find((c) => c.key === "qs-toggle");
  toggle.action();
  assert.equal(last().style, "");
  toggle.action();
  assert.notEqual(last().style, "");
});

test("next-system command cycles systems and announces the name", async () => {
  const { calls, logseq, last } = await load();
  calls.commands.find((c) => c.key === "qs-next-system").action();
  assert.equal(logseq.settings.system, "paper");
  assert.match(last().style, /--qs-tag-variant: all-small-caps;/);
  assert.deepEqual(calls.msgs, ["Quiet & Still: Ink & Paper"]);
});

test("registers a use-system command for every system", async () => {
  const { calls } = await load();
  const use = calls.commands.filter((c) => c.key.startsWith("qs-use-"));
  assert.equal(use.length, 8);
  use.find((c) => c.key === "qs-use-shapes").action();
});

test("whisper is clamped to the findability floor unless that setting is off", async () => {
  const { logseq, last } = await load();
  assert.match(last().style, /^  --qs-whisper: 0\.2;/m); // Still asks for 0.12
  logseq.updateSettings({ floor: false });
  assert.match(last().style, /^  --qs-whisper: 0\.12;/m);
});

test("the OS contrast and motion preferences adjust the tokens", async () => {
  const { last } = await load();
  assert.match(last().style, /@media \(prefers-contrast: more\) \{\n:root \{\n  --qs-whisper: 0\.5;\n  --qs-quiet: 0\.75;/);
  assert.match(last().style, /@media \(prefers-reduced-motion: reduce\) \{\n:root \{\n  --qs-ease: 0ms linear;/);
});

test("registers the key and peek commands without a host document", async () => {
  const { calls } = await load();
  for (const key of ["qs-show-key", "qs-peek"]) {
    const cmd = calls.commands.find((c) => c.key === key);
    assert.ok(cmd, key);
    cmd.action(); // no Logseq document in the test: must be a no-op, not a throw
  }
});

test("repeat-mention marking is off by default and its CSS follows the setting", async () => {
  const { logseq, last } = await load();
  assert.doesNotMatch(last().style, /\/\* inline\.repeat-ref \*\//);
  logseq.updateSettings({ el_inline_repeat_ref: true });
  assert.match(last().style, /a\.page-ref\.qs-repeat/);
});
