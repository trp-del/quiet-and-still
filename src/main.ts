// Plugin entry. Everything visual comes from the library and systems via build.ts;
// this file only wires them, and the behaviours in live.ts, to the Logseq plugin API.

import "@logseq/libs";
import { elementBlock, findSystem, tokenBlock, type Mode } from "./build";
import { hostDocument, KEY_CSS, spotlightCss, toggleKey, togglePeek, watchPeek, watchRepeats } from "./live";
import { enabledElements, schema, type Settings } from "./settings";
import { startStructure, type Structure } from "./structure";
import { STRUCTURE_CSS } from "./structure/ui";
import { SYSTEMS } from "./systems";

const STYLE_KEY = "quiet-and-still";
const SPOT_KEY = "quiet-and-still-spotlight";
let mode: Mode = "light";

const settings = () => (logseq.settings ?? {}) as Partial<Settings>;
const isOn = (s: Partial<Settings>, id: string) => s.enabled !== false && enabledElements(s).includes(id);

function apply() {
  const s = settings();
  const css = s.enabled === false
    ? ""
    : `${tokenBlock(":root", s.system, mode, { floor: s.floor !== false })}\n${elementBlock(enabledElements(s), "html")}\n${KEY_CSS}\n${STRUCTURE_CSS}`;
  // Same key every time, so Logseq replaces the previous stylesheet in place.
  logseq.provideStyle({ key: STYLE_KEY, style: css });
  syncLive(s);
}

// Live behaviours start and stop with their elements.
let stopPeek: (() => void) | undefined;
let stopRepeats: (() => void) | undefined;
let structure: Structure | undefined;

function syncLive(s: Partial<Settings>) {
  const doc = hostDocument();
  if (!doc) return;
  const peek = isOn(s, "chrome.peek") && s.peekKey !== "off";
  if (peek && !stopPeek) stopPeek = watchPeek(doc, () => settings().peekKey ?? "Alt");
  if (!peek && stopPeek) { stopPeek(); stopPeek = undefined; }
  const repeats = isOn(s, "inline.repeat-ref");
  if (repeats && !stopRepeats) stopRepeats = watchRepeats(doc);
  if (!repeats && stopRepeats) { stopRepeats(); stopRepeats = undefined; }
  // Structure follows the master switch; its own settings take effect on reconfigure.
  if (s.enabled !== false && !structure) structure = startStructure(doc, settings);
  else if (s.enabled === false && structure) { structure.stop(); structure = undefined; }
  else structure?.configure();
}

function registerCommands() {
  logseq.App.registerCommandPalette(
    { key: "qs-toggle", label: "Quiet & Still: turn on / off" },
    () => logseq.updateSettings({ enabled: settings().enabled === false }),
  );
  logseq.App.registerCommandPalette(
    { key: "qs-next-system", label: "Quiet & Still: next design system" },
    () => {
      const i = SYSTEMS.findIndex((x) => x.id === findSystem(settings().system).id);
      const next = SYSTEMS[(i + 1) % SYSTEMS.length];
      logseq.updateSettings({ system: next.id, enabled: true });
      logseq.UI.showMsg(`Quiet & Still: ${next.name}`);
    },
  );
  logseq.App.registerCommandPalette(
    { key: "qs-show-key", label: "Quiet & Still: show the key" },
    () => {
      const doc = hostDocument();
      if (doc) toggleKey(doc, findSystem(settings().system), (kind) => logseq.provideStyle({ key: SPOT_KEY, style: spotlightCss(kind) }));
    },
  );
  logseq.App.registerCommandPalette(
    { key: "qs-peek", label: "Quiet & Still: peek on / off" },
    () => { const doc = hostDocument(); if (doc) togglePeek(doc); },
  );
  logseq.App.registerCommandPalette(
    { key: "qs-check-pairs", label: "Quiet & Still: check pairs" },
    () => structure?.checkPairs(),
  );
  logseq.App.registerCommandPalette(
    { key: "qs-sweep", label: "Quiet & Still: sweep this page" },
    () => structure?.sweep(),
  );
  logseq.App.registerCommandPalette(
    { key: "qs-table", label: "Quiet & Still: children as a table / back", keybinding: { binding: "mod+shift+t" } },
    () => structure?.table(),
  );
  for (const sys of SYSTEMS) {
    logseq.App.registerCommandPalette(
      { key: `qs-use-${sys.id}`, label: `Quiet & Still: use ${sys.name}` },
      () => logseq.updateSettings({ system: sys.id, enabled: true }),
    );
  }
}

async function main() {
  logseq.useSettingsSchema(schema());
  mode = (await logseq.App.getUserConfigs()).preferredThemeMode === "dark" ? "dark" : "light";
  apply();

  logseq.onSettingsChanged(apply);
  // On reload or uninstall, take our listeners and elements out of Logseq's page.
  logseq.beforeunload?.(async () => {
    stopPeek?.(); stopPeek = undefined;
    stopRepeats?.(); stopRepeats = undefined;
    structure?.stop(); structure = undefined;
  });
  logseq.App.onThemeModeChanged(({ mode: m }) => {
    mode = m;
    apply();
  });
  registerCommands();
}

logseq.ready(main).catch(console.error);
