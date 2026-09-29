import { createRng } from './rng';
import { rollPalette, type Palette } from './palette';
import { rollFont, type FontGene } from './fonts';
import { rollBackground, backgroundUsesWebGL, type BackgroundGene } from '../genes/backgrounds';
import { rollButton, rollHover, rollEntrance, buttonUsesWebGL, type ButtonGene } from '../genes/button';
import { rollLabel, labelUsesWebGL, type LabelGene } from '../genes/label';
import { rollTransition, type TransitionGene } from '../genes/transition';
import { rollCursor, cursorUsesWebGL, downgradeCursor, type CursorGene } from '../genes/cursor';
import { rollLayout, layoutUsesWebGL, type LayoutGene } from '../genes/layout';
import { rollSound, type SoundGene } from './sound';
import { rollOverlay, overlayUsesWebGL, type OverlayGene } from '../genes/overlay';
import { rollRarity, type Rarity } from '../genes/rarity';
import { rollVoice, type VoiceGene } from '../genes/voice';
import { rollBurst, type BurstGene } from '../genes/burst';
import { rollBehaviour, type BehaviourGene } from '../genes/behaviour';

export interface Genome {
  seed: string;
  name: string; // filled in asynchronously by the app (see genes/name.ts); '' until then
  rarity: Rarity;
  palette: Palette;
  font: FontGene;
  background: BackgroundGene;
  button: ButtonGene;
  label: LabelGene;
  transition: TransitionGene;
  cursor: CursorGene;
  layout: LayoutGene;
  sound: SoundGene;
  overlay: OverlayGene;
  voice: VoiceGene;
  burst: BurstGene;
  behaviour: BehaviourGene;
}

// Legendary universes trade their palette for black and gold.
const GILDED: Palette = { mood: 'gilded', isLight: false, bg: '#0b0906', fg: '#f7e7b4', accent: '#d4af37', accent2: '#f5d77a', accent3: '#8a6d1f', hue: 45 };

// Never run more than this many WebGL contexts at once (phones struggle, browsers cap at ~16).
const MAX_WEBGL_LAYERS = 2;

export const grow = (seed: string): Genome => {
  // Main stream: order matters, changing it changes what every existing seed looks like.
  const rng = createRng(seed);
  // Genes added from v0.3 on get their own streams, so adding more never shifts the others.
  const sub = (name: string) => createRng(`${seed}:${name}`);

  const rarity = rollRarity(sub('rarity'));
  const rolled = rollPalette(rng);
  const palette = rarity === 'legendary' ? GILDED : rolled;
  const font = rollFont(rng);
  const background = rollBackground(rng, palette);
  let button = rollButton(rng);
  let label = rollLabel(rng);
  const transition = rollTransition(rng);
  let cursor = rollCursor(rng, palette);
  let layout = rollLayout(rng);
  const sound = rollSound(rng, palette.hue);
  let overlay = rollOverlay(sub('overlay'), palette);
  const voice = rollVoice(sub('voice'), seed);
  let burst = rollBurst(sub('burst'));
  const behaviour = rollBehaviour(sub('behaviour'));

  label = { ...label, text: voice.word };
  button = { ...button, hover: rollHover(sub('hover')), entrance: rollEntrance(sub('entrance')) };
  // Legendary and mythic universes always celebrate.
  if ((rarity === 'legendary' || rarity === 'mythic') && burst.kind === 'none') burst = { ...burst, kind: 'stars' };

  // GPU budget: the background always keeps its context; extras are dropped in this order.
  const budget = sub('budget');
  const count = () =>
    [backgroundUsesWebGL(background.id), overlayUsesWebGL(overlay), cursorUsesWebGL(cursor), layoutUsesWebGL(layout.kind), buttonUsesWebGL(button), labelUsesWebGL(label.effect)].filter(Boolean).length;
  if (count() > MAX_WEBGL_LAYERS && overlayUsesWebGL(overlay)) overlay = { ...overlay, kind: 'none', props: {} };
  if (count() > MAX_WEBGL_LAYERS && cursorUsesWebGL(cursor)) cursor = downgradeCursor(cursor, budget, palette);
  if (count() > MAX_WEBGL_LAYERS && layoutUsesWebGL(layout.kind)) layout = { ...layout, kind: 'frame' };
  if (count() > MAX_WEBGL_LAYERS && buttonUsesWebGL(button)) button = { ...button, wrap: 'none' };
  if (count() > MAX_WEBGL_LAYERS && labelUsesWebGL(label.effect)) label = { ...label, effect: 'shiny' };

  return {
    seed,
    name: '',
    rarity,
    palette,
    font,
    background,
    button,
    label,
    transition,
    cursor,
    layout,
    sound,
    overlay,
    voice,
    burst,
    behaviour
  };
};
