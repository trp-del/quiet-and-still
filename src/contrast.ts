// The findability floor (RULES.md rule 2): whisper may fade chrome, but never so far
// that you can't see it exists. Measured as WCAG contrast of faded ink over the page.

type RGB = readonly [number, number, number];
export interface Palette { bg: RGB; ink: RGB }

/** Minimum contrast for whisper-level chrome. Below this it reads as removed. */
export const FLOOR = 1.5;

/** Logseq's default neutrals (Radix gray 1 and 12), which --lx-gray-12 resolves to. */
export const REFERENCE: Record<"light" | "dark", Palette> = {
  light: { bg: [252, 252, 252], ink: [32, 32, 32] },
  dark: { bg: [17, 17, 17], ink: [238, 238, 238] },
};

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast of ink faded to `opacity` over the background. */
export const fadedContrast = ({ bg, ink }: Palette, opacity: number) =>
  contrast(bg.map((c, i) => c * (1 - opacity) + ink[i] * opacity) as unknown as RGB, bg);

/** Smallest opacity, in hundredths, at which faded ink reaches the floor. */
export function minOpacity(p: Palette, floor = FLOOR): number {
  for (let pct = 0; pct <= 100; pct++) if (fadedContrast(p, pct / 100) >= floor) return pct / 100;
  return 1;
}
