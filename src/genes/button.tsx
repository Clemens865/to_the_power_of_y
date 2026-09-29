import { lazy, Suspense, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import type { Rng } from '../engine/rng';
import { hexToRgb01, type Palette } from '../engine/palette';

import type { Shape, Skin, Idle, Press, Hover, Entrance } from './buttonCss';

// Order of these lists is part of the seed contract: append, don't reorder.
const SHAPES: Shape[] = ['pill', 'square', 'rounded', 'circle', 'blob', 'ticket', 'hex', 'slant'];
const SKINS: Skin[] = ['solid', 'outline', 'glass', 'brutal', 'neon', 'emboss', 'gradient', 'invert', 'naked'];
const WRAPS = ['none', 'none', 'electric', 'glare', 'specular', 'borderglow', 'pixel', 'glass', 'spotlight'] as const;
const IDLES: Idle[] = ['none', 'none', 'none', 'breathe', 'wobble', 'float', 'spin-border', 'heartbeat', 'swing', 'twitch', 'glow', 'hue', 'rubber', 'tilt3d', 'sway', 'comet', 'shimmer', 'ring'];
const HOVERS: Hover[] = ['grow', 'grow', 'lift', 'tilt', 'squish', 'nudge', 'glow', 'bright', 'shrink'];
const ENTRANCES: Entrance[] = ['none', 'none', 'pop', 'drop', 'rise', 'spin', 'blur', 'stretch', 'flip', 'zoom'];
const PRESSES: Press[] = ['none', 'pop', 'shake', 'jelly', 'sink', 'ripple', 'tilt'];

export type Wrap = (typeof WRAPS)[number];

export interface ButtonGene {
  shape: Shape;
  skin: Skin;
  wrap: Wrap;
  idle: Idle;
  size: number; // rem
  magnet: boolean;
  spark: boolean;
  press: Press;
  // Rolled on their own streams in grow() (see rollHover / rollEntrance).
  hover: Hover;
  entrance: Entrance;
}

export const rollButton = (rng: Rng): ButtonGene => {
  const shape = rng.pick(SHAPES);
  const skin = rng.pick(SKINS);
  const wrap = rng.pick(WRAPS);
  const idle = rng.pick(IDLES);
  const size = rng.range(1.2, 4.2);
  const magnet = rng.chance(0.4);
  const spark = rng.chance(0.5);
  // Derived from the size's low digits instead of a new rng call, so every gene rolled after the
  // button (label, transition, cursor, layout, sound) keeps its value for existing seeds.
  const press = PRESSES[Math.floor(size * 7919) % PRESSES.length];
  return { shape, skin, wrap, idle, size, magnet, spark, press, hover: 'grow', entrance: 'none' };
};

export const rollHover = (rng: Rng): Hover => rng.pick(HOVERS);
export const rollEntrance = (rng: Rng): Entrance => rng.pick(ENTRANCES);

export const buttonUsesWebGL = (gene: ButtonGene): boolean => gene.wrap === 'specular';

// WCAG relative luminance / contrast, small enough to keep here.
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const mostReadableOn = (fill: string, options: string[]) => options.reduce((best, c) => (contrast(c, fill) > contrast(best, fill) ? c : best));

// Text colour that stays readable on the chosen skin. Canvas-drawn label effects use this value
// directly, so it must match what CSS does (e.g. the invert skin forces black text).
export const labelColor = (gene: ButtonGene, p: Palette): string =>
  gene.skin === 'solid' || gene.skin === 'brutal'
    ? mostReadableOn(p.accent, [p.bg, p.fg, '#000000', '#ffffff'])
    : gene.skin === 'emboss'
      ? mostReadableOn(p.fg, [p.bg, '#000000', '#ffffff'])
      : gene.skin === 'invert'
        ? '#000000'
        : p.fg;

// ---- press micro-interactions (JS half; CSS lives in PRESS_CSS) -------------------------------

export const pressNeedsJs = (press: Press): boolean => press === 'pop' || press === 'shake' || press === 'jelly' || press === 'ripple' || press === 'tilt';

type PressEvent = { currentTarget: EventTarget & Element; clientX: number; clientY: number };
const pressTimers = new WeakMap<Element, number>();
const pressTarget = (e: PressEvent): HTMLElement | null =>
  e.currentTarget.tagName === 'BUTTON' ? (e.currentTarget as HTMLElement) : e.currentTarget.querySelector('button');

/** DOM handlers for a press behaviour; spread onto the <button> (or a wrapper that contains it). */
export const pressHandlers = (press: Press) => {
  if (!pressNeedsJs(press)) return {};
  const kick = (e: PressEvent) => {
    const el = pressTarget(e);
    if (!el) return;
    if (press === 'ripple') {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--rx', `${e.clientX - r.left}px`);
      el.style.setProperty('--ry', `${e.clientY - r.top}px`);
    }
    el.classList.remove('is-pressing');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-pressing');
    clearTimeout(pressTimers.get(el));
    pressTimers.set(el, window.setTimeout(() => el.classList.remove('is-pressing'), 420));
  };
  if (press !== 'tilt') return { onPointerDown: kick };
  return {
    onPointerMove: (e: PressEvent) => {
      const el = pressTarget(e);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.setProperty('--tilt-x', `${((0.5 - y) * 16).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${((x - 0.5) * 16).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    },
    onPointerLeave: (e: PressEvent) => {
      const el = pressTarget(e);
      if (!el) return;
      for (const v of ['--tilt-x', '--tilt-y', '--gx', '--gy']) el.style.removeProperty(v);
    }
  };
};

/** Same helper as TypeScript source, for the export kit to paste into Universe.tsx when pressNeedsJs(). */
export const PRESS_HELPER_SOURCE = `
type PressEvent = { currentTarget: EventTarget & Element; clientX: number; clientY: number };
const pressTimers = new WeakMap<Element, number>();
const pressTarget = (e: PressEvent): HTMLElement | null =>
  e.currentTarget.tagName === 'BUTTON' ? (e.currentTarget as HTMLElement) : e.currentTarget.querySelector('button');
function pressHandlers(press: string) {
  const kick = (e: PressEvent) => {
    const el = pressTarget(e);
    if (!el) return;
    if (press === 'ripple') {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--rx', \`\${e.clientX - r.left}px\`);
      el.style.setProperty('--ry', \`\${e.clientY - r.top}px\`);
    }
    el.classList.remove('is-pressing');
    void el.offsetWidth;
    el.classList.add('is-pressing');
    clearTimeout(pressTimers.get(el));
    pressTimers.set(el, window.setTimeout(() => el.classList.remove('is-pressing'), 420));
  };
  if (press !== 'tilt') return { onPointerDown: kick };
  return {
    onPointerMove: (e: PressEvent) => {
      const el = pressTarget(e);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.setProperty('--tilt-x', \`\${((0.5 - y) * 16).toFixed(2)}deg\`);
      el.style.setProperty('--tilt-y', \`\${((x - 0.5) * 16).toFixed(2)}deg\`);
      el.style.setProperty('--gx', \`\${(x * 100).toFixed(1)}%\`);
      el.style.setProperty('--gy', \`\${(y * 100).toFixed(1)}%\`);
    },
    onPointerLeave: (e: PressEvent) => {
      const el = pressTarget(e);
      if (!el) return;
      for (const v of ['--tilt-x', '--tilt-y', '--gx', '--gy']) el.style.removeProperty(v);
    }
  };
}
`;

// ---- wrappers, described as data so the live page and the kit render the same thing ----------

interface WrapSpec {
  component: string;
  props: Record<string, unknown>;
}

const round = (n: number) => Math.round(n * 100) / 100;
const btnClass = (g: ButtonGene) => `xbtn shape-${g.shape} skin-${g.skin} idle-${g.idle} press-${g.press} hover-${g.hover}`;
const cornerRadius = (g: ButtonGene): number => {
  const px = g.size * 16;
  if (g.shape === 'pill' || g.shape === 'circle') return 999;
  if (g.shape === 'rounded') return round(px * 0.35);
  if (g.shape === 'blob') return round(px * 0.9);
  return 0;
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb01(hex).map(v => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})` as `rgba(${number}, ${number}, ${number}, ${number})`;
};

const specularProps = (g: ButtonGene, p: Palette): Record<string, unknown> => ({
  className: btnClass(g),
  size: 'md',
  radius: cornerRadius(g),
  textColor: labelColor(g, p),
  lineColor: p.isLight ? p.fg : p.accent3,
  baseColor: p.accent,
  intensity: 1.2,
  autoAnimate: true,
  followMouse: true,
  proximity: 260
});

// Inner-to-outer list of wrappers around the button.
const wrapSpecs = (g: ButtonGene, p: Palette): WrapSpec[] => {
  const out: WrapSpec[] = [];
  switch (g.wrap) {
    case 'electric':
      out.push({ component: 'ElectricBorder', props: { color: p.accent, speed: 1, chaos: 0.12, borderRadius: g.shape === 'pill' || g.shape === 'circle' ? 999 : 12 } });
      break;
    case 'glare':
      out.push({ component: 'GlareHover', props: { width: 'auto', height: 'auto', background: 'transparent', borderColor: 'transparent', borderRadius: '999px', glareColor: p.fg, glareOpacity: 0.4 } });
      break;
    case 'borderglow':
      out.push({
        component: 'BorderGlow',
        props: { className: 'xwrap xwrap-borderglow', glowColor: `${p.hue} 90 ${p.isLight ? 45 : 70}`, backgroundColor: p.bg, borderRadius: 22, glowRadius: 28, glowIntensity: 1, coneSpread: 25, animated: true, colors: [p.accent, p.accent2, p.accent3], fillOpacity: 0.4 }
      });
      break;
    case 'pixel':
      out.push({ component: 'PixelCard', props: { className: 'xwrap xwrap-pixel', colors: [p.accent, p.accent2, p.accent3].join(','), gap: 6, speed: 35, noFocus: true } });
      break;
    case 'glass':
      out.push({
        component: 'GlassSurface',
        props: { className: 'xwrap xwrap-glass', width: 'auto', height: 'auto', borderRadius: 24, backgroundOpacity: 0.08, blur: 11, brightness: p.isLight ? 90 : 40, opacity: 0.9, saturation: 1.4 }
      });
      break;
    case 'spotlight':
      out.push({ component: 'SpotlightCard', props: { className: 'xwrap xwrap-spotlight', spotlightColor: rgba(p.accent, 0.35) } });
      break;
  }
  if (g.magnet) out.push({ component: 'Magnet', props: { padding: 120, magnetStrength: 3 } });
  if (g.spark) out.push({ component: 'ClickSpark', props: { sparkColor: p.accent2, sparkCount: 12, sparkRadius: 40, sparkSize: 14 } });
  return out;
};

// Materials load on demand; until one arrives the plain button is shown, so nothing pops in empty.
type AnyComponent = ComponentType<Record<string, unknown>>;
const REGISTRY = {
  ElectricBorder: lazy(() => import('../vendor/react-bits/ElectricBorder/ElectricBorder')),
  GlareHover: lazy(() => import('../vendor/react-bits/GlareHover/GlareHover')),
  BorderGlow: lazy(() => import('../vendor/react-bits/BorderGlow/BorderGlow')),
  PixelCard: lazy(() => import('../vendor/react-bits/PixelCard/PixelCard')),
  GlassSurface: lazy(() => import('../vendor/react-bits/GlassSurface/GlassSurface')),
  SpotlightCard: lazy(() => import('../vendor/react-bits/SpotlightCard/SpotlightCard')),
  Magnet: lazy(() => import('../vendor/react-bits/Magnet/Magnet')),
  ClickSpark: lazy(() => import('../vendor/react-bits/ClickSpark/ClickSpark'))
} as unknown as Record<string, AnyComponent>;
const SpecularButton = lazy(() => import('../vendor/react-bits/SpecularButton/SpecularButton')) as unknown as AnyComponent;

export const XButton = ({ gene, palette, onPress, onHover, children }: { gene: ButtonGene; palette: Palette; onPress: (e: React.MouseEvent) => void; onHover?: () => void; children: ReactNode }) => {
  const style = {
    '--bg': palette.bg,
    '--fg': palette.fg,
    '--a1': palette.accent,
    '--a2': palette.accent2,
    '--a3': palette.accent3,
    '--size': `${gene.size}rem`,
    color: labelColor(gene, palette)
  } as CSSProperties;
  const handlers = pressHandlers(gene.press);

  // SpecularButton is its own <button> (a button can't nest in a button), so it *becomes* ours;
  // a span carries the tokens, hover sound and press handlers it doesn't forward.
  const plain = (
    <button type="button" className={btnClass(gene)} style={style} onClick={onPress} onMouseEnter={onHover} aria-label="Change everything" {...handlers}>
      <span className="xbtn-label">{children}</span>
    </button>
  );
  let node: ReactNode =
    gene.wrap === 'specular' ? (
      <Suspense fallback={plain}>
        <span className="xwrap-specular" style={style} onMouseEnter={onHover} {...handlers}>
          <SpecularButton {...specularProps(gene, palette)} onClick={onPress}>
            <span className="xbtn-label">{children}</span>
          </SpecularButton>
        </span>
      </Suspense>
    ) : (
      plain
    );

  for (const w of wrapSpecs(gene, palette)) {
    const C = REGISTRY[w.component];
    const inner = node;
    node = (
      <Suspense fallback={inner}>
        <C {...w.props}>{inner}</C>
      </Suspense>
    );
  }
  return node;
};

// ---- export kit -------------------------------------------------------------------------------

const js = (v: unknown) => JSON.stringify(v);
const attrs = (props: Record<string, unknown>) =>
  Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (v === true ? k : `${k}={${js(v)}}`))
    .join(' ');

/**
 * JSX for the button (+ wrappers). Expects `press`, `sound`, `SOUND` in scope, and — when
 * pressNeedsJs(gene.press) — the `pressHandlers` helper from PRESS_HELPER_SOURCE.
 */
export const buttonKit = (gene: ButtonGene, palette: Palette, labelJsx: string): { jsx: string; components: string[] } => {
  const hover = `onMouseEnter={() => sound.current.hover(SOUND)}`;
  const pressAttr = pressNeedsJs(gene.press) ? ` {...pressHandlers(${js(gene.press)})}` : '';
  const label = `<span className="xbtn-label">${labelJsx}</span>`;
  const components: string[] = [];
  let node: string;
  if (gene.wrap === 'specular') {
    components.push('SpecularButton');
    node = `<span className={"xwrap-specular"} ${hover}${pressAttr}>
          <SpecularButton ${attrs(specularProps(gene, palette))} onClick={press}>
            ${label}
          </SpecularButton>
        </span>`;
  } else {
    node = `<button type="button" className={${js(btnClass(gene))}} style={{ color: ${js(labelColor(gene, palette))} }} onClick={press} ${hover} aria-label={"Change everything"}${pressAttr}>
          ${label}
        </button>`;
  }
  for (const w of wrapSpecs(gene, palette)) {
    components.push(w.component);
    node = `<${w.component} ${attrs(w.props)}>\n        ${node}\n        </${w.component}>`;
  }
  return { jsx: node, components };
};
