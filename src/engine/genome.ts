import { createRng } from './rng';
import { rollPalette, type Palette } from './palette';
import { rollFont, type FontGene } from './fonts';
import { rollBackground, type BackgroundGene } from '../genes/backgrounds';
import { rollButton, type ButtonGene } from '../genes/button';
import { rollLabel, type LabelGene } from '../genes/label';
import { rollTransition, type TransitionGene } from '../genes/transition';
import { rollCursor, type CursorGene } from '../genes/cursor';
import { rollLayout, type LayoutGene } from '../genes/layout';
import { rollSound, type SoundGene } from './sound';

export interface Genome {
  seed: string;
  palette: Palette;
  font: FontGene;
  background: BackgroundGene;
  button: ButtonGene;
  label: LabelGene;
  transition: TransitionGene;
  cursor: CursorGene;
  layout: LayoutGene;
  sound: SoundGene;
}

// Order matters: changing it changes what every existing seed looks like.
export const grow = (seed: string): Genome => {
  const rng = createRng(seed);
  const palette = rollPalette(rng);
  const font = rollFont(rng);
  const background = rollBackground(rng, palette);
  const button = rollButton(rng);
  const label = rollLabel(rng);
  const transition = rollTransition(rng);
  // Added in v0.2 — appended so v0.1 seeds keep their look.
  const cursor = rollCursor(rng, palette);
  const layout = rollLayout(rng);
  const sound = rollSound(rng, palette.hue);
  return { seed, palette, font, background, button, label, transition, cursor, layout, sound };
};
