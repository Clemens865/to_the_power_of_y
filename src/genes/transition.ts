import type { Rng } from '../engine/rng';

// Names map to ::view-transition keyframes in styles.css.
const TRANSITIONS = ['circle', 'wipe-left', 'wipe-up', 'blinds', 'zoom', 'spin', 'flip', 'dissolve', 'diamond', 'split'] as const;
export type TransitionGene = (typeof TRANSITIONS)[number];

export const rollTransition = (rng: Rng): TransitionGene => rng.pick(TRANSITIONS);
