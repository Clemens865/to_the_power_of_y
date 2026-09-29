import type { Rng } from '../engine/rng';

// Rarity is rolled on its own stream (seed + ':rarity'), so it never shifts other genes.
export type Rarity = 'common' | 'rare' | 'legendary' | 'mythic';

export const RARITY_ODDS: Record<Exclude<Rarity, 'common'>, number> = { rare: 1 / 40, legendary: 1 / 250, mythic: 1 / 2000 };

export const rollRarity = (rng: Rng): Rarity => {
  const r = rng.next();
  if (r < RARITY_ODDS.mythic) return 'mythic';
  if (r < RARITY_ODDS.mythic + RARITY_ODDS.legendary) return 'legendary';
  if (r < RARITY_ODDS.mythic + RARITY_ODDS.legendary + RARITY_ODDS.rare) return 'rare';
  return 'common';
};

export const RARITY_LABEL: Record<Rarity, string> = { common: '', rare: '◆ rare · 1 in 40', legendary: '★ legendary · 1 in 250', mythic: '✺ mythic · 1 in 2,000' };

// Rare+ buttons get a holographic foil; legendary gets a gilded palette; mythic slowly drifts through every hue.
export const RARITY_CSS = `
/* applied to the wrapper around the button: a drop-shadow follows the button's exact shape */
.rarity-holo { animation: holo-glow 3s linear infinite; }
@keyframes holo-glow {
  0% { filter: drop-shadow(0 0 10px #ff4fd8) drop-shadow(0 0 2px #fff); }
  33% { filter: drop-shadow(0 0 14px #4fe3ff) drop-shadow(0 0 2px #fff); }
  66% { filter: drop-shadow(0 0 12px #ffe94f) drop-shadow(0 0 2px #fff); }
  100% { filter: drop-shadow(0 0 10px #ff4fd8) drop-shadow(0 0 2px #fff); }
}
@keyframes holo-sheen { to { background-position: -250% 0; } }
.rarity-mythic { animation: mythic-drift 24s linear infinite; }
@keyframes mythic-drift { to { filter: hue-rotate(360deg); } }
.rarity-badge { position: absolute; top: 14px; left: 16px; z-index: 50; font: 11px/1 ui-monospace, SFMono-Regular, monospace; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 11px; border-radius: 999px; color: #111; background: linear-gradient(115deg, #ffe9a8, #ffd1f3, #b9f3ff, #ffe9a8); background-size: 300% 100%; animation: holo-sheen 4s linear infinite; }
@media (prefers-reduced-motion: reduce) { .rarity-holo, .rarity-mythic, .rarity-badge { animation: none; } }
`;
