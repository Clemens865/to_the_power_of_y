import type { Rng } from '../engine/rng';

// The copy's tone of voice: label words plus the lines layouts print around the button.
// Rolled on its own stream (seed + ':voice').
interface Tone {
  words: string[];
  taglines: string[];
  hints: string[];
}

const TONES: Record<string, Tone> = {
  classic: { words: ['y', 'xʸ', 'press', 'again', 'change', 'another y', 'roll', 'mutate', 'next', 'go', '↻', '✺', '?', 'y + 1', 'more', 'different', 'push', 'reroll', 'now'], taglines: ['x to the power of y'], hints: ['press to change'] },
  deadpan: { words: ['button', 'ok', 'fine', 'sure', 'whatever', 'press it', 'this one', 'yes', 'next, i guess'], taglines: ['a button. it changes things.', 'nothing to see here', 'this is a website'], hints: ['you could press it', 'or not'] },
  poetic: { words: ['bloom', 'unfold', 'drift', 'become', 'dissolve', 'begin again', 'elsewhere', 'wander'], taglines: ['every press, a different sky', 'all the worlds you almost saw', 'somewhere a y is waiting'], hints: ['touch lightly', 'let it change'] },
  shouty: { words: ['PRESS!', 'NOW!!', 'AGAIN!', 'MORE!', 'GO GO GO', 'DO IT', 'YES!', 'BOOM'], taglines: ['UNLIMITED UNIVERSES!!!', 'NEVER THE SAME TWICE!', 'PRESS THE BUTTON!'], hints: ['DO IT NOW', 'WHY ARE YOU WAITING'] },
  bureaucratic: { words: ['submit', 'proceed', 'confirm', 'file y', 'approve', 'next form', 'continue', 'form 27-y'], taglines: ['department of variation', 'request for new universe', 'form y — please retain for your records'], hints: ['press once. allow 0.7s for processing', 'thank you for your patience'] },
  cosmic: { words: ['warp', 'collapse', 'observe', 'jump', 'ignite', 'orbit', 'big bang', 'rewrite'], taglines: ['one of 10¹⁹ universes', 'the multiverse, one press at a time', 'you are here. for now.'], hints: ['observe to collapse', 'reality is a seed'] },
  tender: { words: ['hi', 'hello', 'one more?', 'try me', 'go on', 'here', 'for you', 'another'], taglines: ['made one just for you', 'this one is yours', 'hope you like this one'], hints: ['take your time', 'no wrong answers'] },
  machine: { words: ['EXEC', 'RUN', '0x', 'SEED++', 'SPAWN', 'FORK', 'y=rand()', 'NEXT()'], taglines: ['GENOME LOADED', 'PROCESS: UNIVERSE', 'x ^ y :: OK'], hints: ['AWAITING INPUT', 'PRESS TO EXEC'] }
};

export interface VoiceGene {
  tone: string;
  word: string;
  tagline: string;
  hint: string;
}

export const rollVoice = (rng: Rng, seed: string): VoiceGene => {
  const tone = rng.chance(0.4) ? 'classic' : rng.pick(Object.keys(TONES));
  const t = TONES[tone];
  const word = rng.pick(t.words);
  // '0x' stands for the seed's first hex digits
  return { tone, word: word === '0x' ? `0x${seed.slice(0, 4)}` : word, tagline: rng.pick(t.taglines), hint: rng.pick(t.hints) };
};
