import { defineGroup } from "./types";

export default defineGroup("Metadata", [
  {
    id: "meta.properties", label: "Properties (block & page)",
    level: "quiet", source: "src", on: true,
    css: `
      :is(.ls-properties-area, .ls-page-properties) {
        opacity: var(--qs-quiet); font-size: var(--qs-prop-size); transition: opacity var(--qs-ease);
      }
      :is(.ls-properties-area, .ls-page-properties):hover,
      :is(.ls-properties-area, .ls-page-properties):focus-within { opacity: 1; }
      .property-key { color: var(--qs-prop-key); }
      .property-value { color: var(--qs-prop-val); }`,
  },
  {
    id: "meta.empty", label: "Empty properties quieter than filled ones",
    level: "whisper", source: "src", on: true,
    // Empty rows and "Add property" sit inside an area already at quiet, and opacity
    // multiplies, so whisper / quiet lands them at whisper overall. Attention on the
    // area restores them with it.
    css: `
      :is(.ls-properties-area, .ls-page-properties) :is(.property-panel-row-empty, .ls-new-property),
      .property-value-inner.empty-value {
        opacity: calc(var(--qs-whisper) / var(--qs-quiet)); transition: opacity var(--qs-ease);
      }
      :is(.ls-properties-area, .ls-page-properties):is(:hover, :focus-within)
        :is(.property-panel-row-empty, .ls-new-property, .property-value-inner.empty-value) {
        opacity: 1;
      }`,
  },
  {
    id: "meta.block-tags", label: "Block tag row",
    level: "quiet", source: "src", on: true,
    css: `
      .block-tags { opacity: var(--qs-quiet); transition: opacity var(--qs-ease); }
      .block-tags:hover { opacity: 1; }`,
  },
  {
    id: "meta.bottom-pills", label: "Bottom property pills",
    level: "quiet", source: "src", on: true,
    css: `
      .bottom-properties-row { opacity: var(--qs-quiet); transition: opacity var(--qs-ease); }
      .bottom-properties-row:hover, .bottom-properties-row:focus-within { opacity: 1; }`,
  },
  {
    id: "meta.views", label: "Table views (headers, grid, toolbar)",
    level: "quiet", source: "src", on: true,
    css: `
      .ls-view-head, .table-action-bar { opacity: var(--qs-whisper); transition: opacity var(--qs-ease); }
      .ls-view-head:hover, .ls-view-head:focus-within, .table-action-bar:hover { opacity: 1; }
      .ls-table-header-cell { color: var(--qs-prop-key); font-size: var(--qs-prop-size); font-weight: 400; }
      :is(.ls-table-cell, .ls-table-header-cell, .ls-table-row) { border-color: var(--qs-cell-line) !important; }`,
  },
  {
    id: "meta.choice-colors", label: "Choice & priority colors",
    level: "quiet", source: "src", on: true,
    // A filter instead of color overrides: Logseq sets these hues per choice, and
    // grayscale keeps their lightness, so values still differ in tone.
    css: `
      .property-value-inner :is(.select-item, .ls-icon-color-wrap),
      .positioned-properties .ls-icon-color-wrap,
      [class*="ls-icon-priorityLvl"] { filter: var(--qs-chip-filter); }`,
  },
  {
    id: "meta.page-icon", label: "Page icons",
    level: "quiet", source: "src", on: true,
    css: `
      .ls-page-icon { opacity: var(--qs-quiet); }`,
  },
]);
