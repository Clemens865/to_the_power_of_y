import type { CSSProperties } from 'react';
import type { Rng } from '../engine/rng';
import CircularText from '../vendor/react-bits/CircularText/CircularText';

// Layouts decorate the page around the button and decide where the button sits.
const KINDS = ['bare', 'bare', 'frame', 'poster', 'marquee', 'swiss', 'split', 'orbit'] as const;
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
  if (kind === 'orbit' || kind === 'poster') return { kind, x: 50, y: 50, split, vertical, marqueeSpeed };
  if (kind === 'swiss') return { kind, x: rng.pick([33, 67]), y: rng.pick([33, 67]), split, vertical, marqueeSpeed };
  return { kind, x: sx, y: sy, split, vertical, marqueeSpeed };
};

export interface DecorContext {
  seed: string;
  word: string;
  count: number;
}

// A layout is described as data so the live page and the exported component render the same markup.
export type DecorItem = { cls: string; text?: string; style?: CSSProperties } | { circular: string };

export const decorFor = (g: LayoutGene, ctx: DecorContext): DecorItem[] => {
  const w = ctx.word.trim() || 'xʸ';
  switch (g.kind) {
    case 'frame':
      return [
        { cls: 'lay-frame' },
        { cls: 'lay-corner lay-tl', text: 'x' },
        { cls: 'lay-corner lay-tr', text: `y = ${ctx.seed}` },
        { cls: 'lay-corner lay-bl', text: 'press to change' },
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
        { cls: 'lay-swiss-title', text: 'x to the power of y' },
        { cls: 'lay-swiss-num', text: ctx.seed }
      ];
    case 'split':
      return [{ cls: `lay-split ${g.vertical ? 'lay-split-v' : 'lay-split-h'}`, style: { [g.vertical ? 'width' : 'height']: `${g.split}%` } }];
    case 'orbit':
      return [{ circular: ` ${w} • x to the power of y • ` }];
    default:
      return [];
  }
};

export const Decor = ({ items }: { items: DecorItem[] }) => (
  <div className="layout" aria-hidden>
    {items.map((it, i) =>
      'circular' in it ? (
        <div key={i} className="lay-orbit">
          <CircularText text={it.circular} spinDuration={24} onHover="speedUp" />
        </div>
      ) : (
        <div key={i} className={it.cls} style={it.style}>
          {it.text}
        </div>
      )
    )}
  </div>
);

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
`;
