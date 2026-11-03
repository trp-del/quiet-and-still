import { ink, n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "margin",
  name: "Margin Notes",
  idea: "Metadata shrinks and pales like pencil in a margin; refs stay ink.",
  keys: {
    "page ref": "ink, dotted underline",
    "tag": "mid grey",
    "block ref": "ink, dashed underline",
    "properties": "small, pencil grey",
    "state": "ink weight, no color",
  },
  tokens: {
    "--qs-whisper": "0.2",
    "--qs-quiet": "0.5",
    "--qs-ref-line-style": "dotted",
    "--qs-ref-line": n(55),
    "--qs-prop-size": "0.78em",
    "--qs-prop-key": n(45),
    "--qs-prop-val": n(65),
    "--qs-date": n(50),
    "--qs-bullet": n(25),
    "--qs-thread": n(6),
    "--qs-state": ink,
  },
  dark: {},
});
