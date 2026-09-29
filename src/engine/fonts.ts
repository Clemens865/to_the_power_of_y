import type { Rng } from './rng';
import FONT_POOL from '../data/fonts.json';

// Frozen snapshot of Google Fonts (via the Fontsource API, 2026-09-28): the original 32 display faces,
// every variable font with custom axes, and every variable display font. Frozen so seeds stay stable.
// Every URL this module builds was checked against fonts.googleapis.com when the snapshot was taken.
interface FontEntry {
  family: string;
  category: string;
  weight?: number; // static weight when the family has no wght axis
  wght?: [number, number];
  axes?: Record<string, [number, number]>;
}
const FONTS = FONT_POOL as FontEntry[];

export interface FontGene {
  family: string;
  weight: number;
  transform: 'none' | 'uppercase' | 'lowercase';
  tracking: string;
  italic: boolean;
  // Custom variation axes (e.g. SOFT, WONK, CASL, MORF, XROT), fixed per universe.
  axes: Record<string, number>;
  // One axis that slowly animates ("breathes") on the button, or null.
  pulse: { tag: string; from: number; to: number } | null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

// Google Fonts CSS2 wants axis tags lowercase-first, each group alphabetical.
export const fontUrl = (family: string): string => {
  const e = FONTS.find(f => f.family === family);
  const fam = encodeURIComponent(family);
  if (!e) return `https://fonts.googleapis.com/css2?family=${fam}&display=block`;
  const ranges: Record<string, [number, number]> = { ...(e.wght ? { wght: e.wght } : {}), ...(e.axes ?? {}) };
  const tags = Object.keys(ranges);
  if (!tags.length) return `https://fonts.googleapis.com/css2?family=${fam}:wght@${e.weight}&display=block`;
  const keys = [...tags.filter(t => t === t.toLowerCase()).sort(), ...tags.filter(t => t !== t.toLowerCase()).sort()];
  return `https://fonts.googleapis.com/css2?family=${fam}:${keys.join(',')}@${keys.map(k => `${fmt(ranges[k][0])}..${fmt(ranges[k][1])}`).join(',')}&display=block`;
};

const loaded = new Set<string>();

export const loadFont = (font: FontGene): Promise<void> => {
  if (!loaded.has(font.family)) {
    loaded.add(font.family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl(font.family);
    document.head.appendChild(link);
  }
  // Resolve once the face is ready, but never block the universe for long.
  return Promise.race([
    document.fonts.load(`${font.weight} 48px "${font.family}"`).then(() => undefined),
    new Promise<void>(r => setTimeout(r, 700))
  ]);
};

// Registered axes are the "boring" ones; custom axes are where the character lives.
const REGISTERED = new Set(['wdth', 'slnt', 'opsz']);

export const rollFont = (rng: Rng): FontGene => {
  const e = rng.pick(FONTS);
  const weight = e.wght ? Math.round(rng.range(Math.max(e.wght[0], 300), e.wght[1]) / 50) * 50 : (e.weight ?? 400);
  const axes: Record<string, number> = {};
  for (const [tag, [min, max]] of Object.entries(e.axes ?? {})) {
    // Registered axes: stay near the middle-to-top of their range; custom axes: anywhere.
    const v = REGISTERED.has(tag) ? rng.range(min + (max - min) * 0.3, max) : rng.range(min, max);
    axes[tag] = Math.round(v * 10) / 10;
  }
  const animatable = [...(e.wght && e.wght[1] - e.wght[0] >= 300 ? ['wght'] : []), ...Object.keys(e.axes ?? {}).filter(t => !REGISTERED.has(t) || t === 'wdth')];
  let pulse: FontGene['pulse'] = null;
  if (animatable.length && rng.chance(0.35)) {
    const tag = rng.pick(animatable);
    const [min, max] = tag === 'wght' ? e.wght! : e.axes![tag];
    pulse = { tag, from: Math.round(min * 10) / 10, to: Math.round(max * 10) / 10 };
  }
  return {
    family: e.family,
    weight,
    transform: rng.pick(['none', 'uppercase', 'uppercase', 'lowercase'] as const),
    tracking: rng.pick(['-0.04em', '0', '0.02em', '0.12em', '0.3em']),
    italic: rng.chance(0.12),
    axes,
    pulse
  };
};

// CSS for the font's variation settings, plus the breathing keyframes when an axis pulses.
// The pulsing axis reads a registered custom property so it can be animated smoothly.
export const fontVariationCss = (font: FontGene, selector: string): string => {
  const settings = Object.entries(font.axes).filter(([t]) => t !== font.pulse?.tag).map(([t, v]) => `"${t}" ${v}`);
  if (!font.pulse) return settings.length ? `${selector} { font-variation-settings: ${settings.join(', ')}; }` : '';
  const { tag, from, to } = font.pulse;
  const all = [...settings, `"${tag}" var(--axis-pulse)`].join(', ');
  return `@property --axis-pulse { syntax: '<number>'; inherits: true; initial-value: ${from}; }
${selector} { font-variation-settings: ${all}; animation: axis-pulse 2.8s ease-in-out infinite alternate; }
@keyframes axis-pulse { from { --axis-pulse: ${from}; } to { --axis-pulse: ${to}; } }
@media (prefers-reduced-motion: reduce) { ${selector} { animation: none; } }`;
};
