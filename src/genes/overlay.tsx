import { lazy, Suspense, useEffect, useRef, type ComponentType, type CSSProperties } from 'react';
import type { Rng } from '../engine/rng';
import { hexToRgb01, type Palette } from '../engine/palette';

// Overlay gene: a subtle texture layer drawn over any background and under the button.
// Always pointer-events:none. Roughly half of all universes get none.

export interface OverlayGene {
  kind: string;
  props: Record<string, unknown>;
  blend: string;
  opacity: number;
}

const rgba = (hex: string, a: number) =>
  `rgba(${hexToRgb01(hex).map(c => Math.round(c * 255)).join(', ')}, ${Math.round(a * 1000) / 1000})`;
const CLEAR = 'rgba(0, 0, 0, 0)';
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const tidy = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).map(([k, v]) => [k, typeof v === 'number' ? r3(v) : v]));

// Paper components the overlay may use, keyed by kind.
const PAPER_NAME: Record<string, string> = { dither: 'Dithering', paper: 'PaperTexture', halftone: 'DotGrid' };
const paperLazy = (name: string) =>
  lazy(() => import('@paper-design/shaders-react').then(m => ({ default: (m as unknown as Record<string, ComponentType<any>>)[name] })));
const PAPER: Record<string, ReturnType<typeof paperLazy>> = Object.fromEntries(Object.entries(PAPER_NAME).map(([k, n]) => [k, paperLazy(n)]));
const Noise = lazy(() => import('../vendor/react-bits/Noise/Noise'));

const KINDS = ['dither', 'paper', 'halftone', 'grain', 'scanlines', 'vignette', 'fiber'] as const;

export const rollOverlay = (rng: Rng, p: Palette): OverlayGene => {
  // Canvas UI kinds only replace some former 'none' rolls, so every older overlay keeps its look.
  if (rng.chance(0.5)) return rng.chance(0.3) ? rollCanvasUi(rng, p) : { kind: 'none', props: {}, blend: 'normal', opacity: 1 };
  const kind = rng.pick(KINDS);
  const ink = p.fg;
  let props: Record<string, unknown>;
  let blend: string;
  let opacity: number;
  switch (kind) {
    case 'dither':
      props = { colorBack: CLEAR, colorFront: rgba(ink, rng.range(0.15, 0.3)), shape: rng.pick(['simplex', 'warp', 'dots', 'wave', 'ripple', 'swirl']), type: rng.pick(['random', '2x2', '4x4', '8x8']), size: rng.int(2, 6), scale: rng.range(0.6, 1.2), speed: rng.range(0.15, 0.5) };
      blend = rng.pick(['normal', 'overlay', 'soft-light']);
      opacity = rng.range(0.5, 0.9);
      break;
    case 'paper':
      props = { fit: 'cover', scale: 1, colorBack: CLEAR, colorPaper: rgba('#ffffff', rng.range(0.04, 0.12)), colorShadow: rgba('#000000', rng.range(0.2, 0.4)), roughness: rng.range(0.2, 0.6), fiber: rng.range(0.2, 0.6), folds: rng.range(0, 0.6), wrinkles: rng.range(0.3, 1), crumples: rng.range(0, 0.5), drops: rng.range(0, 0.3), seed: rng.int(0, 100), angle: rng.int(0, 360) };
      blend = rng.pick(['multiply', 'overlay', 'soft-light']);
      opacity = rng.range(0.4, 0.8);
      break;
    case 'halftone': {
      const gap = rng.int(6, 12);
      props = { colorBack: CLEAR, colorFill: rgba(ink, rng.range(0.15, 0.3)), colorStroke: CLEAR, size: rng.range(1, 2.5), gapX: gap, gapY: gap, strokeWidth: 0, sizeRange: rng.range(0, 0.3), opacityRange: rng.range(0, 0.4), shape: rng.pick(['circle', 'diamond', 'square']) };
      blend = rng.pick(['overlay', 'soft-light', p.isLight ? 'multiply' : 'screen']);
      opacity = rng.range(0.4, 0.8);
      break;
    }
    case 'grain':
      props = { patternSize: rng.int(150, 300), patternScaleX: 1, patternScaleY: 1, patternRefreshInterval: rng.int(2, 4), patternAlpha: rng.int(10, 22) };
      blend = rng.pick(['normal', 'overlay', 'soft-light']);
      opacity = rng.range(0.6, 1);
      break;
    case 'scanlines':
      props = { color: rgba('#000000', rng.range(0.2, 0.45)), gap: rng.int(3, 5), drift: rng.chance(0.5) };
      blend = rng.pick(['normal', 'multiply', 'overlay']);
      opacity = rng.range(0.3, 0.6);
      break;
    case 'vignette':
      props = { color: rng.chance(0.5) ? p.bg : '#000000', inner: rng.int(40, 65) };
      blend = rng.pick(['normal', 'multiply']);
      opacity = rng.range(0.4, 0.75);
      break;
    default: // fiber: static SVG feTurbulence grain
      props = { freq: rng.range(0.6, 0.95), octaves: rng.int(2, 4), seed: rng.int(0, 999) };
      blend = rng.pick(['overlay', 'soft-light', 'multiply']);
      opacity = rng.range(0.15, 0.35);
  }
  return { kind, props: tidy(props), blend, opacity: r3(opacity) };
};

export const overlayUsesWebGL = (gene: OverlayGene): boolean => gene.kind in PAPER_NAME || isCanvasUi(gene.kind);

// Shared CSS for the pure-CSS overlays (≈0.5 KB). The app injects this once.
export const OVERLAY_CSS = `.ov-fill{position:absolute;inset:0}
.ov-scan{background:repeating-linear-gradient(0deg,var(--ov-c) 0 1px,transparent 1px var(--ov-gap))}
.ov-scan.ov-drift{animation:ov-drift 8s linear infinite}
@keyframes ov-drift{to{background-position:0 calc(var(--ov-gap)*20)}}
.ov-vignette{background:radial-gradient(ellipse at center,transparent var(--ov-in),var(--ov-c) 100%)}
.ov-fiber{background-size:180px 180px}
@media (prefers-reduced-motion:reduce){.ov-scan.ov-drift{animation:none}}`;

const fiberUrl = (props: Record<string, unknown>) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${props.freq}' numOctaves='${props.octaves}' seed='${props.seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
};

// Class + inline style for each CSS kind (shared by the live render and the export kit).
const cssLayer = (gene: OverlayGene): { className: string; style: Record<string, string> } | null => {
  const p = gene.props;
  switch (gene.kind) {
    case 'scanlines':
      return { className: `ov-fill ov-scan${p.drift ? ' ov-drift' : ''}`, style: { '--ov-c': String(p.color), '--ov-gap': `${p.gap}px` } };
    case 'vignette':
      return { className: 'ov-fill ov-vignette', style: { '--ov-c': String(p.color), '--ov-in': `${p.inner}%` } };
    case 'fiber':
      return { className: 'ov-fill ov-fiber', style: { backgroundImage: fiberUrl(p) } };
    default:
      return null;
  }
};

const FILL: CSSProperties = { width: '100%', height: '100%' };

export const Overlay = ({ gene }: { gene: OverlayGene }) => {
  if (gene.kind === 'none') return null;
  let content = null;
  const css = cssLayer(gene);
  if (css) content = <div className={css.className} style={css.style as CSSProperties} />;
  else if (gene.kind === 'grain') content = <Noise {...gene.props} />;
  else if (isCanvasUi(gene.kind)) content = <CanvasUiOverlay kind={gene.kind} props={gene.props} />;
  else if (PAPER[gene.kind]) {
    const C = PAPER[gene.kind];
    content = <C {...gene.props} style={FILL} />;
  }
  return (
    <div
      className="overlay"
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: gene.blend as CSSProperties['mixBlendMode'], opacity: gene.opacity, overflow: 'hidden' }}
    >
      <Suspense fallback={null}>{content}</Suspense>
    </div>
  );
};

export const overlayKit = (gene: OverlayGene): { importLine: string | null; jsx: string; css: string; install: string[] } => {
  if (gene.kind === 'none') return { importLine: null, jsx: '', css: '', install: [] };
  // Canvas UI is MIT + Commons Clause: fine on the site, but its source may not be redistributed.
  if (isCanvasUi(gene.kind))
    return { importLine: null, jsx: '', css: '', install: [`# overlay "${gene.kind}" (Canvas UI) is site-only and not included in this kit (licence: MIT + Commons Clause)`] };
  const wrap = (inner: string) =>
    `<div className="overlay" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: ${JSON.stringify(gene.blend)}, opacity: ${gene.opacity}, overflow: 'hidden' }}>\n  ${inner}\n</div>`;
  const props = JSON.stringify(gene.props);
  const css = cssLayer(gene);
  if (css) return { importLine: null, jsx: wrap(`<div className=${JSON.stringify(css.className)} style={${JSON.stringify(css.style)} as import('react').CSSProperties} />`), css: OVERLAY_CSS, install: [] };
  if (gene.kind === 'grain')
    return { importLine: `import Noise from './components/Noise/Noise';`, jsx: wrap(`<Noise {...${props}} />`), css: '', install: ['npx shadcn@latest add @react-bits/Noise-TS-CSS'] };
  const name = PAPER_NAME[gene.kind];
  return {
    importLine: `import { ${name} } from '@paper-design/shaders-react';`,
    jsx: wrap(`<${name} {...${props}} style={{ width: '100%', height: '100%' }} />`),
    css: '',
    install: ['npm i @paper-design/shaders-react']
  };
};

// ---- Canvas UI overlays (vendored WebGL2 effects, own lazy chunks, site-only) -----------------

const CANVAS_UI_KINDS = ['frost', 'droplets', 'glyphrain', 'clouds', 'blaze'] as const;
type CanvasUiOverlayKind = (typeof CANVAS_UI_KINDS)[number];
const isCanvasUi = (kind: string): kind is CanvasUiOverlayKind => (CANVAS_UI_KINDS as readonly string[]).includes(kind);

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => hexToRgb01(hex).map(r3) as Rgb;
const mixRgb = (a: string, b: string, t: number): Rgb => {
  const [x, y] = [hexToRgb01(a), hexToRgb01(b)];
  return x.map((v, i) => r3(v + (y[i] - v) * t)) as Rgb;
};
const GLYPH_SETS = ['ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789', '01', 'xyʸ^*+', '▲▼◆●■◇○□', '0123456789ABCDEF', '·•∙◦*+×'];

const rollCanvasUi = (rng: Rng, p: Palette): OverlayGene => {
  const kind = rng.pick(CANVAS_UI_KINDS);
  // `resolution` scales the internal canvas below the 1.25 DPR cap; the browser upsamples it.
  let props: Record<string, unknown>;
  let blend = 'normal';
  let opacity = 1;
  switch (kind) {
    case 'frost':
      // shimmer 0: after the intro the frost only re-renders while the pointer melts it.
      props = p.isLight
        ? { tintThin: mixRgb(p.accent, '#ffffff', 0.35), tintThick: mixRgb(p.accent2, p.fg, 0.25), tintStrength: rng.range(0.6, 0.9), opacity: rng.range(0.5, 0.75) }
        : { tintThin: mixRgb(p.accent, '#ffffff', 0.75), tintThick: mixRgb(p.fg, '#ffffff', 0.6), tintStrength: rng.range(0.3, 0.6), opacity: rng.range(0.55, 0.85) };
      props = { ...props, strength: rng.range(0.5, 0.9), frost: rng.range(0, 0.1), textureScale: rng.range(1.4, 3), meltRadius: rng.range(0.12, 0.28), refreeze: rng.range(1, 3), introDuration: rng.range(1.5, 3.5), highlight: rng.range(0.2, 0.5), shimmer: 0, quality: 0.5, resolution: 0.6 };
      break;
    case 'droplets':
      props = { intensity: rng.range(0.3, 0.9), scale: rng.range(0.3, 0.6), speed: rng.range(0.6, 1.2), staticDrops: rng.range(0.1, 0.4), tint: rgb(rng.pick([p.accent, p.accent2, p.fg])), tintStrength: rng.range(0.2, 0.6), interactionRadius: rng.range(0.15, 0.3), resolution: 0.6 };
      blend = p.isLight ? 'multiply' : 'screen';
      break;
    case 'glyphrain':
      props = { charset: rng.pick(GLYPH_SETS), cell: rng.int(12, 22), color: rgb(p.accent), headColor: mixRgb(p.accent, p.fg, 0.6), speed: rng.range(0.1, 0.35), speedVariance: rng.range(0.3, 0.8), density: rng.range(0.1, 0.3), trail: rng.range(0.4, 1.2), glow: rng.range(0.8, 2), mutate: rng.range(0, 1.5), layers: rng.int(1, 2), stir: rng.range(0.4, 0.8), resolution: 0.8 };
      opacity = rng.range(0.5, 0.85);
      break;
    case 'clouds':
      props = { color: p.isLight ? mixRgb(p.bg, '#ffffff', 0.7) : mixRgb(p.fg, p.accent, 0.2), scale: rng.range(0.6, 1.4), speed: rng.range(0.3, 1), cover: rng.range(0, 0.2), density: rng.range(1.8, 3), shading: rng.range(0.1, 0.4), opacity: rng.range(0.35, 0.65), shadow: rng.range(0.02, 0.08), wind: rng.range(0.4, 0.8), quality: 0.3, resolution: 0.6 };
      break;
    default: // blaze
      props = { height: rng.range(0.35, 0.7), sparks: rng.range(0.4, 0.8), sparkDensity: rng.range(1, 2), sparkSize: rng.range(0.8, 1.4), layers: rng.int(2, 3), smoke: rng.range(0.15, 0.5), glow: rng.range(0.8, 2), speed: rng.range(0.6, 1.2), sparkColor: rgb(p.accent), smokeColor: rgb(p.accent2), resolution: 0.6 };
      blend = p.isLight ? 'multiply' : 'screen';
  }
  return { kind, props: tidy(props), blend, opacity: r3(opacity) };
};

const CanvasUiOverlay = ({ kind, props }: { kind: CanvasUiOverlayKind; props: Record<string, unknown> }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let cleanup: (() => void) | null = null;
    let gone = false;
    void import('../vendor/canvas-ui/mount').then(({ mountCanvasUi }) => {
      if (!gone) cleanup = mountCanvasUi(host, kind, props, { idleLeaveMs: 300 });
    });
    return () => {
      gone = true;
      cleanup?.();
    };
    // The gene never changes for a mounted overlay (its Layer is keyed by seed).
  }, [kind]);
  return <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
};
