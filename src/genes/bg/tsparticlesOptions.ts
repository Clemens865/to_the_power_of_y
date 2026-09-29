import type { Rng } from '../../engine/rng';
import type { Palette } from '../../engine/palette';

// Palette-mapped options for the tsParticles presets (@tsparticles/preset-*, v4, MIT).
// Pure data: the result is stored in the genome (JSON) and merged over the preset by the engine.
// Budget: ≤ 120 live particles (density scaling off, emitters capped with number.limit), fps ≤ 60.
// None of these presets ships sounds (only preset-fireworks does), so there is nothing to mute.

export const TSP_PRESETS = [
  'links', 'triangles', 'stars', 'hyperspace', 'snow', 'bubbles', 'ambient',
  'bigCircles', 'matrix', 'meteors', 'squares', 'fountain', 'seaAnemone', 'fire'
] as const;
export type TspPreset = (typeof TSP_PRESETS)[number];

/** npm package suffix / preset name registered by each package. */
export const TSP_PACKAGE: Record<TspPreset, string> = {
  links: 'links', triangles: 'triangles', stars: 'stars', hyperspace: 'hyperspace', snow: 'snow', bubbles: 'bubbles',
  ambient: 'ambient', bigCircles: 'big-circles', matrix: 'matrix', meteors: 'meteors', squares: 'squares',
  fountain: 'fountain', seaAnemone: 'sea-anemone', fire: 'fire'
};

/** Loader export of each preset package (used by the export kit). */
export const TSP_LOADER: Record<TspPreset, string> = {
  links: 'loadLinksPreset', triangles: 'loadTrianglesPreset', stars: 'loadStarsPreset', hyperspace: 'loadHyperspacePreset',
  snow: 'loadSnowPreset', bubbles: 'loadBubblesPreset', ambient: 'loadAmbientPreset', bigCircles: 'loadBigCirclesPreset',
  matrix: 'loadMatrixPreset', meteors: 'loadMeteorsPreset', squares: 'loadSquaresPreset', fountain: 'loadFountainPreset',
  seaAnemone: 'loadSeaAnemonePreset', fire: 'loadFirePreset'
};

const MAX = 120;
const r2 = (n: number) => Math.round(n * 100) / 100;
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const ca = rgb(a);
  const cb = rgb(b);
  return '#' + ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, '0')).join('');
};

type Opts = Record<string, unknown>;
const fill = (value: string | string[]) => ({ fill: { enable: true, color: { value } } });
const count = (value: number) => ({ value, density: { enable: false }, limit: { mode: 'delete', value: MAX } });
const limitOnly = { value: 0, density: { enable: false }, limit: { mode: 'delete', value: MAX } };

export const tsParticlesOptions = (preset: TspPreset, r: Rng, p: Palette): Opts => {
  const C = [p.accent, p.accent2, p.accent3];
  switch (preset) {
    case 'links':
      return {
        particles: {
          number: count(r.int(50, 90)),
          paint: fill(C),
          size: { value: { min: 1, max: r2(r.range(2, 3.5)) } },
          links: { enable: true, distance: r.int(100, 150), color: { value: mix(p.bg, p.accent2, 0.7) }, opacity: r2(r.range(0.3, 0.55)), width: 1 },
          move: { enable: true, speed: r2(r.range(0.6, 2)) }
        }
      };
    case 'triangles':
      return {
        particles: {
          number: count(r.int(50, 80)),
          paint: fill([p.fg, p.accent]),
          size: { value: r2(r.range(1, 2.5)) },
          links: { enable: true, distance: r.int(110, 140), color: { value: p.accent }, opacity: r2(r.range(0.3, 0.6)), triangles: { enable: true, color: { value: p.accent2 }, opacity: r2(r.range(0.05, 0.14)) } },
          move: { enable: true, speed: r2(r.range(0.8, 2.5)) }
        }
      };
    case 'stars':
      return {
        particles: {
          number: count(r.int(90, 120)),
          paint: fill(p.isLight ? [p.fg, p.accent, p.accent2] : [p.fg, p.accent3, p.accent]),
          size: { value: { min: 0.6, max: r2(r.range(2.2, 3.5)) } },
          opacity: { value: { min: 0, max: 1 }, animation: { enable: true, speed: r2(r.range(0.4, 1.4)), sync: false } },
          move: { enable: true, speed: r2(r.range(0.05, 0.3)), random: true }
        }
      };
    case 'hyperspace':
      return {
        particles: {
          number: limitOnly,
          paint: fill(C),
          size: { value: r2(r.range(1.5, 3)) },
          life: { count: 1, duration: { value: r2(r.range(1.5, 2.5)) } },
          move: { speed: r.int(6, 12) }
        },
        emitters: { position: { x: 50, y: 50 }, size: { width: 100, height: 100 }, rate: { quantity: r.int(2, 4), delay: 0.1 } },
        trail: { enable: true, length: r.int(8, 15), fill: { color: { value: p.bg } } }
      };
    case 'snow':
      return {
        particles: {
          number: count(r.int(70, 120)),
          paint: fill(p.isLight ? C : [p.fg, mix(p.fg, p.accent, 0.35), mix(p.fg, p.accent3, 0.35)]),
          size: { value: { min: 1, max: r.int(5, 9) } },
          opacity: { value: { min: 0.2, max: 0.7 } },
          move: { speed: r2(r.range(0.8, 2.2)) },
          wobble: { enable: true, distance: r.int(10, 25), speed: { min: -4, max: 4 } }
        }
      };
    case 'bubbles':
      return {
        particles: {
          number: limitOnly,
          paint: fill(C),
          size: { value: { min: r.int(6, 10), max: r.int(16, 28) } },
          opacity: { value: { min: 0.35, max: r2(r.range(0.55, 0.8)) } },
          move: { speed: r2(r.range(2, 5)) }
        },
        // Continuous stream (the preset bursts for 3 s every 8 s, which left the screen empty most of the time).
        emitters: [{ direction: 'top', position: { x: 50, y: 100 }, size: { width: 100, height: 0 }, life: { count: 0, duration: 0, delay: 0 }, rate: { quantity: r.int(1, 2), delay: r2(r.range(0.12, 0.25)) } }]
      };
    case 'ambient': {
      const circle = (paint: Opts, min: number, max: number, op: number) => ({ particles: { paint, size: { value: { min, max } }, opacity: { value: { min: 0, max: op }, animation: { enable: true, speed: 0.1 } } } });
      return {
        particles: {
          number: count(r.int(50, 100)),
          shape: {
            type: 'circle',
            options: {
              circle: [
                circle({ fill: { enable: false }, stroke: { width: 1, color: { value: p.accent } } }, 3, 5, 0.8),
                circle(fill(p.accent2), 5, 7, 0.6),
                circle(fill(p.accent3), 10, r.int(16, 24), 0.4)
              ]
            }
          },
          move: { speed: { min: 0.1, max: r2(r.range(0.4, 0.9)) } }
        }
      };
    }
    case 'bigCircles':
      return {
        particles: {
          number: count(r.int(12, 24)),
          paint: fill([...C, mix(p.accent, p.accent2, 0.5)]),
          size: { value: { min: r.int(60, 110), max: r.int(160, 240) } },
          opacity: { value: { min: 0.25, max: r2(r.range(0.45, 0.7)) } },
          move: { speed: { min: r2(r.range(1, 3)), max: r2(r.range(4, 8)) } }
        }
      };
    case 'matrix':
      return {
        fpsLimit: 30,
        particles: {
          number: count(r.int(60, 100)),
          paint: fill(p.accent) as Opts,
          effect: { type: 'shadow', options: { shadow: { color: p.accent, blur: r.int(2, 5) } } },
          size: { value: r.int(8, 12) },
          move: { speed: { min: r.int(4, 8), max: r.int(10, 15) } }
        },
        trail: { enable: true, length: r.int(8, 12), fill: { color: { value: p.bg } } }
      };
    case 'meteors':
      return {
        particles: {
          number: limitOnly,
          paint: { color: { value: C }, ...fill(C) },
          size: { value: r2(r.range(1, 2)) },
          move: { speed: { min: r.int(3, 5), max: r.int(6, 9) }, direction: r.int(100, 140) }
        },
        emitters: { position: { x: 50, y: 0 }, size: { width: 100, height: 0 }, rate: { delay: r2(r.range(0.15, 0.35)), quantity: r.int(1, 2) } }
      };
    case 'squares':
      return {
        particles: {
          number: limitOnly,
          paint: { stroke: { width: r.int(2, 5), color: { value: C } }, fill: { enable: false } },
          size: { value: { min: 1, max: 500 }, animation: { enable: true, speed: r.int(35, 70), sync: true, startValue: 'min', destroy: 'max' } },
          rotate: { value: 0, direction: r.pick(['clockwise', 'counter-clockwise']), animation: { enable: true, speed: r2(r.range(1, 3)), sync: true } }
        },
        emitters: { position: { x: 50, y: 50 }, rate: { delay: r2(r.range(0.7, 1.4)), quantity: 1 } }
      };
    case 'fountain':
      return {
        particles: {
          number: limitOnly,
          paint: fill([...C, mix(p.accent, p.fg, 0.4)]),
          size: { value: { min: r.int(5, 8), max: r.int(10, 16) } }
        },
        emitters: { direction: 'top', life: { count: 0, duration: 0.15, delay: r2(r.range(2, 4)) }, rate: { delay: 0.1, quantity: r.int(3, 5) }, size: { width: 0, height: 0 } },
        trail: { enable: true, length: 3, fill: { color: { value: p.bg } } }
      };
    case 'seaAnemone':
      return {
        particles: {
          number: { value: 0, limit: { mode: 'delete', value: MAX } },
          size: { value: { min: 1, max: r.int(6, 10) } },
          move: { speed: r2(r.range(1.5, 3)) }
        },
        emitters: {
          rate: { quantity: r.int(5, 9), delay: 0.3 },
          // The preset cycles hue and lightness through the whole rainbow; keep the palette colours instead.
          spawn: { fill: { color: { value: C, animation: { h: { enable: false }, l: { enable: false } } } } }
        },
        trail: { enable: true, length: r.int(20, 30), fill: { color: { value: p.bg } } }
      };
    case 'fire':
      return {
        fpsLimit: 40,
        // The preset's baked radial-gradient background is cleared by TsParticlesBg (background image '').
        particles: {
          number: count(r.int(90, 120)),
          paint: fill([p.accent3, p.accent, p.accent2, mix(p.accent, p.bg, 0.5), mix(p.accent3, p.fg, 0.4)]),
          size: { value: { min: 1.5, max: r2(r.range(3.5, 5.5)) } },
          opacity: { value: { min: 0.3, max: 0.8 } },
          move: { speed: r2(r.range(3, 6)) }
        }
      };
  }
};
