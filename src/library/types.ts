/** Volume level, see RULES.md rule 3. */
export type Level = "ink" | "quiet" | "whisper";

/** "src": selector confirmed in Logseq's source. "live": still needs checking in a running DB graph. */
export type Source = "src" | "live";

export interface Element {
  id: string;
  label: string;
  level: Level;
  source: Source;
  /** Enabled by default. */
  on: boolean;
  /** Only reads --qs-* tokens. Wrapped in a scope by build.ts with CSS nesting. */
  css: string;
}

export interface Group {
  name: string;
  elements: Element[];
}

export const defineGroup = (name: string, elements: Element[]): Group => ({ name, elements });
