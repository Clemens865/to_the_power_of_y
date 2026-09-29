import { colornames } from 'color-name-list/bestof';

// Every universe gets a title: the nearest named colour to its accent, plus a number from the seed.
// Colour names: color-name-list "best of" (MIT, https://github.com/meodai/color-names).
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const NAMES = colornames.map(c => ({ name: c.name, rgb: rgb(c.hex) }));

export const universeName = (accent: string, seed: string): string => {
  const [r, g, b] = rgb(accent);
  let best = NAMES[0];
  let bestD = Infinity;
  for (const c of NAMES) {
    // Weighted RGB distance ("redmean"), good enough for naming.
    const rm = (r + c.rgb[0]) / 2;
    const d = (2 + rm / 256) * (r - c.rgb[0]) ** 2 + 4 * (g - c.rgb[1]) ** 2 + (2 + (255 - rm) / 256) * (b - c.rgb[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  // FNV-1a over the whole seed, so every character counts.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return `${best.name} no. ${(h % 10000).toString().padStart(4, '0')}`;
};
