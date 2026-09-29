import { LibraryRuntime } from '../../../genes/bg/libraryRuntime';
// React Bits; see LICENSE.md. Local DPR cap and guarded lifecycle; see LibraryRuntime and LibrarySurface.
import { vertex, fragment } from './shaders';
import { useEffect, useRef } from 'react';
import { type Renderer, Program, Mesh, Triangle } from 'ogl';
import './SlicedWaves.css';

export type SlicedWavesOrientation = 'horizontal' | 'vertical';

export interface SlicedWavesProps {
  color1?: string;
  color2?: string;
  color3?: string;
  columns?: number;
  rows?: number;
  barThickness?: number;
  speed?: number;
  travel?: number;
  waveSpread?: number;
  rowOffset?: number;
  softness?: number;
  glow?: number;
  brightness?: number;
  contrast?: number;
  opacity?: number;
  orientation?: SlicedWavesOrientation;
  alternate?: boolean;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  mouseRadius?: number;
  grain?: boolean;
  grainIntensity?: number;
  lightMode?: boolean;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};





type SlicedWavesCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, SlicedWavesCtx>();

const SlicedWaves: React.FC<SlicedWavesProps> = ({
  color1 = '#FF9FFC',
  color2 = '#5227FF',
  color3 = '#B497CF',
  columns = 14,
  rows = 8,
  barThickness = 0.1,
  speed = 0.35,
  travel = 0.7,
  waveSpread = 0.9,
  rowOffset = 1.0,
  softness = 0.05,
  glow = 0,
  brightness = 1.0,
  contrast = 1.0,
  opacity = 0.5,
  orientation = 'horizontal',
  alternate = false,
  mouseInteraction = true,
  mouseStrength = 1,
  mouseRadius = 0.3,
  grain = true,
  grainIntensity = 0.05,
  lightMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const runtime = new LibraryRuntime(container);
    runtime.run(() => {

      const renderer = runtime.renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.25)
      });

      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);

      const geometry = new Triangle(gl);
      runtime.own(() => geometry.remove());
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Float32Array([1, 1]) },
          uColumns: { value: 14 },
          uRows: { value: 8 },
          uThickness: { value: 0.1 },
          uSpeed: { value: 0.35 },
          uTravel: { value: 0.7 },
          uWaveSpread: { value: 0.9 },
          uRowOffset: { value: 1.0 },
          uSoftness: { value: 0.05 },
          uGlow: { value: 0 },
          uBrightness: { value: 1.0 },
          uContrast: { value: 1.0 },
          uOpacity: { value: 0.5 },
          uVertical: { value: 0.0 },
          uAlternate: { value: 0.0 },
          uMouse: { value: new Float32Array([0.5, 0.5]) },
          uMouseStrength: { value: 1 },
          uMouseRadius: { value: 0.3 },
          uEnableMouse: { value: 1.0 },
          uMouseActive: { value: 0.0 },
          uGrain: { value: 1.0 },
          uGrainIntensity: { value: 0.05 },
          uLightMode: { value: 0.0 },
          uColor1: { value: new Float32Array([1, 1, 1]) },
          uColor2: { value: new Float32Array([1, 1, 1]) },
          uColor3: { value: new Float32Array([1, 1, 1]) }
        }
      });

      runtime.program(program);
      const mesh = new Mesh(gl, { geometry, program });
      runtime.own(() => ctxMap.delete(container));
      ctxMap.set(container, { renderer, program, mesh });

      const setSize = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        renderer.setSize(w, h);
        const res = program.uniforms.iResolution.value as Float32Array;
        res[0] = gl.drawingBufferWidth;
        res[1] = gl.drawingBufferHeight;
        renderer.render({ scene: mesh });
      };

      runtime.resize(setSize, container);
      setSize();

      let currentMouse: [number, number] = [0.5, 0.5];
      let targetMouse: [number, number] = [0.5, 0.5];
      let currentActive = 0;
      let targetActive = 0;

      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        targetMouse = [(e.clientX - rect.left) / rect.width, 1.0 - (e.clientY - rect.top) / rect.height];
        targetActive = 1;
      };
      const onMouseLeave = () => {
        targetActive = 0;
      };
      runtime.listen(canvas, 'mousemove', onMouseMove);
      runtime.listen(canvas, 'mouseleave', onMouseLeave);

      let raf = 0;
      let isVisible = true;
      let isPageVisible = !document.hidden;
      const t0 = performance.now();

      const loop = (t: number) => {
        program.uniforms.iTime.value = (t - t0) * 0.001;
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
        const m = program.uniforms.uMouse.value as Float32Array;
        m[0] = currentMouse[0];
        m[1] = currentMouse[1];
        currentActive += 0.05 * (targetActive - currentActive);
        program.uniforms.uMouseActive.value = currentActive;
        renderer.render({ scene: mesh });
        raf = runtime.frame(loop);
      };

      const tryStart = () => {
        if (isVisible && isPageVisible && raf === 0) raf = runtime.frame(loop);
      };
      const tryStop = () => {
        if (raf !== 0) {
          runtime.cancelFrame(raf);
          raf = 0;
        }
      };

      runtime.intersect(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          isVisible ? tryStart() : tryStop();
        },
        container
      );

      const onVisibility = () => {
        isPageVisible = !document.hidden;
        isPageVisible ? tryStart() : tryStop();
      };
      runtime.listen(document, 'visibilitychange', onVisibility);

      tryStart();

    });
    return runtime.dispose;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = ctxMap.get(container);
    if (!ctx) return;
    const u = ctx.program.uniforms;

    u.uColumns.value = Math.max(1, Math.round(columns));
    u.uRows.value = Math.max(1, Math.round(rows));
    u.uThickness.value = barThickness;
    u.uSpeed.value = speed;
    u.uTravel.value = travel;
    u.uWaveSpread.value = waveSpread;
    u.uRowOffset.value = rowOffset;
    u.uSoftness.value = softness;
    u.uGlow.value = glow;
    u.uBrightness.value = brightness;
    u.uContrast.value = contrast;
    u.uOpacity.value = opacity;
    u.uVertical.value = orientation === 'vertical' ? 1.0 : 0.0;
    u.uAlternate.value = alternate ? 1.0 : 0.0;
    u.uMouseStrength.value = mouseStrength;
    u.uMouseRadius.value = mouseRadius;
    u.uEnableMouse.value = mouseInteraction ? 1.0 : 0.0;
    u.uGrain.value = grain ? 1.0 : 0.0;
    u.uGrainIntensity.value = grainIntensity;
    u.uLightMode.value = lightMode ? 1.0 : 0.0;
    const c1 = hexToRgb(color1);
    const a1 = u.uColor1.value as Float32Array;
    a1[0] = c1[0];
    a1[1] = c1[1];
    a1[2] = c1[2];
    const c2 = hexToRgb(color2);
    const a2 = u.uColor2.value as Float32Array;
    a2[0] = c2[0];
    a2[1] = c2[1];
    a2[2] = c2[2];
    const c3 = hexToRgb(color3);
    const a3 = u.uColor3.value as Float32Array;
    a3[0] = c3[0];
    a3[1] = c3[1];
    a3[2] = c3[2];
  }, [
    color1,
    color2,
    color3,
    columns,
    rows,
    barThickness,
    speed,
    travel,
    waveSpread,
    rowOffset,
    softness,
    glow,
    brightness,
    contrast,
    opacity,
    orientation,
    alternate,
    mouseInteraction,
    mouseStrength,
    mouseRadius,
    grain,
    grainIntensity,
    lightMode
  ]);

  return <div ref={containerRef} className={`sliced-waves-container ${className}`.trim()} />;
};

export default SlicedWaves;
