import { n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "still",
  name: "Still",
  idea: "Mist's fade, Margin Notes' pencil metadata, and color only where attention is needed.",
  keys: {
    "page ref": "ink, dotted underline",
    "tag": "small and pale",
    "block ref": "ink, dashed underline",
    "properties": "small, pencil grey, near-invisible until hovered",
    "doing": "amber icon",
    "open task": "grey checkbox",
    "highlight": "pale yellow fill",
    "done": "strongly faded",
  },
  tokens: {
    // Mist: the fade levels and minimal structure
    "--qs-whisper": "0.12",
    "--qs-quiet": "0.4",
    "--qs-bullet": n(20),
    "--qs-bullet-scale": "0.7",
    "--qs-thread": n(5),
    // Margin Notes: refs stay ink, metadata shrinks to pencil. Block refs use a
    // dashed line, not a tint, because the tint channel belongs to highlights.
    "--qs-ref-line-style": "dotted",
    "--qs-ref-line": n(45),
    "--qs-bref-line": n(40),
    "--qs-tag-size": "0.78em",
    "--qs-tag": n(40),
    "--qs-prop-size": "0.78em",
    "--qs-prop-key": n(45),
    "--qs-prop-val": n(65),
    "--qs-date": n(50),
    // Signal: amber is spent only on live state (doing); open tasks stay neutral.
    // Highlights are a pale yellow fill: a background, never a glyph, so they
    // read apart from the amber state icon.
    "--qs-state": "#d0761c",
    "--qs-todo": n(55),
    "--qs-done-opacity": "0.3",
    "--qs-mark-bg": "color-mix(in srgb, #f2d43a 38%, transparent)",
    // Logseq's own hues (priority, choice icons, code syntax) go grey
    "--qs-chip-filter": "grayscale(1)",
    "--qs-syntax-filter": "grayscale(1)",
  },
  dark: {
    "--qs-state": "#f0a04b",
    "--qs-mark-bg": "color-mix(in srgb, #e8c840 24%, transparent)",
  },
});
