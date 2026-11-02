import { n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "shapes",
  name: "Shape Grammar",
  idea: "No color at all; each type has its own outline shape.",
  keys: {
    "page ref": "solid underline",
    "tag": "rounded outline pill",
    "block ref": "dashed underline",
    "date": "dotted underline",
    "state": "heavier checkbox",
  },
  tokens: {
    "--qs-ref-line": n(45),
    "--qs-tag": n(70),
    "--qs-tag-border": n(30),
    "--qs-tag-radius": "999px",
    "--qs-tag-pad": "0.4em",
    "--qs-tag-size": "0.85em",
    "--qs-bref-line": n(40),
    "--qs-bref-radius": "0",
    "--qs-date": n(80),
    "--qs-date-line-style": "dotted",
    "--qs-date-line": n(50),
    "--qs-todo": n(80),
  },
  dark: {},
});
