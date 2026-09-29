import type { Rng } from '../engine/rng';

// Named transitions map to ::view-transition keyframes in styles.css.
// Generated ones are built per universe from the seed (shape, angle, count, timing) and injected at runtime.
const NAMED = ['circle', 'wipe-left', 'wipe-up', 'blinds', 'zoom', 'spin', 'flip', 'dissolve', 'diamond', 'split', 'blur-slide', 'scale-blur'] as const;
const GENERATED = ['iris', 'sweep', 'soft-wipe', 'stripes', 'checker'] as const;
const EASINGS = ['cubic-bezier(.7,0,.2,1)', 'cubic-bezier(.2,.9,.3,1.2)', 'cubic-bezier(.9,0,.1,1)', 'ease-in-out', 'cubic-bezier(.5,0,.75,0)'];

export interface TransitionGene {
  kind: (typeof NAMED)[number] | (typeof GENERATED)[number] | 'pixels';
  duration: number; // seconds
  easing: string;
  sides: number; // iris polygon sides
  angle: number; // degrees, for sweep / wipe / stripes
  count: number; // stripes / checker cells / pixels across the longest viewport edge
}

export const rollTransition = (rng: Rng): TransitionGene => ({
  kind: rng.chance(0.5) ? rng.pick(NAMED) : rng.pick(GENERATED),
  duration: Math.round(rng.range(0.5, 1.1) * 100) / 100,
  easing: rng.pick(EASINGS),
  sides: rng.int(3, 12),
  angle: rng.int(0, 359),
  count: rng.int(4, 14)
});

// Call on a separate stream: the original transition roll must keep consuming exactly the same draws.
export const rollPixelTransition = (rng: Rng, existing: TransitionGene): TransitionGene =>
  rng.chance(0.15)
    ? { ...existing, kind: 'pixels', count: rng.int(10, 18), duration: Math.round(rng.range(0.7, 1.05) * 100) / 100 }
    : existing;

export const isGenerated = (g: TransitionGene) => (GENERATED as readonly string[]).includes(g.kind);

const polygonAt = (x: number, y: number, r: number, sides: number, rot: number) =>
  `polygon(${Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * Math.PI * 2;
    return `${Math.round(x + Math.cos(a) * r)}px ${Math.round(y + Math.sin(a) * r)}px`;
  }).join(', ')})`;

// CSS for a generated transition, starting from the press point (x, y) in viewport pixels.
export const generatedTransitionCss = (g: TransitionGene, x: number, y: number): string => {
  const head = `::view-transition-new(root) { animation: vt-gen ${g.duration}s ${g.easing} both; }\n::view-transition-old(root) { animation: none; }`;
  const big = Math.hypot(innerWidth, innerHeight) * 1.6;
  switch (g.kind) {
    case 'iris': {
      const rot = (g.angle * Math.PI) / 180;
      return `${head}\n@keyframes vt-gen { from { clip-path: ${polygonAt(x, y, 0, g.sides, rot)}; } to { clip-path: ${polygonAt(x, y, big, g.sides, rot + Math.PI / 3)}; } }`;
    }
    case 'sweep':
      return `@property --vt-sweep { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
${head}
::view-transition-new(root) { mask-image: conic-gradient(from ${g.angle}deg at ${x}px ${y}px, #000 var(--vt-sweep), transparent var(--vt-sweep)); }
@keyframes vt-gen { from { --vt-sweep: 0deg; } to { --vt-sweep: 360deg; } }`;
    case 'soft-wipe':
      return `@property --vt-p { syntax: '<percentage>'; inherits: false; initial-value: -30%; }
${head}
::view-transition-new(root) { mask-image: linear-gradient(${g.angle}deg, #000 var(--vt-p), transparent calc(var(--vt-p) + 30%)); }
@keyframes vt-gen { from { --vt-p: -30%; } to { --vt-p: 100%; } }`;
    case 'stripes':
      return `@property --vt-w { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
${head}
::view-transition-new(root) { mask-image: repeating-linear-gradient(${g.angle}deg, #000 0 var(--vt-w), transparent var(--vt-w) ${(100 / g.count).toFixed(2)}%); }
@keyframes vt-gen { from { --vt-w: 0%; } to { --vt-w: ${(100 / g.count).toFixed(2)}%; } }`;
    case 'checker': {
      const cell = Math.round(Math.max(innerWidth, innerHeight) / g.count);
      return `@property --vt-r { syntax: '<length>'; inherits: false; initial-value: 0px; }
${head}
::view-transition-new(root) { mask-image: radial-gradient(circle, #000 var(--vt-r), transparent var(--vt-r)); mask-size: ${cell}px ${cell}px; mask-position: ${x}px ${y}px; }
@keyframes vt-gen { from { --vt-r: 0px; } to { --vt-r: ${Math.round(cell * 0.75)}px; } }`;
    }
    default:
      return '';
  }
};
