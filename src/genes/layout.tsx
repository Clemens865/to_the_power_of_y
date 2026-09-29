import { lazy, Suspense, type CSSProperties, type ComponentType } from 'react';
import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';
import CircularText from '../vendor/react-bits/CircularText/CircularText';
import MagnetLines from '../vendor/react-bits/MagnetLines/MagnetLines';
import Cubes from '../vendor/react-bits/Cubes/Cubes';
import CurvedLoop from '../vendor/react-bits/CurvedLoop/CurvedLoop';
import TextLoop from '../vendor/react-bits/TextLoop/TextLoop';

// three.js decorations load on demand.
const LaserFlow = lazy(() => import('../vendor/react-bits/LaserFlow/LaserFlow'));
const MagicRings = lazy(() => import('../vendor/react-bits/MagicRings/MagicRings'));

// Layouts decorate the page around the button and decide where the button sits.
// Order is part of the seed contract: append, don't reorder.
const KINDS = ['bare', 'bare', 'frame', 'poster', 'marquee', 'swiss', 'split', 'orbit', 'magnet', 'cubes', 'laser', 'rings', 'curved', 'textloop'] as const;
type Kind = (typeof KINDS)[number];

// Candidate button positions in % of the viewport; centre is weighted up.
const SPOTS: [number, number][] = [[50, 50], [50, 50], [50, 50], [33, 33], [67, 67], [33, 67], [67, 33], [50, 72], [62, 38]];

export interface LayoutGene {
  kind: Kind;
  x: number;
  y: number;
  split: number; // split position (%) for 'split'
  vertical: boolean;
  marqueeSpeed: number;
}

export const rollLayout = (rng: Rng): LayoutGene => {
  const kind = rng.pick(KINDS);
  const [sx, sy] = rng.pick(SPOTS);
  const split = Math.round(rng.range(35, 65));
  const vertical = rng.chance(0.5);
  const marqueeSpeed = Math.round(rng.range(12, 40));
  if (kind === 'split') return { kind, x: vertical ? split : 50, y: vertical ? 50 : split, split, vertical, marqueeSpeed };
  if (kind === 'orbit' || kind === 'poster' || kind === 'cubes') return { kind, x: 50, y: 50, split, vertical, marqueeSpeed };
  if (kind === 'swiss') return { kind, x: rng.pick([33, 67]), y: rng.pick([33, 67]), split, vertical, marqueeSpeed };
  if (kind === 'curved') return { kind, x: 50, y: sy, split, vertical, marqueeSpeed };
  return { kind, x: sx, y: sy, split, vertical, marqueeSpeed };
};

export const layoutUsesWebGL = (kind: Kind): boolean => kind === 'laser' || kind === 'rings';

export interface DecorContext {
  seed: string;
  word: string;
  count: number;
  /** Colours for the React Bits decorations; without it they fall back to neutral defaults. */
  palette?: Palette;
  /** Copy from the voice gene; defaults keep the original wording. */
  tagline?: string;
  hint?: string;
}

export type DecorComponent = 'MagnetLines' | 'Cubes' | 'LaserFlow' | 'MagicRings' | 'CurvedLoop' | 'TextLoop';

// A layout is described as data so the live page and the exported component render the same markup.
// Component items render <div className={cls} style={style}><Component {...props} /></div>.
export type DecorItem =
  | { cls: string; text?: string; style?: CSSProperties }
  | { circular: string }
  | { component: DecorComponent; props: Record<string, unknown>; cls: string; style?: CSSProperties; text?: undefined };

const FALLBACK: Palette = { mood: 'void', isLight: false, bg: '#0b0b0f', fg: '#f4f4f0', accent: '#7c5cff', accent2: '#ff5ca8', accent3: '#5cf0ff', hue: 260 };

export const decorFor = (g: LayoutGene, ctx: DecorContext): DecorItem[] => {
  const w = ctx.word.trim() || 'xʸ';
  const p = ctx.palette ?? FALLBACK;
  const at: CSSProperties = { left: `${g.x}%`, top: `${g.y}%` };
  switch (g.kind) {
    case 'frame':
      return [
        { cls: 'lay-frame' },
        { cls: 'lay-corner lay-tl', text: 'x' },
        { cls: 'lay-corner lay-tr', text: `y = ${ctx.seed}` },
        { cls: 'lay-corner lay-bl', text: ctx.hint ?? 'press to change' },
        { cls: 'lay-corner lay-br', text: `no. ${ctx.count}` }
      ];
    case 'poster':
      return [{ cls: 'lay-poster', text: 'xʸ' }];
    case 'marquee':
      return [
        { cls: 'lay-marquee lay-m1', text: `${w} · `.repeat(24), style: { animationDuration: `${g.marqueeSpeed}s` } },
        { cls: 'lay-marquee lay-m2', text: `y = ${ctx.seed} · `.repeat(16), style: { animationDuration: `${g.marqueeSpeed * 1.4}s` } }
      ];
    case 'swiss':
      return [
        { cls: 'lay-grid' },
        { cls: 'lay-swiss-title', text: ctx.tagline ?? 'x to the power of y' },
        { cls: 'lay-swiss-num', text: ctx.seed }
      ];
    case 'split':
      return [{ cls: `lay-split ${g.vertical ? 'lay-split-v' : 'lay-split-h'}`, style: { [g.vertical ? 'width' : 'height']: `${g.split}%` } }];
    case 'orbit':
      return [{ circular: ` ${w} • ${ctx.tagline ?? 'x to the power of y'} • ` }];
    case 'magnet': {
      const n = g.vertical ? 11 : 9;
      return [{
        component: 'MagnetLines',
        cls: 'lay-magnet',
        props: { rows: n, columns: n, containerSize: 'min(92vmin, 900px)', lineColor: p.fg, lineWidth: '0.35vmin', lineHeight: '4.2vmin', baseAngle: -10 }
      }];
    }
    case 'cubes':
      return [{
        component: 'Cubes',
        cls: 'lay-cubes',
        props: {
          gridSize: g.vertical ? 8 : 10, maxAngle: 50, radius: 3, borderStyle: `1px solid ${p.fg}`, faceColor: p.bg,
          rippleOnClick: true, rippleColor: p.accent, rippleSpeed: 1.6, autoAnimate: true
        }
      }];
    case 'laser':
      return [{
        component: 'LaserFlow',
        cls: `lay-laser ${p.isLight ? 'lay-light' : 'lay-dark'}`,
        // Beam origin in fractions of the canvas from its centre (y up); nudged up so it lands on the button's top edge.
        props: {
          color: p.accent, backgroundColor: p.bg, horizontalBeamOffset: (g.x - 50) / 100, verticalBeamOffset: Math.round((50 - g.y + 5) * 10) / 1000,
          flowSpeed: Math.round((g.marqueeSpeed / 60) * 100) / 100, fogIntensity: 0.4, wispIntensity: 4
        }
      }];
    case 'rings':
      return [{
        component: 'MagicRings',
        cls: 'lay-rings',
        style: at,
        props: {
          color: p.accent, colorTwo: p.accent2, ringCount: g.vertical ? 5 : 7, baseRadius: 0.2, radiusStep: 0.06, speed: Math.round((24 / g.marqueeSpeed) * 100) / 100,
          lineThickness: 2, opacity: 0.9, alphaMode: p.isLight ? 'coverage' : 'luminance', followMouse: false, clickBurst: false
        }
      }];
    case 'curved':
      return [
        { component: 'CurvedLoop', cls: 'lay-curved lay-curved-top', style: { top: `calc(${g.y}% - 3.8vw)` }, props: { marqueeText: `${w} ✦ `, speed: 1.4, curveAmount: -400, direction: 'left', interactive: false, className: 'lay-curved-text' } },
        { component: 'CurvedLoop', cls: 'lay-curved lay-curved-bottom', style: { top: `calc(${g.y}% + 1vw)` }, props: { marqueeText: `y = ${ctx.seed} ✦ `, speed: 1.1, curveAmount: 400, direction: 'right', interactive: false, className: 'lay-curved-text' } }
      ];
    case 'textloop':
      return [{
        component: 'TextLoop',
        cls: 'lay-textloop',
        style: at,
        props: {
          text: w, shape: 'circle', separator: '✦', curviness: 130, fontSize: 40, letterSpacing: 2, uppercase: true, color: p.bg,
          ribbon: true, ribbonColor: p.accent, ribbonWidth: 64, speed: Math.round(1800 / g.marqueeSpeed), direction: g.vertical ? 'reverse' : 'forward', pauseOnHover: false
        }
      }];
    default:
      return [];
  }
};

type AnyComponent = ComponentType<Record<string, unknown>>;
const DECOR_COMPONENTS: Record<DecorComponent, AnyComponent> = {
  MagnetLines: MagnetLines as unknown as AnyComponent,
  Cubes: Cubes as unknown as AnyComponent,
  LaserFlow: LaserFlow as unknown as AnyComponent,
  MagicRings: MagicRings as unknown as AnyComponent,
  CurvedLoop: CurvedLoop as unknown as AnyComponent,
  TextLoop: TextLoop as unknown as AnyComponent
};

export const Decor = ({ items }: { items: DecorItem[] }) => (
  <div className="layout" aria-hidden>
    {items.map((it, i) => {
      if ('circular' in it)
        return (
          <div key={i} className="lay-orbit">
            <CircularText text={it.circular} spinDuration={24} onHover="speedUp" />
          </div>
        );
      if ('component' in it) {
        const C = DECOR_COMPONENTS[it.component];
        return (
          <div key={i} className={it.cls} style={it.style}>
            <Suspense fallback={null}>
              <C {...it.props} />
            </Suspense>
          </div>
        );
      }
      return (
        <div key={i} className={it.cls} style={it.style}>
          {it.text}
        </div>
      );
    })}
  </div>
);

// ---- export kit -------------------------------------------------------------------------------

const js = (v: unknown) => JSON.stringify(v);
const attrs = (props: Record<string, unknown>) =>
  Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (v === true ? k : `${k}={${js(v)}}`))
    .join(' ');

/** JSX for every decor item (to sit inside <div className="layout" aria-hidden>), plus the React Bits it imports. */
export const decorKit = (g: LayoutGene, ctx: DecorContext): { jsx: string; components: string[] } => {
  const components = new Set<string>();
  const jsx = decorFor(g, ctx)
    .map(it => {
      if ('circular' in it) {
        components.add('CircularText');
        return `<div className={"lay-orbit"}><CircularText text={${js(it.circular)}} spinDuration={24} onHover={"speedUp"} /></div>`;
      }
      const style = it.style ? ` style={${js(it.style)}}` : '';
      if ('component' in it) {
        components.add(it.component);
        return `<div className={${js(it.cls)}}${style}><${it.component} ${attrs(it.props)} /></div>`;
      }
      return `<div className={${js(it.cls)}}${style}>${it.text ? `{${js(it.text)}}` : ''}</div>`;
    })
    .join('\n        ');
  return { jsx, components: [...components] };
};

export const LAYOUT_CSS = `
.layout { position: absolute; inset: 0; pointer-events: none; font-family: var(--font); font-weight: var(--weight); text-transform: var(--transform); color: var(--fg); }
.lay-frame { position: absolute; inset: 56px 18px 48px; border: 1.5px solid currentColor; opacity: 0.55; }
.lay-corner { position: absolute; font: 12px/1 ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 8px; background: var(--bg); }
.lay-tl { top: 48px; left: 30px; } .lay-tr { top: 48px; right: 30px; } .lay-bl { bottom: 40px; left: 30px; } .lay-br { bottom: 40px; right: 30px; }
.lay-poster { position: absolute; inset: 0; display: grid; place-items: center; font-size: min(62vw, 88vh); line-height: 0.8; letter-spacing: -0.06em; opacity: 0.16; mix-blend-mode: overlay; color: var(--fg); white-space: nowrap; }
.lay-marquee { position: absolute; left: 0; white-space: nowrap; font-size: clamp(28px, 7vw, 96px); line-height: 1; opacity: 0.35; animation: lay-scroll linear infinite; }
.lay-m1 { top: 12%; } .lay-m2 { bottom: 12%; animation-direction: reverse; font-size: clamp(14px, 2.4vw, 32px); }
@keyframes lay-scroll { to { transform: translateX(-50%); } }
.lay-grid { position: absolute; inset: 0; opacity: 0.25;
  background: linear-gradient(currentColor, currentColor) 33.33% 0 / 1px 100% no-repeat, linear-gradient(currentColor, currentColor) 66.66% 0 / 1px 100% no-repeat,
    linear-gradient(currentColor, currentColor) 0 33.33% / 100% 1px no-repeat, linear-gradient(currentColor, currentColor) 0 66.66% / 100% 1px no-repeat; }
.lay-swiss-title { position: absolute; left: 24px; top: 20px; font-size: clamp(20px, 3.4vw, 44px); line-height: 1; max-width: 32vw; }
.lay-swiss-num { position: absolute; right: 24px; top: 34%; font: 12px ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.2em; }
.lay-split { position: absolute; left: 0; top: 0; background: var(--a1); mix-blend-mode: difference; }
.lay-split-v { height: 100%; } .lay-split-h { width: 100%; }
.lay-orbit { position: absolute; inset: 0; display: grid; place-items: center; font-size: 20px; }
.lay-orbit .circular-text { width: min(420px, 80vw); height: min(420px, 80vw); color: var(--fg); font-family: var(--font); pointer-events: auto; }
.lay-magnet { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0.4; }
.lay-magnet .magnetLines-container span { border-radius: 999px; }
.lay-cubes { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0.85; }
.lay-cubes .default-animation { width: min(78vmin, 820px); }
.lay-cubes .default-animation--scene { pointer-events: auto; }
.lay-laser { position: absolute; inset: 0; }
.lay-laser .laser-flow-container { background: transparent !important; }
.lay-laser.lay-dark canvas { filter: none !important; mix-blend-mode: screen !important; }
.lay-laser.lay-light canvas { filter: invert(1) hue-rotate(180deg) !important; mix-blend-mode: multiply !important; }
.lay-rings { position: absolute; width: min(96vmin, 960px); aspect-ratio: 1; transform: translate(-50%, -50%); }
.lay-curved { position: absolute; left: 0; width: 100%; }
.lay-curved .curved-loop-jacket { min-height: 0; display: block; }
.lay-curved .curved-loop-svg { font-size: 3rem; font-family: var(--font); fill: var(--fg); opacity: 0.45; }
.lay-curved .lay-curved-text { fill: var(--fg); }
.lay-textloop { position: absolute; width: min(170vmin, 1500px); transform: translate(-50%, -50%); opacity: 0.9; }
.lay-textloop .text-loop-text { font-family: var(--font); }
@media (prefers-reduced-motion: reduce) { .lay-marquee { animation: none; } }
`;
