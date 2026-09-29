import { lazy } from 'react';
import type { BackgroundDef, BackgroundGene } from '../backgrounds';
import type { Palette } from '../../engine/palette';
import type { Rng } from '../../engine/rng';

export const LIBRARY_BACKGROUND_IDS = ['typographyVortex', 'elasticMesh', 'scanner', 'slicedWaves', 'acidSquares'] as const;
export const LIBRARY_BACKGROUND_DEFS: Record<string, BackgroundDef> = {
  typographyVortex: { name: 'TypographyVortex', source: 'library', webgl: false, Component: lazy(() => import('../../vendor/threeui/TypographyVortex/TypographyVortex')), props: () => ({}) },
  elasticMesh: { source: 'library', Component: lazy(() => import('../../vendor/react-bits/ElasticMesh/ElasticMesh')), props: () => ({}) },
  scanner: { source: 'library', Component: lazy(() => import('../../vendor/react-bits/Scanner/Scanner')), props: () => ({}) },
  slicedWaves: { source: 'library', Component: lazy(() => import('../../vendor/react-bits/SlicedWaves/SlicedWaves')), props: () => ({}) },
  acidSquares: { source: 'library', Component: lazy(() => import('../../vendor/react-bits/AcidSquares/AcidSquares')), props: () => ({}) }
};

export interface LibraryBackgroundContext { seed: string; phrase: string; fontFamily: string }
const tidy = (v: unknown): unknown => typeof v === 'number' ? Math.round(v * 1000) / 1000
  : Array.isArray(v) ? v.map(tidy) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x)])) : v;

/** Use an independent seed stream: opting into this pack never shifts legacy genes. */
export function rollLibraryBackground(r: Rng, p: Palette, context: LibraryBackgroundContext): BackgroundGene | null {
  if (!r.chance(0.25)) return null;
  const id = r.pick(LIBRARY_BACKGROUND_IDS);
  const colors = { color1: p.accent, color2: p.accent2, color3: p.accent3 };
  let props: Record<string, unknown>;
  switch (id) {
    case 'typographyVortex':
      props = { mode: p.isLight ? 'light' : 'dark', seed: r.int(1, 2147483647),
        phrase: `xʸ / ${context.phrase} / ${context.seed} / `, fontFamily: context.fontFamily,
        color: p.accent, accent: p.accent2, backgroundColor: p.bg, speed: r.range(0.35, 0.65),
        ringGrowth: r.range(1.2, 1.3), opacity: 0.72, dissolveRadius: 0.75, particleAmount: 0.45, suctionDuration: 780 };
      break;
    case 'elasticMesh':
      props = { color1: p.accent, color2: p.accent2, highlight: p.accent3, gridColor: p.fg,
        showGrid: true, gridDensity: r.int(12, 22), gridOpacity: 0.25, borderRadius: 34,
        stiffness: r.range(0.035, 0.07), damping: 0.2, grabRadius: r.range(0.5, 0.85),
        pull: r.range(0.22, 0.42), wobble: r.range(2, 5), tilt: r.range(-14, 14), shading: 0.5,
        resolution: 25, interaction: 'hover', enabled: true };
      break;
    case 'scanner':
      props = { ...colors, speed: r.range(0.15, 0.4), sweepSpeed: r.range(0.12, 0.3),
        sweepWidth: r.range(1.2, 2.1), scale: r.range(1.1, 1.8), frequency: r.range(1.3, 2.8),
        bandDensity: r.int(8, 15), scanDirection: r.pick(['vertical', 'horizontal', 'diagonal']),
        glow: 0.18, brightness: 0.85, opacity: 0.65, scanline: r.chance(0.5), grain: false,
        mouseInteraction: true, mouseStrength: 0.45 };
      break;
    case 'slicedWaves':
      props = { ...colors, columns: r.int(10, 20), rows: r.int(5, 10), barThickness: r.range(0.08, 0.2),
        speed: r.range(0.15, 0.35), travel: 0.7, waveSpread: r.range(0.5, 1.2), rowOffset: r.range(0.5, 1.5),
        glow: r.range(0, 0.15), opacity: 0.55, orientation: r.pick(['horizontal', 'vertical']),
        alternate: r.chance(0.5), grain: false, lightMode: false, mouseInteraction: true, mouseStrength: 0.75 };
      break;
    case 'acidSquares':
      props = { ...colors, detail: 'low', speed: r.range(0.18, 0.4), waveDepth: r.range(0.5, 1.2),
        zoom: r.range(1, 1.6), density: r.range(7, 12), glow: 0.8, exposure: 2400, spread: r.range(0.2, 0.4),
        brightness: 0.85, opacity: 0.65, mouseInteraction: true, mouseStrength: 0.08,
        blur: 0, grain: false, lightMode: false };
  }
  return { id, props: tidy({ ...props, surface: { backgroundColor: p.bg, color1: p.accent, color2: p.accent2 } }) as Record<string, unknown> };
}
