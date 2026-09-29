import { useMode, modeOklch, modeRgb, modeLrgb, formatHex, wcagContrast, clampChroma, type Oklch } from 'culori/fn';
import { Poline, positionFunctions } from 'poline';
import curated from 'nice-color-palettes/1000.json';
import type { Rng } from './rng';

// culori/fn is tree-shaken: register every colour space we touch (lrgb is needed for WCAG contrast).
const toOklch = useMode(modeOklch);
useMode(modeRgb);
useMode(modeLrgb);

export interface Palette {
  mood: string;
  isLight: boolean;
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  accent3: string;
  hue: number;
}

const hsl = (h: number, s: number, l: number): string => {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
};

export const hexToRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const HARMONIES: Record<string, number[]> = {
  analogous: [0, 30, 60],
  complementary: [0, 180, 20],
  triadic: [0, 120, 240],
  split: [0, 150, 210],
  mono: [0, 0, 0]
};

const rollMood = (rng: Rng): Palette => {
  const hue = rng.int(0, 359);
  const harmonyName = rng.pick(Object.keys(HARMONIES));
  const [h1, h2, h3] = HARMONIES[harmonyName].map(o => hue + o);
  const mood = rng.pick(['void', 'neon', 'paper', 'pastel', 'acid', 'noir', 'sunset'] as const);

  switch (mood) {
    case 'paper':
      return { mood, isLight: true, hue, bg: hsl(h1, 25, 93), fg: hsl(h1, 30, 10), accent: hsl(h1, 75, 48), accent2: hsl(h2, 70, 52), accent3: hsl(h3, 65, 45) };
    case 'pastel':
      return { mood, isLight: true, hue, bg: hsl(h1, 70, 88), fg: hsl(h2, 45, 20), accent: hsl(h1, 80, 70), accent2: hsl(h2, 75, 75), accent3: hsl(h3, 70, 72) };
    case 'acid':
      return { mood, isLight: true, hue, bg: hsl(h1, 95, 60), fg: hsl(h2, 90, 12), accent: hsl(h2, 100, 50), accent2: hsl(h3, 100, 60), accent3: hsl(h1, 100, 30) };
    case 'neon':
      return { mood, isLight: false, hue, bg: hsl(h1, 60, 5), fg: hsl(h1, 100, 92), accent: hsl(h1, 100, 60), accent2: hsl(h2, 100, 60), accent3: hsl(h3, 100, 65) };
    case 'noir':
      return { mood, isLight: false, hue, bg: '#050505', fg: '#f4f4f0', accent: hsl(h1, 85, 55), accent2: '#9a9a9a', accent3: '#ffffff' };
    case 'sunset':
      return { mood, isLight: false, hue, bg: hsl(h1 + 250, 50, 10), fg: hsl(40, 100, 92), accent: hsl(15, 95, 60), accent2: hsl(330, 85, 60), accent3: hsl(45, 100, 60) };
    default:
      return { mood, isLight: false, hue, bg: hsl(h1, 30, 8), fg: hsl(h1, 20, 94), accent: hsl(h1, 70, 62), accent2: hsl(h2, 70, 62), accent3: hsl(h3, 60, 70) };
  }
};

// ---------- v0.3: three palette sources + a readability guard ----------

const oklchHex = (l: number, c: number, h: number) => formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch'))!;
const lightness = (hex: string) => toOklch(hex)!.l;
const hueOf = (hex: string) => Math.round(toOklch(hex)!.h ?? 0);

// Pull a colour's OKLCH lightness away from `against` until it reaches the contrast target.
const ensureContrast = (hex: string, against: string, target: number): string => {
  if (wcagContrast(hex, against) >= target) return hex;
  const c = toOklch(hex) as Oklch;
  const goLighter = lightness(against) < 0.6;
  for (let i = 1; i <= 20; i++) {
    const l = goLighter ? Math.min(1, c.l + i * 0.04) : Math.max(0, c.l - i * 0.04);
    const next = oklchHex(l, c.c, c.h ?? 0);
    if (wcagContrast(next, against) >= target) return next;
  }
  // Mid-tone backgrounds: neither direction reached the target, so take the stronger extreme.
  return wcagContrast('#ffffff', against) >= wcagContrast('#000000', against) ? '#ffffff' : '#000000';
};

// Normalise any five colours into a Palette: pick bg by lightness, then guard readability.
const fromColors = (rng: Rng, mood: string, colors: string[], darkBg: boolean): Palette => {
  const sorted = [...colors].sort((a, b) => lightness(a) - lightness(b));
  const bg = darkBg ? sorted[0] : sorted[sorted.length - 1];
  const rest = sorted.filter(c => c !== bg);
  const byContrast = [...rest].sort((a, b) => wcagContrast(b, bg) - wcagContrast(a, bg));
  const fg = ensureContrast(byContrast[0], bg, 7);
  const accents = rest.filter(c => c !== byContrast[0]);
  while (accents.length < 3) accents.push(rng.pick(rest));
  const [a1, a2, a3] = accents.map(a => ensureContrast(a, bg, 2.2));
  return { mood, isLight: !darkBg, bg, fg, accent: a1, accent2: a2, accent3: a3, hue: hueOf(a1) };
};

// poline: interpolate between 2–3 seeded anchor colours along a random easing curve.
const rollPoline = (rng: Rng): Palette => {
  const anchors = Array.from({ length: rng.int(2, 3) }, () => [rng.range(0, 360), rng.range(0.3, 1), rng.range(0.1, 0.9)] as [number, number, number]);
  const easing = rng.pick(Object.values(positionFunctions));
  const poline = new Poline({ anchorColors: anchors, numPoints: 3, positionFunction: easing, closedLoop: rng.chance(0.3) });
  // poline.colors are [hue 0–360, saturation 0–1, lightness 0–1]
  const colors = poline.colors.map(([h, sat, l]) => hsl(h, sat * 100, l * 100));
  const picks = Array.from({ length: 5 }, (_, i) => colors[Math.floor((i / 5) * colors.length)]);
  return fromColors(rng, 'poline', picks, rng.chance(0.6));
};

// Human-made palettes (nice-color-palettes, from COLOURlovers, CC BY-NC-SA 3.0 — credited in the README).
const rollCurated = (rng: Rng): Palette => fromColors(rng, 'curated', rng.pick(curated as string[][]), rng.chance(0.55));

// OKLCH generation: perceptually even lightness steps around a seeded hue.
const rollOklch = (rng: Rng): Palette => {
  const h = rng.range(0, 360);
  const spread = rng.pick([30, 120, 150, 180]);
  const dark = rng.chance(0.6);
  const chroma = rng.range(0.08, 0.22);
  const bg = dark ? oklchHex(rng.range(0.12, 0.22), chroma * 0.4, h) : oklchHex(rng.range(0.93, 0.98), chroma * 0.2, h);
  const colors = [bg, oklchHex(dark ? 0.95 : 0.2, 0.03, h), oklchHex(0.68, chroma, h + spread), oklchHex(0.62, chroma, h - spread), oklchHex(0.78, chroma * 0.8, h + spread * 2)];
  return fromColors(rng, 'oklch', colors, dark);
};

export const rollPalette = (rng: Rng): Palette => {
  const source = rng.next();
  if (source < 0.3) {
    // The hand-made moods keep their character, but get the same readability floor.
    const m = rollMood(rng);
    return { ...m, fg: ensureContrast(m.fg, m.bg, 4.5), accent: ensureContrast(m.accent, m.bg, 2), accent2: ensureContrast(m.accent2, m.bg, 2), accent3: ensureContrast(m.accent3, m.bg, 2) };
  }
  if (source < 0.55) return rollCurated(rng);
  if (source < 0.8) return rollOklch(rng);
  return rollPoline(rng);
};
