// Frictionless structure: the features from the 15:44 proposals, minus 09 (margin).
// One rule runs through them: the plugin may suggest anything, but it writes only
// when you press the accept key (Hyper by default), except paired relations, which
// you declare up front and which confirm each write with an undo.

import { refreshCaches } from "./graph";
import { clearAmbient, loadAmbient, markAmbient, watchAmbient } from "./ambient";
import { editing, nameOffer, newPageOffer, newPages, shapeOffer, shorthandOffer } from "./editing";
import { Pairs } from "./pairs";
import { clearRelations, renderRelations } from "./relations";
import { gaps, openSweep, toggleTable } from "./tables";
import { parseList } from "./text";
import { hideHint, keyLabel, showHint, showTally, watchAccept, type AcceptKey } from "./ui";

export interface StructureSettings {
  st_accept?: AcceptKey;
  st_pairs?: string;
  st_relations?: boolean;
  st_names?: boolean;
  st_shorthand?: boolean;
  st_aliases?: string;
  st_shape?: boolean;
  st_repeat?: string;
  st_newpage?: boolean;
  st_ambient?: string;
  st_sweep?: boolean;
}

export interface Offer {
  source: string;
  /** Higher wins when two want the line at once. */
  priority: number;
  html: string;
  /** What the accept key does, after "<key>": "to set it". */
  verb: string;
  accept: () => Promise<void>;
  anchor?: Element | null;
  /** Clears itself after this many ms. */
  ttl?: number;
}

export interface Structure {
  stop(): void;
  checkPairs(): void;
  sweep(): void;
  table(): void;
  configure(): void;
}

export function startStructure(doc: Document, settings: () => StructureSettings): Structure {
  const offers = new Map<string, Offer>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const key = () => settings().st_accept ?? "Hyper";

  const render = () => {
    const top = [...offers.values()].sort((a, b) => b.priority - a.priority)[0];
    if (!top || key() === "off") return hideHint(doc);
    showHint(doc, top.anchor ?? null, `${top.html} · <kbd>${keyLabel(key())}</kbd> ${top.verb}`);
  };
  const offer = (source: string, o: Offer | null) => {
    clearTimeout(timers.get(source));
    if (o) {
      offers.set(source, o);
      if (o.ttl) timers.set(source, setTimeout(() => { offers.delete(source); render(); }, o.ttl));
    } else offers.delete(source);
    render();
  };
  const accept = () => {
    const top = [...offers.values()].sort((a, b) => b.priority - a.priority)[0];
    if (!top) return false;
    offers.delete(top.source);
    render();
    top.accept().catch((e) => {
      console.error("[quiet-and-still]", e);
      logseq.UI.showMsg(`Quiet & Still: couldn't do that. ${e?.message ?? ""}`, "warning");
    });
    return true;
  };

  const pairs = new Pairs((o) => offer("pairs", o));

  // Links in the relations section: pages open in place, blocks in the right sidebar.
  logseq.provideModel({
    qsOpen: (e: { dataset: { page: string } }) => logseq.App.pushState("page", { name: e.dataset.page }),
    qsOpenBlock: (e: { dataset: { uuid: string } }) => logseq.Editor.openInRightSidebar(e.dataset.uuid),
  });

  // ── While you write ──────────────────────────────────────────────────────────
  let typing: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  const onEditor = () => {
    clearTimeout(typing);
    typing = setTimeout(async () => {
      const me = ++run, s = settings(), e = editing(doc);
      const set = (source: string, o: Offer | null) => { if (me === run) offer(source, o); };
      if (!e) return ["names", "shorthand", "shape"].forEach((x) => set(x, null));
      set("names", s.st_names === false ? null : nameOffer(e));
      set("shorthand", s.st_shorthand === false ? null : await shorthandOffer(e, s));
      set("shape", s.st_shape === false ? null : await shapeOffer(e, s));
    }, 300);
  };
  const onBlur = () => setTimeout(() => { if (!editing(doc)) onEditor(); }, 150);
  doc.addEventListener("input", onEditor, true);
  doc.addEventListener("focusin", onEditor, true);
  doc.addEventListener("focusout", onBlur, true);
  doc.addEventListener("selectionchange", onEditor);

  // ── The page you're on ───────────────────────────────────────────────────────
  let page: number | null = null;
  const refreshPage = async () => {
    const s = settings();
    const cur = await logseq.Editor.getCurrentPage();
    page = cur && "name" in cur && cur.name ? cur.id : null;
    if (!page) { clearRelations(); clearAmbient(); markAmbient(doc); showTally(doc, 0, () => {}); return; }
    const ambient = parseList(s.st_ambient ?? "");
    await loadAmbient(page, ambient);
    markAmbient(doc);
    if (s.st_relations !== false) await renderRelations(page, pairs.isPaired, ambient); else clearRelations();
    showTally(doc, s.st_sweep === false ? 0 : (await gaps(page)).length, () => page && openSweep(doc, page));
  };
  let pageTimer: ReturnType<typeof setTimeout> | undefined;
  const refreshSoon = (ms = 500) => { clearTimeout(pageTimer); pageTimer = setTimeout(refreshPage, ms); };

  // ── When the graph changes ───────────────────────────────────────────────────
  let cacheTimer: ReturnType<typeof setTimeout> | undefined;
  const offDb = logseq.DB.onChanged(() => {
    pairs.nudge();
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(async () => {
      const since = Date.now() - 15000;
      await refreshCaches();
      const e = editing(doc);
      if (e && settings().st_newpage !== false) {
        for (const [id, title, uuid] of await newPages(since)) {
          const o = await newPageOffer(doc, e, { id, uuid: String(uuid), title });
          if (o) { offer("newpage", o); break; }
        }
      }
    }, 600);
    refreshSoon(800);
  });
  const offRoute = logseq.App.onRouteChanged(() => { pairs.nudge(); refreshSoon(400); });
  // Page property edits fire no change event, so pairs also check on a slow tick.
  const tick = setInterval(() => { if (doc.visibilityState === "visible") pairs.nudge(); }, 5000);

  const stopAccept = watchAccept(doc, key, accept);
  const stopAmbient = watchAmbient(doc);

  const configure = async () => {
    await refreshCaches();
    await pairs.configure(settings().st_pairs ?? "");
    refreshSoon(0);
  };
  configure();

  return {
    configure,
    checkPairs: () => pairs.check(),
    sweep: () => (page ? openSweep(doc, page) : logseq.UI.showMsg("Quiet & Still: open a page to sweep it.")),
    table: () => toggleTable(doc, parseList(settings().st_ambient ?? "")),
    stop() {
      doc.removeEventListener("input", onEditor, true);
      doc.removeEventListener("focusin", onEditor, true);
      doc.removeEventListener("focusout", onBlur, true);
      doc.removeEventListener("selectionchange", onEditor);
      clearTimeout(typing); clearTimeout(pageTimer); clearTimeout(cacheTimer); clearInterval(tick);
      timers.forEach(clearTimeout);
      (offDb as unknown as (() => void) | undefined)?.();
      (offRoute as unknown as (() => void) | undefined)?.();
      stopAccept();
      stopAmbient();
      clearRelations();
      hideHint(doc);
      showTally(doc, 0, () => {});
      for (const id of ["qs-sweep", "qs-table", "qs-fields"]) doc.getElementById(id)?.dispatchEvent(new Event("qs-close"));
    },
  };
}
