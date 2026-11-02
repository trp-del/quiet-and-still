import { defineGroup } from "./types";

export default defineGroup("Type", [
  {
    id: "type.headings", label: "Headings & page title",
    level: "ink", source: "src", on: true,
    css: `
      :is(.block-title-wrap.as-heading, .ls-page-title, .journal-title) {
        color: var(--qs-heading);
        font-weight: var(--qs-heading-weight);
        letter-spacing: var(--qs-heading-track);
      }`,
  },
  {
    id: "type.font", label: "Use the system's typeface",
    level: "ink", source: "src", on: false,
    css: `
      :is(.block-content, .ls-page-title) { font-family: var(--qs-font); }`,
  },
]);
