import { createRng } from './rng';
import type { TransitionGene } from '../genes/transition';

export interface PixelPlan {
  columns: number;
  rows: number;
  coverMs: number;
  holdMs: number;
  revealMs: number;
  tiles: { color: string; coverAt: number; revealAt: number }[];
}

const bounded = (value: number, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

// Independent seed stream, capped at 324 plain DOM tiles even on large or very narrow screens.
export const planPixelTransition = (
  seed: string, gene: TransitionGene, width: number, height: number, colors: readonly string[]
): PixelPlan => {
  const rng = createRng(`${seed}:pixel-tiles`);
  const w = bounded(width, 1, 1, 100000);
  const h = bounded(height, 1, 1, 100000);
  const density = Math.round(bounded(gene.count, 14, 6, 18));
  const cell = Math.max(w, h) / density;
  const columns = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const duration = bounded(gene.duration, 0.85, 0.3, 1.5) * 1000;
  const coverMs = duration * 0.45;
  const holdMs = duration * 0.1;
  const revealMs = duration * 0.45;
  const total = columns * rows;
  const order = () => {
    const indices = Array.from({ length: total }, (_, index) => index);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };
  const cover = order();
  const reveal = order();
  const palette = colors.length ? colors : ['#111111'];
  const tiles = Array.from({ length: total }, (_, index) => ({
    color: rng.pick(palette),
    coverAt: (cover[index] / total) * coverMs,
    revealAt: (reveal[index] / total) * revealMs
  }));
  return { columns, rows, coverMs, holdMs, revealMs, tiles };
};

export interface PixelTransition {
  cancel(): void;
  finished: Promise<void>;
}

/** Covers the viewport with colored tiles, swaps once, then uncovers it. Never snapshots canvas content. */
export const startPixelTransition = (options: {
  seed: string;
  gene: TransitionGene;
  colors: readonly string[];
  apply(): void;
  reducedMotion?: boolean;
}): PixelTransition => {
  if (options.reducedMotion || document.hidden) {
    options.apply();
    return { cancel() {}, finished: Promise.resolve() };
  }
  const plan = planPixelTransition(options.seed, options.gene, innerWidth, innerHeight, options.colors);
  const overlay = document.createElement('div');
  overlay.dataset.pixelTransition = '';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '2147483646', pointerEvents: 'none',
    display: 'grid', gridTemplateColumns: `repeat(${plan.columns}, 1fr)`,
    gridTemplateRows: `repeat(${plan.rows}, 1fr)`, contain: 'strict'
  });
  const tiles = plan.tiles.map(tile => {
    const element = document.createElement('div');
    // Overlap a fraction of a pixel to prevent seams at fractional viewport/device scales.
    Object.assign(element.style, { backgroundColor: tile.color, opacity: '0', margin: '-0.5px' });
    overlay.appendChild(element);
    return element;
  });
  document.body.appendChild(overlay);
  let frame = 0;
  let start: number | undefined;
  let revealedAt: number | undefined;
  let covered = false;
  let stopped = false;
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const cancel = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVisibility);
    overlay.remove();
    finish();
  };
  const onVisibility = () => {
    if (!document.hidden || stopped) return;
    try {
      if (!covered) { covered = true; options.apply(); }
    } finally { cancel(); }
  };
  const tick = (now: number) => {
    if (stopped) return;
    start ??= now;
    if (!covered) {
      const elapsed = now - start;
      tiles.forEach((tile, i) => {
        if (elapsed >= plan.tiles[i].coverAt) tile.style.opacity = '1';
      });
      if (elapsed >= plan.coverMs) {
        covered = true;
        try { options.apply(); } catch (error) { cancel(); throw error; }
      }
    } else {
      // Start after the synchronous render, giving even a slow covered page a paint before uncovering.
      revealedAt ??= now;
      const elapsed = now - revealedAt - plan.holdMs;
      tiles.forEach((tile, i) => {
        if (elapsed >= plan.tiles[i].revealAt) tile.style.opacity = '0';
      });
      if (elapsed >= plan.revealMs) { cancel(); return; }
    }
    if (!stopped) frame = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', onVisibility);
  frame = requestAnimationFrame(tick);
  return { cancel, finished };
};
