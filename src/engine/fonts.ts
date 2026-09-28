import type { Rng } from './rng';

export interface FontGene {
  family: string;
  weight: number;
  transform: 'none' | 'uppercase' | 'lowercase';
  tracking: string;
  italic: boolean;
}

// [family, weight that the family ships]
const FONTS: [string, number][] = [
  ['Bricolage Grotesque', 800], ['Space Grotesk', 700], ['Syne', 800], ['Unbounded', 900],
  ['DM Serif Display', 400], ['Instrument Serif', 400], ['Playfair Display', 900], ['Fraunces', 900],
  ['Rubik Mono One', 400], ['Bungee', 400], ['Monoton', 400], ['Press Start 2P', 400],
  ['VT323', 400], ['Major Mono Display', 400], ['Bebas Neue', 400], ['Anton', 400],
  ['Archivo Black', 400], ['Space Mono', 700], ['JetBrains Mono', 800], ['Righteous', 400],
  ['Shrikhand', 400], ['Pacifico', 400], ['Caveat', 700], ['Permanent Marker', 400],
  ['Silkscreen', 400], ['Orbitron', 900], ['Cormorant Garamond', 700], ['Rubik Glitch', 400],
  ['Climate Crisis', 400], ['Nabla', 400], ['Honk', 400], ['Workbench', 400]
];

const loaded = new Set<string>();

export const loadFont = (font: FontGene): Promise<void> => {
  const key = `${font.family}:${font.weight}`;
  if (!loaded.has(key)) {
    loaded.add(key);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@${font.weight}&display=block`;
    document.head.appendChild(link);
  }
  // Resolve once the face is ready, but never block the universe for long.
  return Promise.race([
    document.fonts.load(`${font.weight} 48px "${font.family}"`).then(() => undefined),
    new Promise<void>(r => setTimeout(r, 700))
  ]);
};

export const rollFont = (rng: Rng): FontGene => {
  const [family, weight] = rng.pick(FONTS);
  return {
    family,
    weight,
    transform: rng.pick(['none', 'uppercase', 'uppercase', 'lowercase'] as const),
    tracking: rng.pick(['-0.04em', '0', '0.02em', '0.12em', '0.3em']),
    italic: rng.chance(0.12)
  };
};
