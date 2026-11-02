import chrome from "./chrome";
import structure from "./structure";
import inline from "./inline";
import metadata from "./metadata";
import tasks from "./tasks";
import type from "./type";

// Order here is the order in the settings page and the previews.
export const GROUPS = [chrome, structure, inline, metadata, tasks, type];
export const ELEMENTS = GROUPS.flatMap((g) => g.elements);
export type { Element, Group, Level, Source } from "./types";
