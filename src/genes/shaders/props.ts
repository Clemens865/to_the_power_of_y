import type { Rng } from '../../engine/rng';
import { hexToRgb01, type Palette } from '../../engine/palette';

// xʸ original shader pack: ids and the (rng, palette) → props mapping.
// Kept free of GLSL and component source so the background registry can import it cheaply;
// the export-kit generator lives in ./index.ts (only the lazily loaded kit imports it).

type Range = [number, number];
type Colors = [string, string, string, string];
interface ShaderSpec {
  speed: Range;
  params: [Range, Range, Range, Range];
  /** 'ink' shaders draw thin lines/dots and need extra contrast on light palettes. */
  ink?: boolean;
}

const U: Range = [0, 1];
const SPECS: Record<string, ShaderSpec> = {
  marble: { speed: [0.5, 1.2], params: [[0.1, 0.8], [0.3, 1], U, U] },
  topo: { speed: [0.6, 1.4], params: [[0.1, 0.9], [0.1, 0.7], [0.2, 0.8], U], ink: true },
  truchet: { speed: [0.6, 1.4], params: [[0.1, 0.8], [0.1, 0.7], U, U], ink: true },
  kaleido: { speed: [0.5, 1.3], params: [U, [0.1, 0.8], U, [0.2, 1]] },
  moire: { speed: [0.6, 1.5], params: [[0.1, 0.8], U, U, U], ink: true },
  hexpulse: { speed: [0.6, 1.3], params: [[0.1, 0.8], [0.1, 0.8], U, U] },
  metaballs: { speed: [0.6, 1.4], params: [[0.3, 1], U, U, U] },
  tunnel: { speed: [0.5, 1.2], params: [U, U, U, [0.2, 1]] },
  liquid: { speed: [0.5, 1.3], params: [[0.1, 0.8], [0.2, 1], [0.2, 1], U] },
  led: { speed: [0.6, 1.3], params: [[0.1, 0.7], U, U, U], ink: true },
  glass: { speed: [0.6, 1.4], params: [[0.1, 0.7], [0.1, 0.6], U, [0.3, 1]] },
  aurora: { speed: [0.6, 1.4], params: [[0.2, 1], U, U, U] },
  oprings: { speed: [0.5, 1.2], params: [[0.1, 0.7], U, [0.1, 0.8], U], ink: true },
  halftone: { speed: [0.5, 1.2], params: [[0.1, 0.7], U, U, U], ink: true }
};

export const SHADER_IDS: string[] = Object.keys(SPECS);

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const hex = (c: number[]) => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const ca = hexToRgb01(a);
  const cb = hexToRgb01(b);
  return hex(ca.map((v, i) => v + (cb[i] - v) * t));
};

export const shaderProps = (id: string, rng: Rng, p: Palette): { shader: string; colors: Colors; speed: number; params: number[] } => {
  const shader = SPECS[id] ? id : 'marble';
  const spec = SPECS[shader];
  // Shuffle the accents so the same shader varies across seeds (Fisher–Yates on the seeded rng).
  const acc = [p.accent, p.accent2, p.accent3];
  for (let i = acc.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [acc[i], acc[j]] = [acc[j], acc[i]];
  }
  // Light palettes: pull accents towards the foreground so they read against the pale base.
  const deepen = p.isLight ? (spec.ink ? 0.4 : 0.2) : 0;
  const [a, b, c] = acc.map(x => mix(x, p.fg, deepen));
  const colors: Colors = [p.bg, a, b, c];
  const speed = r3(rng.range(spec.speed[0], spec.speed[1]));
  const params = spec.params.map(([lo, hi]) => r3(rng.range(lo, hi)));
  return { shader, colors, speed, params };
};

