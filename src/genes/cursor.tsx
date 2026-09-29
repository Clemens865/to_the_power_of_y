import { lazy, Suspense, useEffect, useRef, type ComponentType, type LazyExoticComponent } from 'react';
import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';
import { Trails, type TrailMode } from './trails';

// Two families: plain CSS cursors (an SVG drawn in the palette) and React Bits cursor effects.
const CSS_KINDS = ['system', 'crosshair', 'dot', 'ring', 'arrow', 'star', 'y', 'bar'] as const;
const LIBRARY_KINDS = ['blob', 'splash', 'target', 'glow', 'crosshairLines', 'ribbons', 'swarm', 'ghost', 'grid', 'textTrail'] as const;
const TRAIL_KINDS: TrailMode[] = ['comet', 'confetti', 'ink', 'snake', 'ripples', 'letters', 'pixels', 'spotlight', 'elastic', 'lens'];
const EFFECT_KINDS = [...LIBRARY_KINDS, ...TRAIL_KINDS];
type CssKind = (typeof CSS_KINDS)[number];
type LibraryKind = (typeof LIBRARY_KINDS)[number];
type EffectKind = LibraryKind | TrailMode;

export interface CursorGene {
  css: CssKind;
  effect: EffectKind | 'none';
  props: Record<string, unknown>;
}

const svgCursor = (body: string, size: number, hot: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`)}") ${hot} ${hot}, auto`;

export const cursorCss = (gene: CursorGene, p: Palette): string => {
  const c = p.accent;
  const o = p.isLight ? '#000' : '#fff';
  switch (gene.css) {
    case 'crosshair':
      return 'crosshair';
    case 'dot':
      return svgCursor(`<circle cx='12' cy='12' r='7' fill='${c}' stroke='${o}' stroke-width='1.5'/>`, 24, 12);
    case 'ring':
      return svgCursor(`<circle cx='20' cy='20' r='14' fill='none' stroke='${c}' stroke-width='3'/><circle cx='20' cy='20' r='2' fill='${o}'/>`, 40, 20);
    case 'arrow':
      return svgCursor(`<path d='M3 3 L3 34 L12 25 L19 40 L25 37 L18 23 L31 23 Z' fill='${c}' stroke='${o}' stroke-width='2' stroke-linejoin='round'/>`, 44, 3);
    case 'star':
      return svgCursor(`<path d='M16 1 L20 12 L31 16 L20 20 L16 31 L12 20 L1 16 L12 12 Z' fill='${c}' stroke='${o}' stroke-width='1'/>`, 32, 16);
    case 'y':
      return svgCursor(`<text x='16' y='26' text-anchor='middle' font-family='Georgia,serif' font-size='28' font-style='italic' fill='${c}' stroke='${o}' stroke-width='1'>y</text>`, 32, 16);
    case 'bar':
      return svgCursor(`<rect x='13' y='2' width='6' height='28' fill='${c}' stroke='${o}' stroke-width='1'/>`, 32, 16);
    default:
      return 'default';
  }
};

const EFFECTS: Record<LibraryKind, { Component: LazyExoticComponent<ComponentType<any>>; rb: string; props: (r: Rng, p: Palette) => Record<string, unknown>; hidesCursor?: boolean }> = {
  blob: {
    Component: lazy(() => import('../vendor/react-bits/BlobCursor/BlobCursor')),
    rb: 'BlobCursor',
    props: (r, p) => {
      // sizes/innerSizes/opacities must have one entry per trail blob
      const n = r.int(2, 4);
      const sizes = Array.from({ length: n }, (_, i) => r.int(40, 70) + i * 25);
      return { blobType: r.pick(['circle', 'square']), fillColor: p.accent, innerColor: p.fg, shadowColor: 'rgba(0,0,0,0.5)', trailCount: n, sizes, innerSizes: sizes.map(s => Math.round(s * 0.3)), opacities: sizes.map((_, i) => Math.round((0.7 - i * 0.12) * 100) / 100), useFilter: r.chance(0.7) };
    }
  },
  splash: {
    Component: lazy(() => import('../vendor/react-bits/SplashCursor/SplashCursor')),
    rb: 'SplashCursor',
    props: (r, p) => ({ RAINBOW_MODE: r.chance(0.3), COLOR: p.accent, SPLAT_RADIUS: round(r.range(0.1, 0.3)), CURL: round(r.range(1, 6)), DENSITY_DISSIPATION: round(r.range(2.5, 4.5)), TRANSPARENT: true })
  },
  target: {
    Component: lazy(() => import('../vendor/react-bits/TargetCursor/TargetCursor')),
    rb: 'TargetCursor',
    props: (r, p) => ({ targetSelector: '.xbtn', spinDuration: round(r.range(1, 4)), hideDefaultCursor: true, parallaxOn: true, cursorColor: p.fg, cursorColorOnTarget: p.accent }),
    hidesCursor: true
  },
  glow: {
    Component: lazy(() => import('../vendor/react-bits/GlowCursor/GlowCursor')),
    rb: 'GlowCursor',
    props: (r, p) => ({ color: p.accent, secondaryColor: p.accent2, trailLength: r.int(20, 60), glowIntensity: round(r.range(0.6, 1.4)), idleFade: true })
  },
  crosshairLines: {
    Component: lazy(() => import('../vendor/react-bits/Crosshair/Crosshair')),
    rb: 'Crosshair',
    props: (_r, p) => ({ color: p.fg })
  },
  ribbons: {
    Component: lazy(() => import('../vendor/react-bits/Ribbons/Ribbons')),
    rb: 'Ribbons',
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3].slice(0, r.int(1, 3)), baseThickness: r.int(15, 40), enableFade: true, enableShaderEffect: r.chance(0.5) })
  },
  swarm: {
    Component: lazy(() => import('../vendor/react-bits/SwarmCursor/SwarmCursor')),
    rb: 'SwarmCursor',
    props: (r, p) => ({ color: p.accent, accentColor: p.accent2, count: r.int(12, 40), size: r.int(4, 10), glow: round(r.range(0.4, 1)), speed: round(r.range(0.6, 1.4)), scatterOnClick: true })
  },
  ghost: {
    Component: lazy(() => import('../vendor/react-bits/GhostCursor/GhostCursor')),
    rb: 'GhostCursor',
    props: (r, p) => ({ color: p.accent, trailLength: r.int(30, 60), bloomStrength: round(r.range(0.2, 0.6)), brightness: round(r.range(1, 2)), mixBlendMode: p.isLight ? 'multiply' : 'screen' })
  },
  grid: {
    Component: lazy(() => import('../vendor/react-bits/CursorGrid/CursorGrid')),
    rb: 'CursorGrid',
    props: (r, p) => ({ cellSize: r.int(24, 64), color: p.accent, radius: r.int(80, 200), maxOpacity: round(r.range(0.4, 0.9)), gridOpacity: round(r.range(0, 0.12)), clickPulse: true })
  },
  textTrail: {
    Component: lazy(() => import('../vendor/react-bits/TextCursor/TextCursor')),
    rb: 'TextCursor',
    props: r => ({ text: r.pick(['y', '✦', 'xʸ', '●', '↻']), spacing: r.int(60, 120), followMouseDirection: r.chance(0.5), randomFloat: true })
  }
};

const isTrail = (k: EffectKind): k is TrailMode => (TRAIL_KINDS as string[]).includes(k);

const WEBGL_CURSORS = new Set<EffectKind>(['splash', 'glow', 'ribbons', 'swarm', 'ghost']);
export const cursorUsesWebGL = (gene: CursorGene) => gene.effect !== 'none' && WEBGL_CURSORS.has(gene.effect);

// Swap a WebGL cursor effect for a cheap 2D one (used by the GPU budget in grow()).
export const downgradeCursor = (gene: CursorGene, rng: Rng, p: Palette): CursorGene => {
  const effect = rng.pick(TRAIL_KINDS);
  return { ...gene, effect, props: trailProps(rng, p) };
};

const trailProps = (r: Rng, p: Palette) => ({ colors: [p.accent, p.accent2, p.accent3], size: r.int(6, 16), dark: p.isLight ? p.fg : '#000' });

const round = (n: number) => Math.round(n * 1000) / 1000;

export const rollCursor = (rng: Rng, p: Palette): CursorGene => {
  const css = rng.pick(CSS_KINDS);
  const effect = rng.chance(0.6) ? rng.pick(EFFECT_KINDS) : 'none';
  const props = effect === 'none' ? {} : isTrail(effect) ? trailProps(rng, p) : EFFECTS[effect].props(rng, p);
  return { css, effect, props };
};

// For the export kit: React Bits component name, or 'Trails' for the home-made ones.
export const cursorEffectInfo = (gene: CursorGene) => {
  if (gene.effect === 'none') return null;
  if (isTrail(gene.effect)) return { rb: null, trail: gene.effect, hidesCursor: false };
  return { rb: EFFECTS[gene.effect].rb, trail: null, hidesCursor: !!EFFECTS[gene.effect].hidesCursor };
};

// Several cursor effects only listen on their own container. The layer sits above the page with
// pointer-events: none, so real pointer events are re-dispatched into it.
export const CursorLayer = ({ gene, text }: { gene: CursorGene; text: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const forward = (e: MouseEvent | PointerEvent) => {
      if (!e.isTrusted) return;
      const target = ref.current?.firstElementChild;
      if (!target) return;
      const init = { clientX: e.clientX, clientY: e.clientY, bubbles: true };
      target.dispatchEvent(e instanceof PointerEvent ? new PointerEvent(e.type, init) : new MouseEvent(e.type, init));
    };
    addEventListener('mousemove', forward);
    addEventListener('pointermove', forward);
    return () => {
      removeEventListener('mousemove', forward);
      removeEventListener('pointermove', forward);
    };
  }, []);
  if (gene.effect === 'none') return null;
  if (isTrail(gene.effect)) return <Trails mode={gene.effect} {...(gene.props as { colors: string[]; size: number; dark: string })} text={text} />;
  const { Component } = EFFECTS[gene.effect];
  return (
    <div ref={ref} className="cursor-layer" aria-hidden>
      <Suspense fallback={null}>
        <Component {...gene.props} />
      </Suspense>
    </div>
  );
};
