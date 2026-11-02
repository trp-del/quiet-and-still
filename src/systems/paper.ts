import { n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "paper",
  name: "Ink & Paper",
  idea: "Typography alone. No hue except one for live task state.",
  keys: {
    "page ref": "ink, solid hairline underline",
    "tag": "small caps, grey",
    "block ref": "italic, dashed underline",
    "date": "tabular figures, grey",
    "state": "rust",
  },
  tokens: {
    "--qs-tag-variant": "all-small-caps",
    "--qs-tag-size": "1em",
    "--qs-tag": n(55),
    "--qs-bref-style": "italic",
    "--qs-state": "#b4532a",
    "--qs-todo": n(45),
  },
  dark: {
    "--qs-state": "#e08a62",
  },
});
