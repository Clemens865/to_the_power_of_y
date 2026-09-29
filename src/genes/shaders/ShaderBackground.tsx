import { useEffect, useRef, type CSSProperties } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { VERTEX, fragmentFor } from './glsl';

// One full-screen fragment shader (xʸ shader pack). Renders at a reduced internal resolution
// and lets the browser upscale the canvas, which keeps even busy shaders cheap.
export interface ShaderBackgroundProps {
  shader: string;
  colors: [string, string, string, string];
  speed?: number;
  params?: number[];
  className?: string;
  style?: CSSProperties;
}

const MAX_DPR = 1.25;
const RES_SCALE = 0.7;
const REDUCED_MOTION = 0.15;

const rgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function ShaderBackground({ shader, colors, speed = 1, params = [], className, style }: ShaderBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Colours and params update live, without rebuilding the GL context.
  const key = colors.join() + '|' + params.join();
  useEffect(() => {
    const u = programRef.current?.uniforms;
    if (!u) return;
    colors.forEach((c, i) => (u[`u_c${i}`].value = rgb(c)));
    for (let i = 0; i < 4; i++) u[`u_p${i}`].value = params[i] ?? 0.5;
  }, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RES_SCALE;
    const renderer = new Renderer({ dpr, alpha: false, depth: false, antialias: false, powerPreference: 'low-power' });
    const gl = renderer.gl;
    if (!gl) return;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.cssText = 'position:absolute;inset:0;display:block;';
    el.appendChild(canvas);

    const uniforms: Record<string, { value: unknown }> = {
      u_time: { value: 0 },
      u_res: { value: [1, 1] },
      u_mouse: { value: [0.5, 0.5] }
    };
    colors.forEach((c, i) => (uniforms[`u_c${i}`] = { value: rgb(c) }));
    for (let i = 0; i < 4; i++) uniforms[`u_p${i}`] = { value: params[i] ?? 0.5 };
    const program = new Program(gl, { vertex: VERTEX, fragment: fragmentFor(shader), uniforms, depthTest: false, depthWrite: false });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      uniforms.u_res.value = [gl.canvas.width, gl.canvas.height];
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const target = [0.5, 0.5];
    const mouse = uniforms.u_mouse.value as number[];
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target[0] = (e.clientX - r.left) / Math.max(1, r.width);
      target[1] = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let time = 0;
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      time += dt * speedRef.current * (motion.matches ? REDUCED_MOTION : 1);
      const k = 1 - Math.exp(-dt * 3);
      mouse[0] += (target[0] - mouse[0]) * k;
      mouse[1] += (target[1] - mouse[1]) * k;
      uniforms.u_time.value = time;
      renderer.render({ scene: mesh });
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
      programRef.current = null;
      program.remove();
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Colours/params are applied by the effect above; only a new shader rebuilds the context.
  }, [shader]);

  return <div ref={ref} className={className} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }} />;
}
