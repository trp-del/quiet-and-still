# Quiet & Still

A Logseq DB plugin that fades non-essential UI while keeping a fast visual key for
each type of information. The principles are in [RULES.md](RULES.md).

## Layout

| Path | What it holds |
| --- | --- |
| `src/tokens.ts` | Every `--qs-*` token with its default. `TokenName` makes system overrides typo-proof |
| `src/library/` | The element library, one module per group (chrome, structure, inline, metadata, tasks, type) |
| `src/systems/` | Design systems, one module each; token values only. The first in `index.ts` is the default |
| `src/build.ts` | Turns a system + mode + enabled elements into CSS, with the findability floor and OS contrast/motion preferences. Used by the plugin and the previews |
| `src/contrast.ts` | Contrast math for the floor: faded whisper must keep 1.5:1 against Logseq's default neutrals |
| `src/live.ts` | Behaviour CSS can't do alone: the peek key, marking repeat page mentions, the key popover |
| `src/settings.ts` | Settings schema generated from the library and systems |
| `src/main.ts` | Plugin entry: wires the builder to the Logseq API (styles, settings, theme mode, commands) |
| `src/preview.ts` | Exposes the same modules as `window.QS` for the preview pages |
| `preview.html` | Every system side by side on a mock Logseq page |
| `still.html` | The Still system on a full-app mock, with a Baseline toggle |
| `proposals.html` | The ten cognitive proposals behind the live behaviours, each with a demo |
| `tests/` | Consistency rules for the library, and the plugin's API wiring against a stub |

## Commands

```bash
npm install
```

```bash
npm run build
```

```bash
npm test
```

```bash
npm run check
```

`npm run watch` rebuilds on every change.

## Loading in Logseq

Run `npm run build`, then in Logseq: Settings → Advanced → Developer mode on, then
Plugins → Load unpacked plugin → choose this folder. Pick a system and switch
elements in the plugin's settings. The command palette has "Quiet & Still: turn on / off",
"next design system", "use <system>", "show the key" and "peek on / off".

Hold the peek key (⌥ by default, set in the plugin's settings) on its own to see everything
at full volume until you let go. "Show the key" lists the current system's visual keys;
point at a row to fade every block that doesn't contain that type.

## Adding an element

Add an entry to the group module in `src/library/` and style it only through `--qs-*`
tokens. If it needs a new token, add its default to `BASE` in `src/tokens.ts`. The
settings page, previews and tests pick it up automatically. The tests fail if an element
reads an unknown token, hard-codes a color, or produces invalid CSS.

## Adding a system

Copy a module in `src/systems/`, change its tokens, and add it to `SYSTEMS` in
`src/systems/index.ts`. It appears in the settings picker, the commands and the preview.
