import { createRng } from '../../engine/rng';

// A small source picture for Paper's image shaders, painted on a 2D canvas from the palette and a numeric seed.
// Same (seed, colours, style) → same pixels, so the universe stays reproducible without storing an image in the genome.
export type PaperImageStyle = 'blobs' | 'glyph' | 'orbits' | 'bands';

export interface PaperImageSpec {
  imageSeed: number;
  imageStyle: PaperImageStyle;
  /** Colours to paint with, strongest first. */
  imageColors: string[];
  /** Canvas background, or null for a transparent picture (Heatmap needs a shape with alpha). */
  imageBack: string | null;
}

const SIZE = 512; // ≤ 512 px keeps upload/processing cheap; the shaders scale it to cover the screen.

export const paintPaperImage = ({ imageSeed, imageStyle, imageColors, imageBack }: PaperImageSpec): string => {
  const r = createRng(`img:${imageSeed}`);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const g = cv.getContext('2d')!;
  const cols = imageColors.length ? imageColors : ['#ffffff'];
  const col = (i: number) => cols[i % cols.length];
  if (imageBack) {
    g.fillStyle = imageBack;
    g.fillRect(0, 0, SIZE, SIZE);
  }

  const blob = (x: number, y: number, rad: number, c: string, hard = 0.35) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, c);
    grd.addColorStop(hard, c);
    grd.addColorStop(1, c + '00');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  };

  switch (imageStyle) {
    case 'blobs': {
      const n = r.int(5, 9);
      for (let i = 0; i < n; i++) blob(r.range(40, SIZE - 40), r.range(40, SIZE - 40), r.range(70, 200), col(i), r.range(0.1, 0.5));
      break;
    }
    case 'orbits': {
      const cx = SIZE / 2 + r.range(-60, 60);
      const cy = SIZE / 2 + r.range(-60, 60);
      const rings = r.int(4, 8);
      g.lineCap = 'round';
      for (let i = rings; i > 0; i--) {
        g.strokeStyle = col(i);
        g.lineWidth = r.range(10, 34);
        const rad = (i / rings) * SIZE * 0.46;
        const start = r.range(0, Math.PI * 2);
        g.beginPath();
        g.arc(cx, cy, rad, start, start + r.range(Math.PI * 0.8, Math.PI * 1.9));
        g.stroke();
      }
      blob(cx, cy, r.range(40, 90), col(0), 0.6);
      break;
    }
    case 'bands': {
      g.save();
      g.translate(SIZE / 2, SIZE / 2);
      g.rotate(r.range(-0.8, 0.8));
      const n = r.int(4, 7);
      const h = (SIZE * 1.5) / n;
      for (let i = 0; i < n; i++) {
        const y = -SIZE * 0.75 + i * h;
        const grd = g.createLinearGradient(-SIZE, 0, SIZE, 0);
        grd.addColorStop(0, col(i) + '00');
        grd.addColorStop(r.range(0.3, 0.7), col(i));
        grd.addColorStop(1, col(i + 1) + '00');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(-SIZE, y);
        for (let x = -SIZE; x <= SIZE; x += 32) g.lineTo(x, y + Math.sin(x / r.range(60, 120) + i) * r.range(10, 30));
        g.lineTo(SIZE, y + h * r.range(0.4, 0.8));
        g.lineTo(-SIZE, y + h * r.range(0.4, 0.8));
        g.closePath();
        g.fill();
      }
      g.restore();
      break;
    }
    case 'glyph':
    default: {
      // A big "xʸ": the base x plus a raised y, filled with a palette gradient.
      const grd = g.createLinearGradient(0, 0, SIZE, SIZE);
      cols.forEach((c, i) => grd.addColorStop(i / Math.max(1, cols.length - 1), c));
      g.fillStyle = grd;
      g.textBaseline = 'alphabetic';
      g.textAlign = 'center';
      const italic = r.chance(0.5) ? 'italic ' : '';
      g.font = `${italic}700 ${Math.round(SIZE * 0.78)}px Georgia, 'Times New Roman', serif`;
      g.fillText('x', SIZE * 0.4, SIZE * 0.84);
      g.font = `${italic}700 ${Math.round(SIZE * 0.42)}px Georgia, 'Times New Roman', serif`;
      g.fillText('y', SIZE * 0.78, SIZE * 0.4);
      if (imageBack) for (let i = 0; i < 3; i++) blob(r.range(0, SIZE), r.range(0, SIZE), r.range(40, 110), col(i + 1), 0.2);
      break;
    }
  }
  return cv.toDataURL('image/png');
};
