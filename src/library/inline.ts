import { defineGroup } from "./types";

export default defineGroup("Inline", [
  {
    id: "inline.page-ref", label: "Page references",
    level: "ink", source: "src", on: true,
    css: `
      a.page-ref {
        color: var(--qs-ref);
        font-weight: var(--qs-ref-weight);
        text-decoration-line: var(--qs-ref-deco);
        text-decoration-style: var(--qs-ref-line-style);
        text-decoration-color: var(--qs-ref-line);
        text-decoration-thickness: 1px;
        text-underline-offset: 0.22em;
      }
      .page-reference .bracket { opacity: var(--qs-bracket); }`,
  },
  {
    id: "inline.repeat-ref", label: "Repeat mentions of a page keep a fainter line",
    level: "ink", source: "src", on: false,
    // Same channel and style as the first mention, only fainter. The plugin marks
    // repeats with .qs-repeat per page while this is on (see live.ts).
    css: `
      a.page-ref.qs-repeat { text-decoration-color: var(--qs-ref-repeat); }`,
  },
  {
    id: "inline.tag", label: "Tags (#)",
    level: "quiet", source: "src", on: true,
    // Tags keep the text's own size and variant: the editor shows the same "#tag"
    // characters at full size, so any shrink rewraps the line on click. A pill's
    // padding is cancelled by an equal negative margin so it adds no width either.
    // In the tag row Logseq draws "#" as its own a.hash-symbol and fades both links
    // to 70%, which would multiply the tone down; the tone alone sets the volume.
    css: `
      .block-tag :is(a.tag, a.hash-symbol) { color: var(--qs-tag); opacity: 1; }
      a.tag {
        color: var(--qs-tag);
        background: var(--qs-tag-bg);
        box-shadow: inset 0 0 0 1px var(--qs-tag-border);
        border-radius: var(--qs-tag-radius);
        padding: 0 var(--qs-tag-pad);
        margin: 0 calc(-1 * var(--qs-tag-pad));
        text-decoration: none;
      }`,
  },
  {
    id: "inline.block-ref", label: "Block references",
    level: "ink", source: "src", on: true,
    css: `
      .block-ref {
        color: var(--qs-bref);
        font-style: var(--qs-bref-style);
        background: var(--qs-bref-bg);
        border: 0;
        border-bottom: 1px var(--qs-bref-line-style) var(--qs-bref-line);
        border-radius: var(--qs-bref-radius);
      }`,
  },
  {
    id: "inline.link", label: "External links",
    level: "ink", source: "live", on: true,
    css: `
      a.external-link {
        color: var(--qs-link);
        text-decoration: underline 1px var(--qs-link-line);
        text-underline-offset: 0.22em;
      }`,
  },
  {
    id: "inline.code", label: "Inline code",
    level: "ink", source: "live", on: true,
    css: `
      .block-content code:not(pre code) {
        color: var(--qs-code-fg);
        background: var(--qs-code-bg);
        font-family: var(--qs-mono);
        font-size: 0.86em;
        border: 0;
        border-radius: 3px;
        padding: 0.05em 0.3em;
      }`,
  },
  {
    id: "inline.highlight", label: "Highlights",
    level: "ink", source: "live", on: true,
    css: `
      .block-content mark { background: var(--qs-mark-bg); color: inherit; border-radius: 2px; }`,
  },
  {
    id: "inline.quote", label: "Quotes",
    level: "ink", source: "src", on: true,
    css: `
      .ls-blockquote {
        color: var(--qs-quote); background: transparent;
        border-left: 2px solid var(--qs-quote-line); padding: 0 0 0 0.8em; margin: 0.2em 0;
      }`,
  },
  {
    id: "inline.code-block", label: "Code blocks",
    level: "ink", source: "src", on: true,
    css: `
      .cp__fenced-code-block {
        background: var(--qs-code-bg); border: 0; border-radius: 6px;
        font-family: var(--qs-mono); font-size: 0.86em;
      }`,
  },
  {
    id: "inline.syntax", label: "Code syntax colors",
    level: "ink", source: "src", on: true,
    css: `
      :is(.cp__fenced-code-block, .ls-code-editor-wrap) { filter: var(--qs-syntax-filter); }`,
  },
  {
    id: "inline.date", label: "Dates & timestamps",
    level: "quiet", source: "src", on: true,
    css: `
      :is(.ls-datetime, .timestamp) {
        color: var(--qs-date);
        font-variant-numeric: tabular-nums;
        text-decoration: underline 1px var(--qs-date-line-style) var(--qs-date-line);
        text-underline-offset: 0.22em;
      }`,
  },
  {
    id: "inline.overdue", label: "Due and overdue dates take the state hue",
    level: "ink", source: "src", on: true,
    // Logseq adds .overdue to scheduled and deadline values once their time passes,
    // which includes a date-only value for today. Its own yellow would be a fifth
    // hue, so it becomes the state hue.
    css: `
      .overdue :is(.ls-datetime, .ls-datetime a.page-ref, .page-ref) { color: var(--qs-state); }`,
  },
]);
