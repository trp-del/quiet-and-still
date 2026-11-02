import { defineGroup } from "./types";

export default defineGroup("Tasks", [
  {
    id: "task.checkbox", label: "Task checkbox",
    level: "ink", source: "src", on: true,
    css: `
      .block-title-wrap > .ui__checkbox { color: var(--qs-todo); border-color: var(--qs-todo); }`,
  },
  {
    id: "task.status", label: "Status / priority (left of block)",
    level: "ink", source: "live", on: true,
    css: `
      .positioned-properties.block-left { color: var(--qs-state); }`,
  },
  {
    id: "task.done", label: "Done tasks recede",
    level: "quiet", source: "live", on: true,
    css: `
      .block-main-container:has(.block-title-wrap > .ui__checkbox.checked) .block-title-wrap {
        opacity: var(--qs-done-opacity);
        transition: opacity var(--qs-ease);
      }
      .block-main-container:has(.block-title-wrap > .ui__checkbox.checked):hover .block-title-wrap {
        opacity: 1;
      }`,
  },
]);
