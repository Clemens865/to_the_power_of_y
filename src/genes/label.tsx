import { lazy, Suspense, type ComponentType, type CSSProperties } from 'react';
import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';
import type { FontGene } from '../engine/fonts';

const WORDS = ['y', 'xʸ', 'press', 'again', 'change', 'another y', 'roll', 'mutate', 'next', 'go', '↻', '✺', '?', 'y + 1', 'more', 'different', 'push', 'reroll', 'now'];
// Order is part of the seed contract: append, don't reorder.
const EFFECTS = [
  'plain', 'shiny', 'gradient', 'decrypt', 'fuzzy', 'type', 'rotate', 'blur',
  'splitflap', 'scramble', 'depth', 'echo', 'stroke', 'warp', 'particle', 'pressure', 'tech', 'fold', 'focus', 'split'
] as const;
export type LabelEffect = (typeof EFFECTS)[number];

export interface LabelGene {
  text: string;
  effect: LabelEffect;
  speed: number;
}

export const rollLabel = (rng: Rng): LabelGene => ({
  text: rng.pick(WORDS),
  effect: rng.pick(EFFECTS),
  speed: rng.range(0.6, 1.6)
});

export const labelUsesWebGL = (effect: LabelEffect): boolean => effect === 'warp';

const COMPONENTS: Record<LabelEffect, string | null> = {
  plain: null, shiny: 'ShinyText', gradient: 'GradientText', decrypt: 'DecryptedText', fuzzy: 'FuzzyText',
  type: 'TextType', rotate: 'RotatingText', blur: 'BlurText', splitflap: 'SplitFlapText', scramble: 'ScrambledText',
  depth: 'DepthText', echo: 'EchoText', stroke: 'StrokeText', warp: 'WarpText', particle: 'ParticleText',
  pressure: 'TextPressure', tech: 'TechText', fold: 'FoldText', focus: 'TrueFocus', split: 'SplitText'
};

// Google Fonts in the font pool that ship variable axes TextPressure can drive (wght, some wdth).
// Static families can't respond to font-variation-settings, so 'pressure' falls back to plain text there.
const VARIABLE_AXES: Record<string, string> = {
  'Bricolage Grotesque': 'wdth,wght@75..100,200..800',
  'Space Grotesk': 'wght@300..700',
  Syne: 'wght@400..800',
  Unbounded: 'wght@200..900',
  'Playfair Display': 'wght@400..900',
  Fraunces: 'wght@100..900',
  'JetBrains Mono': 'wght@100..800',
  Orbitron: 'wght@400..900',
  Caveat: 'wght@400..700'
};
const pressureFontUrl = (family: string): string | null => {
  const axes = VARIABLE_AXES[family];
  return axes ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axes}&display=swap` : null;
};

const round = (n: number) => Math.round(n * 100) / 100;

// Canvas/WebGL labels need an explicit box: sized from the text length and the button font.
const boxFor = (text: string, fontPx: number, wFactor: number, hFactor: number): CSSProperties => ({
  width: Math.round(Math.max(1, [...text].length) * fontPx * wFactor + fontPx * 0.6),
  height: Math.round(fontPx * hFactor)
});

/**
 * Every label is described once as { component, props, children }; the live page renders it and the
 * export kit stringifies it, so both stay in sync.
 */
interface LabelSpec {
  component: string | null; // null = plain <span>
  props: Record<string, unknown>;
  children?: string;
  wrapStyle?: CSSProperties; // outer <span> for components that size from their parent
}

const specFor = (gene: LabelGene, palette: Palette, font: FontGene, color: string, fontPx: number): LabelSpec => {
  const { text, speed } = gene;
  const p = palette;
  const family = `"${font.family}"`;
  const effect = gene.effect === 'pressure' && !pressureFontUrl(font.family) ? 'plain' : gene.effect;
  const c = COMPONENTS[effect];
  switch (effect) {
    case 'shiny':
      return { component: c, props: { text, color, shineColor: p.accent3, speed: round(2 / speed) } };
    case 'gradient':
      return { component: c, props: { colors: [p.accent, p.accent2, p.accent3, p.accent], animationSpeed: round(6 / speed) }, children: text };
    case 'decrypt':
      return { component: c, props: { text, animateOn: 'view', speed: round(40 / speed), maxIterations: 14, sequential: true, revealDirection: 'center' } };
    case 'fuzzy':
      return { component: c, props: { fontSize: round(fontPx), fontWeight: font.weight, fontFamily: family, color, baseIntensity: round(0.12 * speed), hoverIntensity: 0.5, enableHover: true }, children: text };
    case 'type':
      return { component: c, props: { text: [text, 'xʸ', text], typingSpeed: round(70 / speed), pauseDuration: 1800, showCursor: true, cursorCharacter: '▍' } };
    case 'rotate':
      return { component: c, props: { texts: [text, 'xʸ', 'y', text], rotationInterval: round(1600 / speed), staggerDuration: 0.02, splitBy: 'characters' } };
    case 'blur':
      return { component: c, props: { text, animateBy: 'letters', delay: round(60 / speed), direction: 'top' } };
    case 'splitflap':
      return {
        component: c,
        props: {
          words: [text, 'xʸ', 'y'], padTo: Math.max([...text].length, 2), fontSize: round(fontPx * 0.8), gap: round(fontPx * 0.06),
          tileRadius: round(fontPx * 0.1), tileColor: p.fg, textColor: p.bg, flipDuration: round(0.12 / speed), cycleDelay: Math.round(2400 / speed), charset: 'alphanumeric'
        }
      };
    case 'scramble':
      return { component: c, props: { radius: Math.round(fontPx * 3), duration: round(1.2 / speed), speed: 0.5, scrambleChars: '.:xy' }, children: text };
    case 'depth':
      return {
        component: c,
        props: { text, faceColor: color, depthColor: p.accent, layers: 14, depth: round(Math.max(0.6, fontPx * 0.035)), tilt: 9, orbitSpeed: round(0.3 * speed), fontSize: `${round(fontPx)}px`, fontWeight: font.weight, shadow: false }
      };
    case 'echo':
      return {
        component: c,
        props: { text, color, tint: p.accent2, echoes: 8, offset: Math.round(fontPx * 0.45), direction: speed > 1.1 ? 'diagonal' : 'right', mode: 'both', cursorRadius: 360, duration: Math.round(900 / speed), fontSize: `${round(fontPx)}px`, fontWeight: font.weight, blur: 2 }
      };
    case 'stroke':
      return {
        component: c,
        props: { text, strokeColor: p.accent, fillColor: color, strokeWidth: round(Math.max(1, fontPx / 40)), drawDuration: round(1.4 / speed), trigger: speed > 1.1 ? 'loop' : 'mount', fillMode: 'wipe', fontSize: Math.round(fontPx), fontWeight: font.weight, letterSpacing: 0 }
      };
    case 'warp':
      return {
        component: c,
        props: { text, color, fontSize: Math.round(fontPx), fontWeight: font.weight, fontFamily: family, letterSpacing: '0', speed: round(0.55 * speed), warpStrength: 0.12, pointerInfluence: 0.5, style: { ...boxFor(text, fontPx, 0.66, 1.5), minHeight: 0 } }
      };
    case 'particle':
      return {
        component: c,
        props: {
          text, color, highlightColor: p.accent, trigger: 'mount', fontSize: Math.round(fontPx), fontWeight: font.weight, fontFamily: family,
          particleSize: round(Math.max(1, fontPx / 30)), density: fontPx < 40 ? 2 : 3, scatter: Math.round(fontPx * 2.5), repelRadius: Math.round(fontPx * 1.5),
          pointerRepel: Math.round(fontPx * 0.5), gatherDuration: Math.round(1600 / speed), glow: !p.isLight, style: { ...boxFor(text, fontPx, 0.7, 1.6), minHeight: 0 }
        }
      };
    case 'pressure':
      // TextPressure sizes its font as containerWidth / (chars / 2), so a box of chars/2 × fontPx gives fontPx.
      return {
        component: c,
        props: { text, fontFamily: family, fontUrl: pressureFontUrl(font.family), textColor: color, minFontSize: Math.round(fontPx * 0.6), width: true, weight: true, italic: false, flex: true },
        wrapStyle: { display: 'inline-block', width: Math.round(Math.max(1, [...text].length / 2) * fontPx), height: Math.round(fontPx * 1.1) }
      };
    case 'tech':
      return {
        component: c,
        props: {
          text, fontFamily: family, fontWeight: font.weight, fontSize: Math.round(fontPx), color, accentColor: p.accent, reach: Math.round(fontPx * 3),
          labels: false, selection: false, draggable: false, sweep: true, speed: round(speed), specks: 6, strokeWidth: round(Math.max(1, fontPx / 50)),
          style: boxFor(text, fontPx, 0.72, 1.7)
        }
      };
    case 'fold':
      return { component: c, props: { text, trigger: 'mount', hinge: speed > 1.1 ? 'bottom' : 'top', duration: round(0.65 / speed), stagger: 0.045, fontSize: 'inherit', fontWeight: 'inherit', color } };
    case 'focus': {
      const multi = text.trim().includes(' ');
      return {
        component: c,
        props: {
          sentence: multi ? text : [...text].join(' '), separator: multi ? ' ' : ' ', blurAmount: round(Math.max(1.5, fontPx / 18)),
          borderColor: p.accent, glowColor: p.accent2, animationDuration: round(0.5 / speed), pauseBetweenAnimations: round(0.9 / speed)
        }
      };
    }
    case 'split':
      return {
        component: c,
        props: { text, tag: 'span', splitType: 'chars', delay: Math.round(50 / speed), duration: round(0.9 / speed), from: { opacity: 0, y: '0.6em' }, to: { opacity: 1, y: 0 }, threshold: 0, rootMargin: '0px', trigger: 'mount' }
      };
    default:
      return { component: null, props: {}, children: text };
  }
};

// Each effect is its own lazily loaded chunk; the plain word shows until it arrives.
type AnyComponent = ComponentType<Record<string, unknown>>;
const REGISTRY: Record<string, AnyComponent> = {
  ShinyText: lazy(() => import('../vendor/react-bits/ShinyText/ShinyText')),
  GradientText: lazy(() => import('../vendor/react-bits/GradientText/GradientText')),
  DecryptedText: lazy(() => import('../vendor/react-bits/DecryptedText/DecryptedText')),
  FuzzyText: lazy(() => import('../vendor/react-bits/FuzzyText/FuzzyText')),
  TextType: lazy(() => import('../vendor/react-bits/TextType/TextType')),
  RotatingText: lazy(() => import('../vendor/react-bits/RotatingText/RotatingText')),
  BlurText: lazy(() => import('../vendor/react-bits/BlurText/BlurText')),
  SplitFlapText: lazy(() => import('../vendor/react-bits/SplitFlapText/SplitFlapText')),
  ScrambledText: lazy(() => import('../vendor/react-bits/ScrambledText/ScrambledText')),
  DepthText: lazy(() => import('../vendor/react-bits/DepthText/DepthText')),
  EchoText: lazy(() => import('../vendor/react-bits/EchoText/EchoText')),
  StrokeText: lazy(() => import('../vendor/react-bits/StrokeText/StrokeText')),
  WarpText: lazy(() => import('../vendor/react-bits/WarpText/WarpText')),
  ParticleText: lazy(() => import('../vendor/react-bits/ParticleText/ParticleText')),
  TextPressure: lazy(() => import('../vendor/react-bits/TextPressure/TextPressure')),
  TechText: lazy(() => import('../vendor/react-bits/TechText/TechText')),
  FoldText: lazy(() => import('../vendor/react-bits/FoldText/FoldText')),
  TrueFocus: lazy(() => import('../vendor/react-bits/TrueFocus/TrueFocus')),
  SplitText: lazy(() => import('../vendor/react-bits/SplitText/SplitText')),
} as unknown as Record<string, AnyComponent>;

export const Label = ({ gene, palette, font, color, fontPx }: { gene: LabelGene; palette: Palette; font: FontGene; color: string; fontPx: number }) => {
  const spec = specFor(gene, palette, font, color, fontPx);
  if (!spec.component) return <span>{spec.children}</span>;
  const C = REGISTRY[spec.component];
  const node = (
    <Suspense fallback={<span>{gene.text}</span>}>
      <C {...spec.props}>{spec.children}</C>
    </Suspense>
  );
  return spec.wrapStyle ? <span style={spec.wrapStyle}>{node}</span> : node;
};

// ---- export kit -------------------------------------------------------------------------------

const js = (v: unknown) => JSON.stringify(v);
const attrs = (props: Record<string, unknown>) =>
  Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (v === true ? k : `${k}={${js(v)}}`))
    .join(' ');

// The kit installs the official React Bits registry versions: our local SplitText patch (trigger) is not
// there, but threshold 0 + rootMargin 0px make the stock ScrollTrigger fire at once for a visible label.
const KIT_ONLY_DROP: Record<string, string[]> = { SplitText: ['trigger'] };

export const labelKit = (gene: LabelGene, palette: Palette, font: FontGene, color: string, fontPx: number): { jsx: string; components: string[] } => {
  const spec = specFor(gene, palette, font, color, fontPx);
  if (!spec.component) return { jsx: `<span>{${js(spec.children ?? '')}}</span>`, components: [] };
  const drop = KIT_ONLY_DROP[spec.component] ?? [];
  const props = Object.fromEntries(Object.entries(spec.props).filter(([k]) => !drop.includes(k)));
  const a = attrs(props);
  const open = `<${spec.component}${a ? ` ${a}` : ''}`;
  let jsx = spec.children !== undefined ? `${open}>{${js(spec.children)}}</${spec.component}>` : `${open} />`;
  if (spec.wrapStyle) jsx = `<span style={${js(spec.wrapStyle)}}>${jsx}</span>`;
  return { jsx, components: [spec.component] };
};
