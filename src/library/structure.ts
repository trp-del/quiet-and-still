import { defineGroup } from "./types";

export default defineGroup("Structure", [
  {
    id: "structure.bullets", label: "Bullets (collapsed keep a ring)",
    level: "whisper", source: "src", on: true,
    css: `
      .bullet-container .bullet {
        background-color: var(--qs-bullet);
        transform: scale(var(--qs-bullet-scale));
      }
      .bullet-container.bullet-closed { background-color: var(--qs-bullet-ring); }`,
  },
  {
    id: "structure.threads", label: "Thread lines",
    level: "whisper", source: "live", on: true,
    css: `
      .block-children { border-left-color: var(--qs-thread) !important; }
      .block-children-left-border { opacity: var(--qs-whisper); }`,
  },
  {
    id: "structure.branch", label: "Lit branch: path to the editing block",
    level: "quiet", source: "src", on: true,
    // Live state, not category: only the thread lines and bullets above the block
    // being edited rise. Text is never touched. .block-main-container is a direct
    // child of .ls-block and never holds its children, so only ancestors match.
    css: `
      .block-children-container:has(.editor-inner) > .block-children {
        border-left-color: var(--qs-branch) !important;
        transition: border-color var(--qs-ease);
      }
      .ls-block:has(.editor-inner) > .block-main-container .bullet-container .bullet {
        background-color: var(--qs-branch);
      }`,
  },
  {
    id: "structure.breadcrumbs", label: "Breadcrumbs",
    level: "quiet", source: "src", on: true,
    css: `
      :is(.breadcrumb, .ls-block-breadcrumb) {
        opacity: var(--qs-quiet); font-size: 0.85em; transition: opacity var(--qs-ease);
      }
      :is(.breadcrumb, .ls-block-breadcrumb):hover { opacity: 1; }`,
  },
  {
    id: "structure.references", label: "Linked references section",
    level: "quiet", source: "live", on: true,
    // .references wraps .references-blocks-wrap in the real DOM; fade only the
    // outermost match so nested wrappers don't multiply the opacity.
    css: `
      :is(.references, .references-blocks-wrap):not(:is(.references, .references-blocks-wrap) *) {
        opacity: var(--qs-quiet); transition: opacity var(--qs-ease);
      }
      :is(.references, .references-blocks-wrap):not(:is(.references, .references-blocks-wrap) *):is(:hover, :focus-within) {
        opacity: 1;
      }`,
  },
  {
    id: "structure.unlinked-refs", label: "Unlinked references",
    level: "whisper", source: "src", on: true,
    css: `
      .unlinked-references { opacity: var(--qs-whisper); transition: opacity var(--qs-ease); }
      .unlinked-references:hover, .unlinked-references:focus-within { opacity: 1; }`,
  },
  {
    id: "structure.selection", label: "Selected blocks",
    level: "ink", source: "src", on: true,
    css: `
      .ls-block.selected { background: var(--qs-select-bg) !important; }`,
  },
  {
    id: "structure.embeds", label: "Page & block embeds",
    level: "ink", source: "src", on: true,
    css: `
      :is(.embed-page, .embed-block) {
        background: transparent; border: 0; border-left: 2px solid var(--qs-thread); border-radius: 0;
      }
      .embed-header { opacity: var(--qs-quiet); font-size: 0.88em; }`,
  },
  {
    id: "structure.right-sidebar-items", label: "Right sidebar item headers",
    level: "quiet", source: "src", on: true,
    css: `
      .sidebar-item-header { opacity: var(--qs-quiet); font-size: 0.88em; transition: opacity var(--qs-ease); }
      .sidebar-item:hover .sidebar-item-header { opacity: 1; }`,
  },
  {
    id: "structure.focus", label: "Editing block regains full volume",
    level: "ink", source: "live", on: true,
    css: `
      .block-main-container:has(.editor-inner)
        :is(.ls-properties-area, .positioned-properties, .block-tags, .bottom-properties-row) {
        opacity: 1;
      }`,
  },
]);
