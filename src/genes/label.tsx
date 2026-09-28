import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';
import type { FontGene } from '../engine/fonts';
import ShinyText from '../vendor/react-bits/ShinyText/ShinyText';
import GradientText from '../vendor/react-bits/GradientText/GradientText';
import DecryptedText from '../vendor/react-bits/DecryptedText/DecryptedText';
import FuzzyText from '../vendor/react-bits/FuzzyText/FuzzyText';
import TextType from '../vendor/react-bits/TextType/TextType';
import RotatingText from '../vendor/react-bits/RotatingText/RotatingText';
import BlurText from '../vendor/react-bits/BlurText/BlurText';

const WORDS = ['y', 'xʸ', 'press', 'again', 'change', 'another y', 'roll', 'mutate', 'next', 'go', '↻', '✺', '?', 'y + 1', 'more', 'different', 'push', 'reroll', 'now'];
const EFFECTS = ['plain', 'shiny', 'gradient', 'decrypt', 'fuzzy', 'type', 'rotate', 'blur'] as const;

export interface LabelGene {
  text: string;
  effect: (typeof EFFECTS)[number];
  speed: number;
}

export const rollLabel = (rng: Rng): LabelGene => ({
  text: rng.pick(WORDS),
  effect: rng.pick(EFFECTS),
  speed: rng.range(0.6, 1.6)
});

export const Label = ({ gene, palette, font, color, fontPx }: { gene: LabelGene; palette: Palette; font: FontGene; color: string; fontPx: number }) => {
  const { text, speed } = gene;
  switch (gene.effect) {
    case 'shiny':
      return <ShinyText text={text} color={color} shineColor={palette.accent3} speed={2 / speed} />;
    case 'gradient':
      return <GradientText colors={[palette.accent, palette.accent2, palette.accent3, palette.accent]} animationSpeed={6 / speed}>{text}</GradientText>;
    case 'decrypt':
      return <DecryptedText text={text} animateOn="view" speed={40 / speed} maxIterations={14} sequential revealDirection="center" />;
    case 'fuzzy':
      return (
        <FuzzyText fontSize={fontPx} fontWeight={font.weight} fontFamily={`"${font.family}"`} color={color} baseIntensity={0.12 * speed} hoverIntensity={0.5} enableHover>
          {text}
        </FuzzyText>
      );
    case 'type':
      return <TextType text={[text, 'xʸ', text]} typingSpeed={70 / speed} pauseDuration={1800} showCursor cursorCharacter="▍" />;
    case 'rotate':
      return <RotatingText texts={[text, 'xʸ', 'y', text]} rotationInterval={1600 / speed} staggerDuration={0.02} splitBy="characters" />;
    case 'blur':
      return <BlurText text={text} animateBy="letters" delay={60 / speed} direction="top" />;
    default:
      return <span>{text}</span>;
  }
};
