import type { Rng } from '../../engine/rng';
import type { Palette } from '../../engine/palette';

// Palette-mapped options for Vanta.js effects (MIT). Colours are 0xRRGGBB numbers, as Vanta expects.
// Not included: topology/trunk (need p5), clouds2 (needs a texture), birds (GPGPU flocking — too heavy for the budget),
// halo (checked on r186: its feedback render targets use the removed THREE.RGBFormat and the image blows out to a
// yellow/white smear whatever colours it gets, on dark and light palettes alike).
export const VANTA_EFFECTS = ['fog', 'cells', 'ripple', 'clouds', 'waves', 'net', 'dots', 'rings', 'globe'] as const;
export type VantaEffectName = (typeof VANTA_EFFECTS)[number];

const r2 = (n: number) => Math.round(n * 100) / 100;
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const num = (hex: string) => parseInt(hex.slice(1, 7), 16);
const mix = (a: string, b: string, t: number) => {
  const ca = rgb(a);
  const cb = rgb(b);
  return num('#' + ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, '0')).join(''));
};

export const vantaOptions = (effect: VantaEffectName, r: Rng, p: Palette): Record<string, unknown> => {
  const bg = num(p.bg);
  switch (effect) {
    case 'fog':
      return { highlightColor: num(p.accent3), midtoneColor: num(p.accent), lowlightColor: num(p.accent2), baseColor: bg, blurFactor: r2(r.range(0.45, 0.7)), speed: r2(r.range(0.6, 1.4)), zoom: r2(r.range(0.6, 1.2)) };
    case 'cells':
      return { color1: mix(p.bg, p.accent, 0.35), color2: num(p.accent2), backgroundColor: bg, size: r2(r.range(1, 3)), speed: r2(r.range(0.6, 1.6)) };
    case 'ripple':
      return { color1: num(p.accent), color2: num(p.accent2), backgroundColor: bg, amplitudeFactor: r2(r.range(0.6, 1.4)), ringFactor: r2(r.range(2, 6)), rotationFactor: r2(r.range(0.05, 0.4)), speed: r2(r.range(0.6, 1.4)) };
    case 'clouds':
      return { backgroundColor: bg, skyColor: mix(p.bg, p.accent, 0.6), cloudColor: mix(p.fg, p.accent2, 0.35), cloudShadowColor: mix(p.bg, '#000000', 0.4), sunColor: num(p.accent3), sunGlareColor: num(p.accent2), sunlightColor: mix(p.accent3, '#ffffff', 0.3), speed: r2(r.range(0.6, 1.4)) };
    case 'waves':
      return { color: mix(p.bg, p.accent, 0.55), backgroundColor: bg, shininess: r.int(20, 60), waveHeight: r.int(10, 25), waveSpeed: r2(r.range(0.5, 1.2)), zoom: r2(r.range(0.75, 1.1)) };
    case 'net':
      return { color: num(p.accent), backgroundColor: bg, points: r.int(7, 12), maxDistance: r.int(16, 24), spacing: r.int(14, 20), showDots: r.chance(0.7) };
    case 'dots':
      return { color: num(p.accent), color2: num(p.accent2), backgroundColor: bg, size: r2(r.range(2, 4)), spacing: r.int(25, 45), showLines: r.chance(0.5) };
    case 'rings':
      // Rings picks from a hard-coded rainbow; VantaBg repaints the ring meshes with these instead.
      return { color: num(p.accent), backgroundColor: bg, ringColors: [p.accent, p.accent2, p.accent3, mix(p.accent, p.accent2, 0.5), mix(p.bg, p.accent, 0.5)].map(c => (typeof c === 'number' ? c : num(c))) };
    case 'globe':
      return { color: num(p.accent), color2: num(p.accent2), backgroundColor: bg, size: r2(r.range(0.8, 1.3)), points: r.int(8, 12), maxDistance: r.int(16, 22), spacing: r.int(14, 18), showDots: r.chance(0.7) };
  }
};
