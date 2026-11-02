// Turns a system + a set of enabled elements into CSS.
// The plugin and the preview pages both go through these functions.

import { minOpacity, REFERENCE } from "./contrast";
import { ELEMENTS } from "./library";
import { SYSTEMS, type System } from "./systems";
import { BASE, MORE_CONTRAST } from "./tokens";

export type Mode = "light" | "dark";
export interface BuildOptions {
  /** Clamp whisper to the findability floor for this mode. On unless turned off. */
  floor?: boolean;
}

export const findSystem = (id?: string): System => SYSTEMS.find((s) => s.id === id) ?? SYSTEMS[0];

const declarations = (tokens: Record<string, string | number>) =>
  Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");

/** Full token set for one mode: defaults, then the system, then its dark overrides, then the floor. */
export function resolveTokens(systemId: string | undefined, mode: Mode, { floor = true }: BuildOptions = {}): Record<string, string> {
  const s = findSystem(systemId);
  const t = { ...BASE, ...s.tokens, ...(mode === "dark" ? s.dark : {}) } as Record<string, string>;
  if (floor) t["--qs-whisper"] = String(Math.max(Number(t["--qs-whisper"]), minOpacity(REFERENCE[mode])));
  return t;
}

/** Tokens on `selector`, plus the OS accessibility preferences that adjust them. */
export function tokenBlock(selector: string, systemId: string | undefined, mode: Mode, opts?: BuildOptions) {
  const t = resolveTokens(systemId, mode, opts);
  const more = Object.fromEntries(
    Object.entries(MORE_CONTRAST).map(([k, v]) => [k, Math.max(v, Number(t[k]))]),
  );
  return `${selector} {\n${declarations(t)}\n}
@media (prefers-contrast: more) {\n${selector} {\n${declarations(more)}\n}\n}
@media (prefers-reduced-motion: reduce) {\n${selector} {\n  --qs-ease: 0ms linear;\n}\n}`;
}

/** Enabled elements wrapped in `scope { ... }` with CSS nesting. */
export function elementBlock(enabledIds: readonly string[], scope: string): string {
  const body = ELEMENTS.filter((el) => enabledIds.includes(el.id))
    .map((el) => `/* ${el.id} */${el.css}`)
    .join("\n");
  return `${scope} {\n${body}\n}`;
}
