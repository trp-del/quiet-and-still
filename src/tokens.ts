// Every token an element may read, with its default value.
// Systems override a subset; TokenName keeps those overrides typo-proof.

// Logseq's own body text chain: --lx-gray-12 under the default accent colors,
// --ls-primary-text-color only under the classic "logseq" accent. Using just the
// latter leaves every n() invalid, and borders fall back to black.
export const ink = "var(--lx-gray-12, var(--ls-primary-text-color, hsl(var(--foreground))))";

/** A neutral mixed from Logseq's own text color, so it follows light and dark themes. */
export const n = (pct: number) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`;

export const BASE = {
  "--qs-whisper": "0.3",
  "--qs-quiet": "0.6",
  "--qs-ease": "150ms ease",
  // How long the pointer must rest on a region before hover restores it.
  "--qs-dwell": "140ms",
  "--qs-font": "inherit",
  "--qs-mono": "ui-monospace, \"SF Mono\", Menlo, monospace",
  "--qs-ref": ink,
  "--qs-ref-weight": "400",
  "--qs-ref-deco": "underline",
  "--qs-ref-line": n(35),
  "--qs-ref-line-style": "solid",
  "--qs-ref-repeat": n(15),
  "--qs-bracket": "0.25",
  "--qs-tag": n(60),
  "--qs-tag-bg": "transparent",
  "--qs-tag-border": "transparent",
  "--qs-tag-radius": "3px",
  "--qs-tag-pad": "0",
  "--qs-tag-size": "0.9em",
  "--qs-tag-variant": "normal",
  "--qs-bref": ink,
  "--qs-bref-bg": "transparent",
  "--qs-bref-line": n(35),
  "--qs-bref-line-style": "dashed",
  "--qs-bref-style": "normal",
  "--qs-bref-radius": "0",
  "--qs-link": ink,
  "--qs-link-line": n(30),
  "--qs-code-fg": n(85),
  "--qs-code-bg": n(6),
  "--qs-mark-bg": n(12),
  "--qs-date": n(60),
  "--qs-date-line-style": "solid",
  "--qs-date-line": "transparent",
  "--qs-prop-key": n(60),
  "--qs-prop-val": n(90),
  "--qs-prop-size": "0.88em",
  "--qs-todo": n(50),
  "--qs-state": n(80),
  "--qs-done-opacity": "0.45",
  "--qs-bullet": n(35),
  "--qs-bullet-ring": n(12),
  "--qs-bullet-scale": "0.85",
  "--qs-thread": n(10),
  "--qs-branch": n(40),
  "--qs-heading": ink,
  "--qs-heading-weight": "600",
  "--qs-heading-track": "-0.01em",
  "--qs-quote": n(75),
  "--qs-quote-line": n(15),
  "--qs-select-bg": n(6),
  "--qs-cell-line": n(8),
  "--qs-chip-filter": "none",
  "--qs-syntax-filter": "none",
} as const;

/** Raised levels for viewers whose OS asks for more contrast; never lowers a system's own. */
export const MORE_CONTRAST = { "--qs-whisper": 0.5, "--qs-quiet": 0.75 } as const;

export type TokenName = keyof typeof BASE;
export type Tokens = Partial<Record<TokenName, string>>;
