import { createRng } from './rng';
import { rollPalette, type Palette } from './palette';
import { rollFont, type FontGene } from './fonts';
import { rollBackground, rollLibraryBackground, backgroundUsesWebGL, type BackgroundGene } from '../genes/backgrounds';
import { rollButton, rollHover, rollEntrance, rollTicketButton, rollGestureButton, buttonOwnsAction, buttonUsesWebGL, type ButtonGene } from '../genes/button';
import { rollLabel, labelUsesWebGL, type LabelGene } from '../genes/label';
import { rollTransition, rollPixelTransition, type TransitionGene } from '../genes/transition';
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
  let background = rollBackground(rng, palette);
  let button = rollButton(rng);
  let label = rollLabel(rng);
  const transition = rollPixelTransition(sub('pixel-transition'), rollTransition(rng));
  let cursor = rollCursor(rng, palette);
  let layout = rollLayout(rng);
  const sound = rollSound(rng, palette.hue);
  let overlay = rollOverlay(sub('overlay'), palette);
  const voice = rollVoice(sub('voice'), seed);
  let burst = rollBurst(sub('burst'));
  let behaviour = rollBehaviour(sub('behaviour'));

  label = { ...label, text: voice.word };
  button = rollTicketButton(sub('ticket'), { ...button, hover: rollHover(sub('hover')), entrance: rollEntrance(sub('entrance')) });
  button = rollGestureButton(sub('gesture-button'), button);
  // These additions use independent streams: existing palettes, type, voice and sound keep their rolls.
  background = rollLibraryBackground(sub('library-backgrounds'), palette, {
    seed,
    phrase: `${voice.word} / ${seed} / ${voice.tagline} / `,
    fontFamily: font.family
  }) ?? background;
  if (buttonOwnsAction(button)) {
    behaviour = { ...behaviour, kind: 'still', amp: 0 };
    layout = { ...layout, x: 50, y: Math.min(72, Math.max(28, layout.y)) };
  }
  if (button.interaction === 'hold' || button.interaction === 'sling') {
    // The controls have their own motion. HoldButton duplicates the label for its fill mask.
    label = { ...label, effect: 'plain' };
    layout = { ...layout, y: 50 };
  }
  // Compose still lifes around the final button position, including centred tear tickets.
  const still = background.props.layout as number[] | undefined;
  if (background.id.startsWith('threeStill') && still && layout.x !== 50) {
    const composed = [...still];
    composed[1] = layout.x < 50 ? 0.75 : 0.25;
    composed[2] = 0;
    background = { ...background, props: { ...background.props, layout: composed } };
  }
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
