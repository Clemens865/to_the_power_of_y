import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { seeded, type SharedUniforms, type SceneCtx } from './common';
import { SCENES } from './scenes';

// One three.js scene from the xʸ 3D pack: owns a single WebGLRenderer, camera, loop and cleanup.
export interface ThreeSceneProps {
  scene: string;
  colors: string[];
  bg: string;
  params?: number[];
  speed?: number;
}

const MAX_DPR = 1.25;
const REDUCED_MOTION = 0.2;

export default function ThreeScene({ scene: id, colors, bg, params = [], speed = 1 }: ThreeSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const key = [id, bg, colors.join(), params.join()].join('|');

  useEffect(() => {
    const el = ref.current;
    const build = SCENES[id] ?? Object.values(SCENES)[0];
    if (!el || !build) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power', alpha: false });
    } catch {
      return;
    }
    const bgColor = new THREE.Color(bg);
    renderer.setClearColor(bgColor, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;';
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const cols = [0, 1, 2, 3].map(i => new THREE.Color(colors[i] ?? colors[0] ?? '#ffffff'));
    const p = [0, 1, 2, 3].map(i => params[i] ?? 0.5);
    const uniforms: SharedUniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() },
      uBg: { value: bgColor },
      uC0: { value: cols[0] },
      uC1: { value: cols[1] },
      uC2: { value: cols[2] },
      uC3: { value: cols[3] },
      uP: { value: new THREE.Vector4(p[0], p[1], p[2], p[3]) },
      uFog: { value: new THREE.Vector2(4, 40) },
      uInk: { value: 1 }
    };
    const lum = 0.2126 * bgColor.r + 0.7152 * bgColor.g + 0.0722 * bgColor.b;
    uniforms.uInk.value = lum > 0.3 ? 1.5 : 1;
    const ctx: SceneCtx = { scene, camera, colors: cols, bg: bgColor, params: p, isLight: lum > 0.3, uniforms, rng: seeded(p[0] + p[1] * 7 + p[2] * 13 + p[3] * 31) };
    const inst = build(ctx);
    // Scenes displace vertices on the GPU, so CPU bounding volumes are meaningless.
    scene.traverse(o => (o.frustumCulled = false));

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(uniforms.uRes.value);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const target = new THREE.Vector2();
    const pointer = uniforms.uPointer.value;
    const onPointer = (e: PointerEvent) => {
      target.set((e.clientX / Math.max(1, innerWidth)) * 2 - 1, 1 - (e.clientY / Math.max(1, innerHeight)) * 2);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let time = 0;
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const real = last ? Math.min((now - last) / 1000, 0.1) : 0;
      const dt = real * speedRef.current * (motion.matches ? REDUCED_MOTION : 1);
      last = now;
      time += dt;
      pointer.lerp(target, 1 - Math.exp(-real * 2.5));
      uniforms.uTime.value = time;
      inst.update(time, dt, pointer);
      renderer.render(scene, camera);
    };
    const start = () => {
      if (raf || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      inst.dispose();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach(mat => {
          Object.values(mat as unknown as Record<string, unknown>).forEach(v => (v as THREE.Texture)?.isTexture && (v as THREE.Texture).dispose());
          mat.dispose();
        });
        (o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).dispose();
      });
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [key]);

  return <div ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }} />;
}
