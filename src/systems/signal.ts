import { n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "signal",
  name: "Signal",
  idea: "Monochrome structure; color is spent only on live state.",
  keys: {
    "page ref": "ink, hairline underline",
    "tag": "grey text",
    "block ref": "faint tint",
    "doing / overdue": "amber, the only color",
    "done": "strongly faded",
  },
  tokens: {
    "--qs-ref-line": n(30),
    "--qs-bref-bg": n(5),
    "--qs-bref-line": "transparent",
    "--qs-bref-radius": "2px",
    "--qs-state": "#d0761c",
    "--qs-todo": "#d0761c",
    "--qs-done-opacity": "0.35",
  },
  dark: {
    "--qs-state": "#f0a04b",
    "--qs-todo": "#f0a04b",
  },
});
