// Pure text helpers for the structure features: names, pairs, shorthand phrases and
// dates. Nothing here touches the Logseq API, so the tests run it directly.

/** A name reduced to letters and digits, lower-case, accents dropped: "Dr. Mei Chen" → "drmeichen". */
export const normName = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

export function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** "M. Chen" or "M Chen" for "Mei Chen": same last word, and each earlier word is an initial or the whole word. */
function initialsMatch(typed: string, title: string) {
  const t = words(typed), n = words(title);
  if (t.length < 2 || t.length !== n.length || t.at(-1) !== n.at(-1)) return false;
  return t.slice(0, -1).every((w, i) => w === n[i] || (w.length === 1 && n[i].startsWith(w))) && t.some((w) => w.length === 1);
}

/**
 * Existing titles the typed name probably means, best first. Empty when the name
 * already exists, since Logseq names are case-insensitive and it will link that one.
 */
export function nearMatches(typed: string, titles: string[], max = 2): string[] {
  const t = typed.trim();
  if (t.length < 3 || titles.some((x) => x.toLowerCase() === t.toLowerCase())) return [];
  const k = normName(t);
  const scored: [number, string][] = [];
  for (const title of titles) {
    const n = normName(title);
    if (!n) continue;
    const d = k.length >= 5 && Math.abs(n.length - k.length) <= 2 ? editDistance(n, k) : Infinity;
    if (n === k) scored.push([0, title]);
    else if (d <= (k.length >= 9 ? 2 : 1)) scored.push([d, title]);
    else if (initialsMatch(t, title)) scored.push([3, title]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, max).map(([, title]) => title);
}

/** Why a near match matched, in a few words, for the hint. */
export function matchReason(typed: string, title: string) {
  if (normName(typed) === normName(title)) return "same name, different punctuation or case";
  if (initialsMatch(typed, title)) return "same name, with initials";
  return "one or two letters apart";
}

// ── Settings text ──────────────────────────────────────────────────────────────

export interface Pair { a: string; b: string }

/** "Treated by <-> Treats; Part of ↔ Has part; Related" → pairs. A name alone pairs with itself. */
export function parsePairs(text: string): Pair[] {
  return (text ?? "").split(/[;\n]+/).map((chunk) => {
    const [a, b] = chunk.split(/\s*(?:<->|<=>|↔|⇄)\s*/).map((s) => s.trim());
    return a ? { a, b: b || a } : null;
  }).filter((p): p is Pair => p !== null);
}

/** "Project, Area" → ["project", "area"]. */
export const parseList = (text: string) =>
  (text ?? "").split(/[,;\n]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);

/** "for = Project; by = Due" → Map { "for" → "project", "by" → "due" }. */
export function parseAliases(text: string) {
  const map = new Map<string, string>();
  for (const chunk of (text ?? "").split(/[;,\n]+/)) {
    const [alias, name] = chunk.split("=").map((s) => s.trim().toLowerCase());
    if (alias && name) map.set(alias, name);
  }
  return map;
}

// ── Dates ──────────────────────────────────────────────────────────────────────

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const dayIndex = (w: string) => DAYS.findIndex((d) => w.length >= 3 && d.startsWith(w));
const monthIndex = (w: string) => MONTHS.findIndex((m) => w.length >= 3 && m.startsWith(w));
const atDay = (d: Date, add = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);

export interface DateHit { date: Date; length: number }

/**
 * A date phrase at the start of `s`, relative to `today`: today, tomorrow, yesterday,
 * a weekday (the next one, today included; "next" skips a week), "in 3 days", "in 2 weeks",
 * "Nov 6", "6 Nov", "November 6th", or 2026-11-06. Null when `s` doesn't start with one.
 */
export function parseDatePhrase(s: string, today: Date): DateHit | null {
  const end = (m: RegExpMatchArray) => m[0].length;
  let m = s.match(/^(today|tomorrow|yesterday)(?![\p{L}\p{N}])/iu);
  if (m) return { date: atDay(today, { today: 0, tomorrow: 1, yesterday: -1 }[m[1].toLowerCase() as "today"]), length: end(m) };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?![\p{N}])/u);
  if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), length: end(m) };
  m = s.match(/^in\s+(\d{1,3})\s+(day|week)s?(?![\p{L}])/iu);
  if (m) return { date: atDay(today, +m[1] * (m[2].toLowerCase() === "week" ? 7 : 1)), length: end(m) };
  m = s.match(/^(next\s+)?([a-z]{3,9})(?![\p{L}])/iu);
  if (m && dayIndex(m[2].toLowerCase()) >= 0) {
    let add = (dayIndex(m[2].toLowerCase()) - today.getDay() + 7) % 7;
    if (m[1]) add += 7;
    return { date: atDay(today, add), length: end(m) };
  }
  const yearAfter = (mo: number, d: number) => {
    const thisYear = new Date(today.getFullYear(), mo, d);
    return thisYear < atDay(today, -60) ? new Date(today.getFullYear() + 1, mo, d) : thisYear;
  };
  m = s.match(/^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?![\p{L}\p{N}])/iu);
  if (m && monthIndex(m[1].toLowerCase()) >= 0 && +m[2] >= 1 && +m[2] <= 31) {
    const mo = monthIndex(m[1].toLowerCase());
    return { date: m[3] ? new Date(+m[3], mo, +m[2]) : yearAfter(mo, +m[2]), length: end(m) };
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?(?![\p{L}\p{N}])/iu);
  if (m && monthIndex(m[2].toLowerCase()) >= 0 && +m[1] >= 1 && +m[1] <= 31) {
    const mo = monthIndex(m[2].toLowerCase());
    return { date: m[3] ? new Date(+m[3], mo, +m[1]) : yearAfter(mo, +m[1]), length: end(m) };
  }
  return null;
}

/** Logseq's journal-day number for a date: 2026-11-06 → 20261106. */
export const journalDay = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/** "Fri, Nov 6", for hints. */
export const showDate = (d: Date) =>
  `${DAYS[d.getDay()].slice(0, 1).toUpperCase()}${DAYS[d.getDay()].slice(1, 3)}, ${MONTHS[d.getMonth()].slice(0, 1).toUpperCase()}${MONTHS[d.getMonth()].slice(1, 3)} ${d.getDate()}`;

// ── Shorthand ──────────────────────────────────────────────────────────────────
// "due Friday", "for Fatigue", "severity 3": a property name (or alias) followed by a
// value that resolves for that property's type. No colon. Only typed values resolve
// (dates, existing pages, numbers), so ordinary prose rarely matches; and nothing is
// written until the accept key is pressed.

export interface ShorthandProp { name: string; title: string; type: string }
export type Value =
  | { kind: "date"; date: Date }
  | { kind: "node"; title: string }
  | { kind: "number"; n: number };
export interface Shorthand { prop: ShorthandProp; start: number; end: number; value: Value; show: string }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Index ranges inside [[…]] so a page name like [[Due Process]] is never read as shorthand. */
function insideRefs(text: string) {
  const ranges: [number, number][] = [];
  for (const m of text.matchAll(/\[\[[^\]]*\]\]/g)) ranges.push([m.index!, m.index! + m[0].length]);
  return (i: number) => ranges.some(([a, b]) => i > a && i < b);
}

/**
 * Finds shorthand phrases in `text`. `pageAt` returns the existing page title that the
 * text starts with (longest match), or null. One phrase per property, the first one.
 */
export function findShorthand(
  text: string,
  props: ShorthandProp[],
  pageAt: (s: string) => string | null,
  today: Date,
): Shorthand[] {
  const found: Shorthand[] = [];
  const inRef = insideRefs(text);
  const taken = (a: number, b: number) => found.some((f) => a < f.end && b > f.start);
  const byLength = [...props].sort((x, y) => y.name.length - x.name.length);
  for (const prop of byLength) {
    if (found.some((f) => f.prop.title === prop.title)) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(prop.name)}\\s+`, "giu");
    for (const m of text.matchAll(re)) {
      const start = m.index!, at = start + m[0].length, rest = text.slice(at);
      if (inRef(start)) continue;
      let value: Value | null = null, length = 0, show = "";
      if (prop.type === "date" || prop.type === "datetime") {
        const hit = parseDatePhrase(rest, today);
        if (hit) { value = { kind: "date", date: hit.date }; length = hit.length; show = showDate(hit.date); }
      } else if (prop.type === "node") {
        const ref = rest.match(/^\[\[([^\]]+)\]\]/);
        const title = ref ? ref[1] : pageAt(rest);
        if (title) { value = { kind: "node", title }; length = ref ? ref[0].length : title.length; show = title; }
      } else if (prop.type === "number") {
        const n = rest.match(/^-?\d+(?:\.\d+)?(?![\p{L}\p{N}])/u);
        if (n) { value = { kind: "number", n: +n[0] }; length = n[0].length; show = n[0]; }
      }
      if (!value || taken(start, at + length)) continue;
      found.push({ prop, start, end: at + length, value, show });
      break;
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** The longest run of up to six words at the start of `s` that names a page, case-insensitive. */
export function pageAtStart(s: string, names: Map<string, string>) {
  const ws = [...s.matchAll(/[^\s]+/g)].slice(0, 6);
  for (let n = ws.length; n > 0; n--) {
    const last = ws[n - 1];
    const phrase = s.slice(0, last.index! + last[0].length).replace(/[.,;:!?)]+$/, "");
    const title = names.get(phrase.toLowerCase());
    if (title) return title;
  }
  return null;
}

/** Parses a typed cell value for a property type; null when it doesn't fit. */
export function parseTyped(text: string, type: string, names: Map<string, string>, today: Date):
  { kind: "date"; date: Date } | { kind: "node"; title: string } | { kind: "number"; n: number }
  | { kind: "checkbox"; b: boolean } | { kind: "text"; s: string } | null {
  const t = text.trim();
  if (!t) return null;
  if (type === "date" || type === "datetime") {
    const hit = parseDatePhrase(t, today);
    return hit && hit.length === t.length ? { kind: "date", date: hit.date } : null;
  }
  if (type === "node") {
    const title = names.get(t.replace(/^\[\[|\]\]$/g, "").toLowerCase());
    return title ? { kind: "node", title } : null;
  }
  if (type === "number") return /^-?\d+(\.\d+)?$/.test(t) ? { kind: "number", n: +t } : null;
  if (type === "checkbox") return /^(y|yes|true|x|1|on)$/i.test(t) ? { kind: "checkbox", b: true } : /^(n|no|false|0|off)$/i.test(t) ? { kind: "checkbox", b: false } : null;
  return { kind: "text", s: t };
}

/** Why a typed cell was refused, in the reader's terms. */
export function notValue(text: string, prop: { title: string; type: string }) {
  if (prop.type === "node") return `No page named "${text}". ${prop.title} links to a page.`;
  if (prop.type === "date" || prop.type === "datetime") return `"${text}" isn't a date. Try Friday, Nov 6 or 2026-11-06.`;
  if (prop.type === "number") return `${prop.title} takes a number.`;
  if (prop.type === "checkbox") return `${prop.title} takes yes or no.`;
  return `"${text}" doesn't fit ${prop.title}.`;
}

export const escapeHtml = (s: string) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
