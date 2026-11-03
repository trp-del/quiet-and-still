import { ink, n } from "../tokens";
import { defineSystem } from "./types";

export default defineSystem({
  id: "mist",
  name: "Mist",
  idea: "The most aggressive fade: chrome nearly gone, only content stands.",
  keys: {
    "page ref": "ink, medium weight, no line",
    "tag": "mid grey",
    "block ref": "faint tint",
    "properties": "barely there until hovered",
    "state": "ink",
  },
  tokens: {
    "--qs-whisper": "0.12",
    "--qs-quiet": "0.35",
    "--qs-ref-deco": "none",
    "--qs-ref-weight": "550",
    "--qs-bref-bg": n(4),
    "--qs-bref-line": "transparent",
    "--qs-bref-radius": "2px",
    "--qs-bullet": n(20),
    "--qs-bullet-scale": "0.7",
    "--qs-thread": n(5),
    "--qs-state": ink,
    "--qs-done-opacity": "0.3",
  },
  dark: {},
});
