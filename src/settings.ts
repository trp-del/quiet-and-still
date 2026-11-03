import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { ELEMENTS, GROUPS } from "./library";
import { SYSTEMS } from "./systems";

export interface Settings {
  enabled: boolean;
  system: string;
  floor: boolean;
  peekKey: "Alt" | "Control" | "off";
  st_accept: "Hyper" | "Ctrl+Shift+Enter" | "off";
  st_pairs: string;
  st_relations: boolean;
  st_names: boolean;
  st_shorthand: boolean;
  st_aliases: string;
  st_shape: boolean;
  st_repeat: string;
  st_newpage: boolean;
  st_ambient: string;
  st_sweep: boolean;
  [elementKey: `el_${string}`]: boolean | undefined;
}

export const elementKey = (id: string) => `el_${id.replace(/[.-]/g, "_")}` as const;

export function schema(): SettingSchemaDesc[] {
  const items: SettingSchemaDesc[] = [
    {
      key: "enabled", type: "boolean", default: true,
      title: "Quiet & Still on",
      description: "Turn every style off without uninstalling. Also in the command palette.",
    },
    {
      key: "system", type: "enum", enumPicker: "select", default: SYSTEMS[0].id,
      enumChoices: SYSTEMS.map((s) => s.id),
      title: "Design system",
      description: SYSTEMS.map((s) => `${s.id}: ${s.name}. ${s.idea}`).join("\n"),
    },
    {
      key: "floor", type: "boolean", default: true,
      title: "Keep faded chrome findable",
      description: "Never fade whisper-level chrome below 1.5:1 contrast, so you can always see it exists.",
    },
    {
      key: "peekKey", type: "enum", enumPicker: "select", default: "Alt",
      enumChoices: ["Alt", "Control", "off"],
      title: "Peek key",
      description: "Hold this key on its own to see everything at full volume. Alt is ⌥ on a Mac.",
    },
  ];
  for (const g of GROUPS) {
    items.push({ key: `heading_${g.name.toLowerCase()}`, type: "heading", title: g.name, description: "", default: null });
    for (const el of g.elements) {
      items.push({
        key: elementKey(el.id), type: "boolean", default: el.on,
        title: el.label,
        description: `${el.level}${el.source === "live" ? " · selector not yet confirmed in a live graph" : ""}`,
      });
    }
  }
  items.push(...STRUCTURE);
  return items;
}

// Structure: suggestions appear as one quiet line under the block you're writing;
// nothing is written to the graph until you press the accept key.
const STRUCTURE: SettingSchemaDesc[] = [
  {
    key: "heading_frictionless", type: "heading", title: "Structure around your writing", default: null,
    description: "Structure that forms around your writing. Suggestions show as one quiet line under the block; nothing is written until you press the accept key.",
  },
  {
    key: "st_accept", type: "enum", enumPicker: "select", default: "Hyper",
    enumChoices: ["Hyper", "Ctrl+Shift+Enter", "off"],
    title: "Accept key",
    description: "Hyper is ⌃⌥⇧⌘ pressed together (often Caps Lock remapped), then released with no other key. Tab can't be used: it indents.",
  },
  {
    key: "st_pairs", type: "string", default: "",
    title: "Paired properties",
    description: "Node properties that are two ends of one relation, separated by ;. Example: Treated by <-> Treats; Part of <-> Has part; Related. Setting one end writes the other.",
  },
  {
    key: "st_relations", type: "boolean", default: true,
    title: "Relations above linked references",
    description: "Group what links to a page by the property that links it, then tags, then a count of plain mentions.",
  },
  {
    key: "st_names", type: "boolean", default: true,
    title: "One name, one node",
    description: "While typing [[a name]], suggest the existing page it probably means.",
  },
  {
    key: "st_shorthand", type: "boolean", default: true,
    title: "Shorthand",
    description: "Suggest properties from words like \"due Friday\" or \"project Fatigue\". The words stay in the block.",
  },
  {
    key: "st_aliases", type: "string", default: "",
    title: "Shorthand aliases",
    description: "Short words for property names, separated by ;. Example: for = Project; by = Due",
  },
  {
    key: "st_shape", type: "boolean", default: true,
    title: "Repeat the last block's shape",
    description: "On an empty block after a tagged one, suggest the same tags.",
  },
  {
    key: "st_repeat", type: "string", default: "",
    title: "Values to repeat",
    description: "Properties whose values copy along with the shape, separated by commas. Example: Project, Medication",
  },
  {
    key: "st_newpage", type: "boolean", default: true,
    title: "Fill new pages in place",
    description: "When a block with a tag links a page that was just created, suggest giving the page that tag and fill its fields there.",
  },
  {
    key: "st_ambient", type: "string", default: "",
    title: "Ambient properties",
    description: "Properties that carry from a block to everything under it, separated by commas. Example: Project",
  },
  {
    key: "st_sweep", type: "boolean", default: true,
    title: "Fill-later count",
    description: "Show how many tag fields on the page are empty, and open them as one table.",
  },
];

/** Element ids switched on, falling back to each element's default. */
export const enabledElements = (s: Partial<Settings>) =>
  ELEMENTS.filter((el) => s[elementKey(el.id)] ?? el.on).map((el) => el.id);
