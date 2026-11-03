import { defineSystem } from "./types";

export default defineSystem({
  id: "spectrum",
  name: "Quiet Spectrum",
  idea: "Each type owns one muted hue; everything else is grey.",
  keys: {
    "page ref": "slate blue",
    "tag": "teal",
    "block ref": "violet",
    "date": "ochre",
    "state": "same hue as date, bolder",
  },
  tokens: {
    "--qs-ref": "#3f64a0",
    "--qs-ref-deco": "none",
    "--qs-tag": "#2a7666",
    "--qs-bref": "#6e54a3",
    "--qs-bref-line": "color-mix(in srgb, #6e54a3 40%, transparent)",
    "--qs-date": "#8c6d1f",
    "--qs-state": "#8c6d1f",
    "--qs-todo": "#8c6d1f",
  },
  dark: {
    "--qs-ref": "#93b3e6",
    "--qs-tag": "#88d1be",
    "--qs-bref": "#bba5e6",
    "--qs-bref-line": "color-mix(in srgb, #bba5e6 40%, transparent)",
    "--qs-date": "#d8b866",
    "--qs-state": "#d8b866",
    "--qs-todo": "#d8b866",
  },
});
