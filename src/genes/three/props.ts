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
  crystalCluster: { speed: [0.5, 1], params: [U, U, U, U] },
  // Still lifes: one hero object + seeded floor/companions (layout). Calmer speeds.
  stillGlobe: { speed: [0.5, 1], params: [U, U, U, U] },
  stillOrb: { speed: [0.5, 1], params: [U, U, U, U] },
  stillTorus: { speed: [0.5, 1], params: [U, U, U, U] },
  stillCrystal: { speed: [0.5, 1], params: [U, U, U, U] },
  stillGyro: { speed: [0.5, 1], params: [U, U, U, U] },
  stillUrchin: { speed: [0.5, 1], params: [U, U, U, U] },
  stillKnot: { speed: [0.5, 1], params: [U, U, U, U] },
  stillCubes: { speed: [0.5, 1], params: [U, U, U, U] }
};

/** Hero object of each still-life id (the builder is shared). */
export const STILL_HEROES: Record<string, string> = {
  stillGlobe: 'globe',
  stillOrb: 'orb',
  stillTorus: 'torus',
  stillCrystal: 'crystal',
  stillGyro: 'gyro',
  stillUrchin: 'urchin',
  stillKnot: 'knot',
  stillCubes: 'cubes'
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
  /** Still lifes only: 8 seeded numbers (floor, side, companions, …). */
  layout?: number[];
}

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (x: string, y: string) => {
  const [hi, lo] = [lum(x), lum(y)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};
const MIN_CONTRAST = 2.4;
const readable = (c: string, bg: string): string => {
  if (contrast(c, bg) >= MIN_CONTRAST) return c;
  const target = contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#000000' : '#ffffff';
  for (let t = 0.15; t <= 1; t += 0.15) {
    const m = mix(c, target, t);
    if (contrast(m, bg) >= MIN_CONTRAST) return m;
  }
  return target;
};

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
  // Thin lines and dots vanish when a colour sits too close to the ground (e.g. dark red on an "acid" red):
  // give every scene colour a contrast floor by stepping it towards black or white.
  const colors = [a, b, c, mix(p.fg, p.bg, p.isLight ? 0.15 : 0.1)].map(x => readable(x, p.bg)) as [string, string, string, string];
  const speed = r3(rng.range(spec.speed[0], spec.speed[1]));
  const params = spec.params.map(([lo, hi]) => r3(rng.range(lo, hi)));
  const layout = STILL_HEROES[scene] ? Array.from({ length: 8 }, () => r3(rng.next())) : undefined;
  return layout ? { scene, colors, bg: p.bg, params, speed, layout } : { scene, colors, bg: p.bg, params, speed };
};
