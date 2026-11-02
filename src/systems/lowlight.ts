import { defineSystem } from "./types";

export default defineSystem({
  id: "lowlight",
  name: "Low Light",
  idea: "Warm, low contrast, made for long evening sessions.",
  keys: {
    "page ref": "amber",
    "tag": "sage",
    "block ref": "dusty rose",
    "date": "warm grey",
    "state": "amber, bolder",
  },
  tokens: {
    "--qs-whisper": "0.25",
    "--qs-quiet": "0.55",
    "--qs-font": "Charter, \"Iowan Old Style\", Georgia, serif",
    "--qs-ref": "#9a5f17",
    "--qs-ref-deco": "none",
    "--qs-ref-weight": "500",
    "--qs-tag": "#5f7550",
    "--qs-bref": "#8e5260",
    "--qs-bref-line": "color-mix(in srgb, #8e5260 35%, transparent)",
    "--qs-state": "#9a5f17",
    "--qs-todo": "#9a5f17",
    "--qs-heading-weight": "500",
  },
  dark: {
    "--qs-ref": "#e0a85c",
    "--qs-tag": "#a8bd95",
    "--qs-bref": "#d29aa7",
    "--qs-bref-line": "color-mix(in srgb, #d29aa7 35%, transparent)",
    "--qs-state": "#e0a85c",
    "--qs-todo": "#e0a85c",
  },
});
