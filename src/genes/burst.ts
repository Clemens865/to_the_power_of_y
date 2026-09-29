import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';

// Press burst: something flies out of the button when it's pressed (confetti via @tsparticles/confetti, MIT,
// loaded lazily on first use), or a CSS shockwave ring. Rolled on its own stream (seed + ':burst').
const KINDS = ['none', 'none', 'none', 'confetti', 'stars', 'hearts', 'suits', 'firework', 'snow', 'emoji', 'shockwave'] as const;
const EMOJI = [['✨', '⭐'], ['🌈', '☁️'], ['🔥', '💥'], ['🍒', '🍋', '🍉'], ['👾', '🕹️'], ['🌸', '🌼'], ['🎲'], ['🪐', '🌙']];

export interface BurstGene {
  kind: (typeof KINDS)[number];
  count: number;
  spread: number;
  velocity: number;
  gravity: number;
  scalar: number;
  emoji: string[];
}

export const rollBurst = (rng: Rng): BurstGene => ({
  kind: rng.pick(KINDS),
  count: rng.int(40, 160),
  spread: rng.int(50, 360),
  velocity: rng.int(20, 55),
  gravity: Math.round(rng.range(0.3, 1.4) * 100) / 100,
  scalar: Math.round(rng.range(0.7, 1.6) * 100) / 100,
  emoji: rng.pick(EMOJI)
});

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const fireBurst = async (g: BurstGene, p: Palette, x: number, y: number) => {
  if (g.kind === 'none' || reducedMotion()) return;
  if (g.kind === 'shockwave') {
    const ring = document.createElement('div');
    ring.className = 'burst-shockwave';
    ring.style.cssText = `left:${x}px;top:${y}px;--ring:${p.accent}`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);
    return;
  }
  const { confetti } = await import('@tsparticles/confetti');
  const base = {
    particleCount: g.count,
    spread: g.spread,
    startVelocity: g.velocity,
    gravity: g.gravity,
    scalar: g.scalar,
    origin: { x: x / innerWidth, y: y / innerHeight },
    colors: [p.accent, p.accent2, p.accent3, p.fg],
    zIndex: 45,
    disableForReducedMotion: true
  };
  const shapes: Record<string, object> = {
    confetti: { shapes: ['square', 'circle'] },
    stars: { shapes: ['star'] },
    hearts: { shapes: ['heart'] },
    suits: { shapes: ['spades', 'hearts', 'diamonds', 'clubs'] },
    firework: { shapes: ['circle'], spread: 360, startVelocity: 45, gravity: 0.6, ticks: 120 },
    snow: { shapes: ['circle'], spread: 360, startVelocity: 12, gravity: 0.25, drift: 0.5, ticks: 260, colors: ['#ffffff', p.fg] },
    emoji: { shapes: ['emoji'], shapeOptions: { emoji: { value: g.emoji } }, scalar: g.scalar * 2 }
  };
  await confetti({ ...base, ...shapes[g.kind] });
};

export const BURST_CSS = `
.burst-shockwave { position: fixed; z-index: 45; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; border: 3px solid var(--ring); pointer-events: none; animation: shockwave 0.85s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes shockwave { to { transform: scale(40); opacity: 0; border-width: 0.5px; } }
`;
