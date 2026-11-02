import still from "./still";
import paper from "./paper";
import spectrum from "./spectrum";
import margin from "./margin";
import signal from "./signal";
import lowlight from "./lowlight";
import shapes from "./shapes";
import mist from "./mist";

// The first system is the default.
export const SYSTEMS = [still, paper, spectrum, margin, signal, lowlight, shapes, mist];
export type { System } from "./types";
