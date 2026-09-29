import { useEffect, useRef } from 'react';
import type { Container, Engine, ISourceOptions } from '@tsparticles/engine';
import type { TspPreset } from './tsparticlesOptions';

// tsParticles background (canvas 2D). The engine and each preset are dynamic imports, so every preset is its own chunk.
// Every mount gets a fresh Engine: the global `tsParticles` refuses plugin registration once it has loaded anything
// (and the press-burst confetti already uses that global one).
type Loader = (engine: Engine) => Promise<void>;
const LOADERS: Record<TspPreset, () => Promise<Loader>> = {
  links: () => import('@tsparticles/preset-links').then(m => m.loadLinksPreset),
  triangles: () => import('@tsparticles/preset-triangles').then(m => m.loadTrianglesPreset),
  stars: () => import('@tsparticles/preset-stars').then(m => m.loadStarsPreset),
  hyperspace: () => import('@tsparticles/preset-hyperspace').then(m => m.loadHyperspacePreset),
  snow: () => import('@tsparticles/preset-snow').then(m => m.loadSnowPreset),
  bubbles: () => import('@tsparticles/preset-bubbles').then(m => m.loadBubblesPreset),
  ambient: () => import('@tsparticles/preset-ambient').then(m => m.loadAmbientPreset),
  bigCircles: () => import('@tsparticles/preset-big-circles').then(m => m.loadBigCirclesPreset),
  matrix: () => import('@tsparticles/preset-matrix').then(m => m.loadMatrixPreset),
  meteors: () => import('@tsparticles/preset-meteors').then(m => m.loadMeteorsPreset),
  squares: () => import('@tsparticles/preset-squares').then(m => m.loadSquaresPreset),
  fountain: () => import('@tsparticles/preset-fountain').then(m => m.loadFountainPreset),
  seaAnemone: () => import('@tsparticles/preset-sea-anemone').then(m => m.loadSeaAnemonePreset),
  fire: () => import('@tsparticles/preset-fire').then(m => m.loadFirePreset)
};

export default function TsParticlesBg({ preset, options }: { preset: TspPreset; options: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let container: Container | undefined;
    (async () => {
      const [{ tsParticles }, loadPreset] = await Promise.all([import('@tsparticles/engine'), LOADERS[preset]()]);
      const el = ref.current;
      if (!alive || !el) return;
      const engine = new (tsParticles.constructor as new () => Engine)();
      await loadPreset(engine);
      const c = await engine.load({
        element: el,
        options: {
          preset, // registered names match our ids (bigCircles, seaAnemone, …)
          fpsLimit: 60,
          background: { color: { value: 'transparent' }, image: '' }, // drop baked colours/gradients: the stage behind already paints palette.bg
          ...options,
          fullScreen: { enable: false },
          // Retina detection only up to 1.5× (tsParticles has no cap, so denser screens render at 1×).
          detectRetina: devicePixelRatio <= 1.5
        } as ISourceOptions
      });
      if (alive) container = c;
      else c?.destroy();
    })().catch(err => console.warn('[xy] tsParticles background failed', err));
    return () => {
      alive = false;
      container?.destroy();
    };
  }, [preset, options]);

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}
