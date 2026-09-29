import type { Rng } from '../../engine/rng';
import { hexToRgb01, type Palette } from '../../engine/palette';

// xʸ 3D scene pack: ids and the (rng, palette) → props mapping. No three import, so the
// background registry can use it cheaply; the scenes load with the lazily imported ThreeScene.

type Range = [number, number];
const U: Range = [0, 1];
const SPECS: Record<string, { speed: Range; params: Range[] }> = {
  dotField: { speed: [0.6, 1.2], params: [U, U, U, U] },
  ringTunnel: { speed: [0.5, 1.1], params: [U, U, U, U] },
  orbitRings: { speed: [0.5, 1.1], params: [U, U, U, U] },
  pointSphere: { speed: [0.5, 1.1], params: [U, U, U, U] },
  terrainWire: { speed: [0.6, 1.2], params: [U, U, U, U] },
  cubeDrift: { speed: [0.5, 1], params: [U, U, U, U] },
  helix: { speed: [0.5, 1.1], params: [U, U, U, U] },
  galaxySpiral: { speed: [0.5, 1.1], params: [U, U, U, U] },
  lineStack: { speed: [0.6, 1.2], params: [U, U, U, U] },
  voxelSea: { speed: [0.5, 1.1], params: [U, U, U, U] },
  knotPoints: { speed: [0.5, 1.1], params: [U, U, U, U] },
  crystalCluster: { speed: [0.5, 1], params: [U, U, U, U] }
};

export const THREE_SCENE_IDS: string[] = Object.keys(SPECS);

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const hex = (c: number[]) => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const ca = hexToRgb01(a);
  const cb = hexToRgb01(b);
  return hex(ca.map((v, i) => v + (cb[i] - v) * t));
};

export interface ThreeSceneGeneProps {
  scene: string;
  colors: [string, string, string, string];
  bg: string;
  params: number[];
  speed: number;
}

export const threeSceneProps = (id: string, rng: Rng, p: Palette): ThreeSceneGeneProps => {
  const scene = SPECS[id] ? id : 'dotField';
  const spec = SPECS[scene];
  const acc = [p.accent, p.accent2, p.accent3];
  for (let i = acc.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [acc[i], acc[j]] = [acc[j], acc[i]];
  }
  // Light palettes: deepen the accents towards the foreground so thin dots and lines read on pale ground.
  const deepen = p.isLight ? 0.3 : 0;
  const [a, b, c] = acc.map(x => mix(x, p.fg, deepen));
  const colors: [string, string, string, string] = [a, b, c, mix(p.fg, p.bg, p.isLight ? 0.15 : 0.1)];
  const speed = r3(rng.range(spec.speed[0], spec.speed[1]));
  const params = spec.params.map(([lo, hi]) => r3(rng.range(lo, hi)));
  return { scene, colors, bg: p.bg, params, speed };
};
