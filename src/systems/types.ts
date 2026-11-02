import type { Tokens } from "../tokens";

export interface System {
  id: string;
  name: string;
  idea: string;
  /** Which channel each type of information owns; shown in the previews. */
  keys: Record<string, string>;
  tokens: Tokens;
  /** Overrides applied on top of `tokens` in dark mode; usually only accent hues. */
  dark: Tokens;
}

export const defineSystem = (s: System): System => s;
