import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { ELEMENTS, GROUPS } from "./library";
import { SYSTEMS } from "./systems";

export interface Settings {
  enabled: boolean;
  system: string;
  floor: boolean;
  peekKey: "Alt" | "Control" | "off";
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
  return items;
}

/** Element ids switched on, falling back to each element's default. */
export const enabledElements = (s: Partial<Settings>) =>
  ELEMENTS.filter((el) => s[elementKey(el.id)] ?? el.on).map((el) => el.id);
