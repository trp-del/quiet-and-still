import { defineGroup } from "./types";

export default defineGroup("Chrome", [
  {
    id: "chrome.header", label: "Top header",
    level: "whisper", source: "src", on: true,
    css: `
      .cp__header { opacity: var(--qs-whisper); transition: opacity var(--qs-ease); }
      .cp__header:hover, .cp__header:focus-within { opacity: 1; }`,
  },
  {
    id: "chrome.left-sidebar", label: "Left sidebar (graph switcher, group headers)",
    level: "whisper", source: "src", on: true,
    // Faded part by part, never on a container: opacity multiplies down the tree,
    // and .sidebar-header-container also holds the Navigations group, so fading it
    // would cap the navigation below whisper.
    css: `
      #left-sidebar :is(.sidebar-graphs, .sidebar-content-group .hd) {
        opacity: var(--qs-whisper); transition: opacity var(--qs-ease);
      }
      #left-sidebar:is(:hover, :focus-within) :is(.sidebar-graphs, .sidebar-content-group .hd) {
        opacity: 1;
      }`,
  },
  {
    id: "chrome.left-sidebar-pages", label: "Left sidebar navigation & page lists",
    level: "quiet", source: "src", on: true,
    // In Logseq DB every section, navigation included, is a .sidebar-content-group
    // whose items sit in .bd. Fade only the outermost .bd so nothing fades twice.
    css: `
      #left-sidebar .sidebar-content-group .bd:not(.bd .bd) {
        opacity: var(--qs-quiet); transition: opacity var(--qs-ease);
      }
      #left-sidebar:is(:hover, :focus-within) .sidebar-content-group .bd:not(.bd .bd) {
        opacity: 1;
      }`,
  },
  {
    id: "chrome.right-sidebar", label: "Right sidebar top bar",
    level: "whisper", source: "src", on: true,
    css: `
      .cp__right-sidebar-topbar { opacity: var(--qs-whisper); transition: opacity var(--qs-ease); }
      .cp__right-sidebar-topbar:hover { opacity: 1; }`,
  },
  {
    id: "chrome.page-actions", label: "Page title actions",
    level: "whisper", source: "src", on: true,
    css: `
      :is(.ls-page-title-actions, .page-configure, .page-add-tags) {
        opacity: var(--qs-whisper); transition: opacity var(--qs-ease);
      }
      :is(.ls-page-title-actions, .page-configure, .page-add-tags):hover { opacity: 1; }`,
  },
  {
    id: "chrome.sync", label: "Sync status speaks only on change",
    level: "whisper", source: "live", on: true,
    // Logseq marks the cloud button .on while connected, plus .idle/.syncing/.queuing.
    // Steady states get a neutral dot; losing the connection lifts the header to
    // quiet and turns the cloud the state hue. Hover still restores the header fully.
    css: `
      .cp__rtc-sync-indicator .ui__button.cloud.on:is(.idle, .syncing, .queuing)::after {
        background-color: var(--qs-bullet);
      }
      .cp__rtc-sync-indicator .ui__button.cloud:not(.on) { color: var(--qs-state); }
      .cp__header:has(.cp__rtc-sync-indicator .cloud:not(.on)):not(:hover, :focus-within) {
        opacity: var(--qs-quiet);
      }`,
  },
  {
    id: "chrome.toasts", label: "Notifications fade in, no slide",
    level: "ink", source: "src", on: true,
    // Logseq's toasts slide down from above. Without a transform transition they
    // appear in place and only their opacity moves.
    css: `
      .ui__toaster-viewport .ui__toast { transition: opacity var(--qs-ease), height var(--qs-ease); }
      .ui__toaster-viewport .ui__toast[data-starting-style] { opacity: 0; }`,
  },
  {
    id: "chrome.peek", label: "Peek key restores everything while held",
    level: "ink", source: "src", on: true,
    // Every fade reads these tokens, so raising them is the whole peek. The plugin
    // adds .qs-peek to <html> while the key is held (see live.ts).
    css: `
      &.qs-peek { --qs-whisper: 1; --qs-quiet: 1; --qs-done-opacity: 1; }`,
  },
  {
    id: "chrome.dwell", label: "Hover waits a moment before restoring",
    level: "whisper", source: "src", on: true,
    // Delays only the restore, and only for hover: leaving fades back at once, and
    // keyboard focus (:focus-within) restores immediately. Each selector mirrors the
    // hover rule of the element it delays, with higher specificity so it wins.
    css: `
      .cp__header:hover:not(:focus-within),
      #left-sidebar:hover:not(:focus-within) :is(.sidebar-graphs, .sidebar-content-group .hd, .sidebar-content-group .bd:not(.bd .bd)),
      .cp__right-sidebar-topbar:hover,
      :is(.ls-page-title-actions, .page-configure, .page-add-tags):hover,
      :is(.breadcrumb, .ls-block-breadcrumb):hover,
      :is(.references, .references-blocks-wrap):not(:is(.references, .references-blocks-wrap) *):hover:not(:focus-within),
      .unlinked-references:hover:not(:focus-within),
      .sidebar-item:hover .sidebar-item-header,
      :is(.ls-properties-area, .ls-page-properties):hover:not(:focus-within),
      .block-tags:hover,
      .bottom-properties-row:hover:not(:focus-within),
      :is(.ls-view-head, .table-action-bar):hover:not(:focus-within),
      .block-main-container:has(.block-title-wrap > .ui__checkbox.checked):hover .block-title-wrap {
        transition-delay: var(--qs-dwell);
      }`,
  },
]);
