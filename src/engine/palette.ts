import type { Rng } from './rng';

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

export const rollPalette = (rng: Rng): Palette => {
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
