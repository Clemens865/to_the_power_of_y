import { useEffect, useRef } from 'react';
import type { VantaEffectName } from './vantaOptions';

// Vanta.js (MIT) backgrounds on our own three (r186). Vanta targets r134, so three things are patched here:
//  1. THREE.VertexColors (removed in r151) — net/globe pass it as `vertexColors`; in r186 that option is a boolean.
//  2. Colour management — r152+ converts hex colours to linear and the renderer back to sRGB. Vanta's shaders don't
//     re-encode, so colours came out dark/shifted. Colour management is switched off while the effect builds its scene
//     and inside each of its frames (net/globe recolour lines per frame; the clear colour is set per frame), and the
//     renderer outputs linear (= r134 behaviour). The global flag is restored right after, so other three users are unaffected.
//  3. Physically-correct lights (r155+) — Phong/Lambert scenes were near-black; light intensities get the legacy π
//     factor back and point/spot lights lose their distance decay.
// Every effect file is its own dynamic chunk; three is shared with the rest of the app.
type VantaInstance = {
  destroy(): void;
  renderer?: { outputColorSpace: string };
  scene?: { traverse(fn: (o: unknown) => void): void };
  animationLoop?: () => unknown;
};
type VantaFactory = (opts: Record<string, unknown>) => VantaInstance;

const EFFECTS: Record<VantaEffectName, () => Promise<unknown>> = {
  fog: () => import('vanta/dist/vanta.fog.min.js'),
  cells: () => import('vanta/dist/vanta.cells.min.js'),
  ripple: () => import('vanta/dist/vanta.ripple.min.js'),
  clouds: () => import('vanta/dist/vanta.clouds.min.js'),
  waves: () => import('vanta/dist/vanta.waves.min.js'),
  net: () => import('vanta/dist/vanta.net.min.js'),
  dots: () => import('vanta/dist/vanta.dots.min.js'),
  rings: () => import('vanta/dist/vanta.rings.min.js'),
  globe: () => import('vanta/dist/vanta.globe.min.js')
};

// The effects' own default render downscale [desktop, mobile] (shader effects render below device resolution).
const BASE_SCALE: Partial<Record<VantaEffectName, [number, number]>> = { fog: [2, 4], clouds: [3, 12], cells: [1, 3], ripple: [1, 4] };

const factoryOf = (mod: unknown, effect: string): VantaFactory | undefined => {
  const m = mod as { default?: unknown };
  const d = m?.default as { default?: unknown } | undefined;
  const cand = [d?.default, d, mod, (window as unknown as { VANTA?: Record<string, unknown> }).VANTA?.[effect.toUpperCase()]];
  return cand.find(c => typeof c === 'function') as VantaFactory | undefined;
};

type MeshLike = { isMesh?: boolean; material?: { color?: { setHex(h: number): void } } };
type LightLike = { isLight?: boolean; isAmbientLight?: boolean; isPointLight?: boolean; isSpotLight?: boolean; intensity: number; decay: number };

export default function VantaBg({ effect, options }: { effect: VantaEffectName; options: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let fx: VantaInstance | undefined;
    (async () => {
      const three = await import('three');
      const THREE = { ...three, VertexColors: true };
      // Some effect files (dots) read window.THREE when they are evaluated instead of taking the option.
      (window as unknown as { THREE?: unknown }).THREE = THREE;
      const create = factoryOf(await EFFECTS[effect](), effect);
      const el = ref.current;
      if (!alive || !el || !create) return;
      const cm = three.ColorManagement;
      const wasEnabled = cm.enabled;
      cm.enabled = false;
      try {
        // Vanta renders at devicePixelRatio / scale: keep each effect's own downscale and never exceed 1.5× device pixels.
        const [base, baseMobile] = BASE_SCALE[effect] ?? [1, 1];
        const scale = Math.max(base, devicePixelRatio / 1.5);
        fx = create({ el, THREE, mouseControls: true, touchControls: true, gyroControls: false, minHeight: 200, minWidth: 200, ...options, scale, scaleMobile: Math.max(baseMobile, scale) });
      } finally {
        cm.enabled = wasEnabled;
      }
      const loop = fx?.animationLoop;
      if (fx && loop) {
        // Vanta re-reads this.animationLoop for every requestAnimationFrame, so the wrapper takes over from frame 2.
        fx.animationLoop = () => {
          cm.enabled = false;
          try {
            return loop();
          } finally {
            cm.enabled = wasEnabled;
          }
        };
      }
      if (fx?.renderer) fx.renderer.outputColorSpace = three.LinearSRGBColorSpace;
      const ringColors = options.ringColors as number[] | undefined;
      let ring = 0;
      fx?.scene?.traverse(o => {
        const m = o as MeshLike;
        if (ringColors?.length && m.isMesh && m.material?.color) {
          cm.enabled = false;
          m.material.color.setHex(ringColors[ring++ % ringColors.length]);
          cm.enabled = wasEnabled;
        }
        const l = o as LightLike;
        if (!l.isLight) return;
        l.intensity *= Math.PI;
        if (l.isPointLight || l.isSpotLight) l.decay = 0;
      });
      if (!alive) fx?.destroy();
    })().catch(err => console.warn('[xy] Vanta background failed', err));
    return () => {
      alive = false;
      try {
        fx?.destroy();
      } catch {
        /* already torn down */
      }
    };
  }, [effect, options]);

  return <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />;
}
