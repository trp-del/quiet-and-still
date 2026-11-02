// Bundle for preview.html and still.html: the same library, systems and builder
// the plugin ships, exposed as one global so static pages can use them.

import { elementBlock, tokenBlock } from "./build";
import { ELEMENTS, GROUPS } from "./library";
import { SYSTEMS } from "./systems";

const QS = {
  ELEMENTS,
  GROUPS,
  SYSTEMS,
  /** Light tokens on `selector`, dark tokens on `darkSelector`. */
  tokens: (systemId: string, selector: string, darkSelector: string) =>
    `${tokenBlock(selector, systemId, "light")}\n${tokenBlock(darkSelector, systemId, "dark")}`,
  elements: elementBlock,
};

(globalThis as unknown as { QS: typeof QS }).QS = QS;
