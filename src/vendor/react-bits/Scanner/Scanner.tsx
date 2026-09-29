import { LibraryRuntime } from '../../../genes/bg/libraryRuntime';
// React Bits; see LICENSE.md. Local DPR cap and guarded lifecycle; see LibraryRuntime and LibrarySurface.
import { vertex, fragment } from './shaders';
import React, { useEffect, useRef } from 'react';
import { type Renderer, Program, Mesh, Triangle } from 'ogl';
import './Scanner.css';

export type ScanDirection = 'vertical' | 'horizontal' | 'diagonal';

export interface ScannerProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  sweepSpeed?: number;
  sweepWidth?: number;
  sweepFalloff?: number;
  scale?: number;
  frequency?: number;
  ripple?: number;
  bandDensity?: number;
  lineSharpness?: number;
  glow?: number;
  scanDirection?: ScanDirection;
  colorSpread?: number;
  brightness?: number;
  contrast?: number;
  softness?: number;
  vignette?: number;
  scanline?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const directionToFloat = (dir: ScanDirection): number => (dir === 'horizontal' ? 1.0 : dir === 'diagonal' ? 2.0 : 0.0);





type ScannerCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, ScannerCtx>();

const Scanner: React.FC<ScannerProps> = ({
  color1 = '#5227FF',
  color2 = '#FF9FFC',
  color3 = '#FFFFFF',
  speed = 0.5,
  sweepSpeed = 0.25,
  sweepWidth = 1.6,
  sweepFalloff = 6,
  scale = 1.5,
  frequency = 2,
  ripple = 0.22,
  bandDensity = 11,
  lineSharpness = 5.5,
  glow = 0.22,
  scanDirection = 'vertical',
  colorSpread = 0.7,
  brightness = 1.0,
  contrast = 1.15,
  softness = 1.4,
  vignette = 0.45,
  scanline = true,
  grain = true,
  grainIntensity = 0.05,
  opacity = 1.0,
  mouseInteraction = true,
  mouseRadius = 0.5,
  mouseStrength = 0.5,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseEnabledRef = useRef<boolean>(mouseInteraction);

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
          uSpeed: { value: 0.5 },
          uSweepSpeed: { value: 0.25 },
          uSweepWidth: { value: 1.6 },
          uSweepFalloff: { value: 6 },
          uScale: { value: 1.5 },
          uFrequency: { value: 2 },
          uRipple: { value: 0.22 },
          uBandDensity: { value: 11 },
          uLineSharpness: { value: 5.5 },
          uGlow: { value: 0.22 },
          uColorSpread: { value: 0.7 },
          uBrightness: { value: 1.0 },
          uContrast: { value: 1.15 },
          uSoftness: { value: 1.4 },
          uVignette: { value: 0.45 },
          uOpacity: { value: 1.0 },
          uScanline: { value: 1.0 },
          uGrain: { value: 1.0 },
          uGrainIntensity: { value: 0.05 },
          uDirection: { value: 0.0 },
          uMouse: { value: new Float32Array([0.5, 0.5]) },
          uMouseEnabled: { value: 1.0 },
          uMouseRadius: { value: 0.5 },
          uMouseStrength: { value: 0.5 },
          uMouseActive: { value: 0.0 },
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
        const res = (program.uniforms.iResolution as { value: Float32Array }).value;
        res[0] = gl.drawingBufferWidth;
        res[1] = gl.drawingBufferHeight;
        renderer.render({ scene: mesh });
      };

      runtime.resize(setSize, container);
      setSize();

      let currentMouse: [number, number] = [0.5, 0.5];
      let targetMouse: [number, number] = [0.5, 0.5];
      let mouseActive = 0;
      let targetMouseActive = 0;

      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        targetMouse = [(e.clientX - rect.left) / rect.width, 1.0 - (e.clientY - rect.top) / rect.height];
        targetMouseActive = 1;
      };
      const onMouseLeave = () => {
        targetMouseActive = 0;
      };
      runtime.listen(canvas, 'mousemove', onMouseMove);
      runtime.listen(canvas, 'mouseleave', onMouseLeave);

      let raf = 0;
      let isVisible = true;
      let isPageVisible = !document.hidden;
      const t0 = performance.now();

      const loop = (t: number) => {
        (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;

        if (!mouseEnabledRef.current) {
          targetMouseActive = 0;
        }
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
        const m = (program.uniforms.uMouse as { value: Float32Array }).value;
        m[0] = currentMouse[0];
        m[1] = currentMouse[1];
        mouseActive += 0.05 * (targetMouseActive - mouseActive);
        (program.uniforms.uMouseActive as { value: number }).value = mouseActive;

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
    const { program } = ctx;
    const u = program.uniforms as Record<string, { value: any }>;

    u.uSpeed.value = speed;
    u.uSweepSpeed.value = sweepSpeed;
    u.uSweepWidth.value = sweepWidth;
    u.uSweepFalloff.value = sweepFalloff;
    u.uScale.value = scale;
    u.uFrequency.value = frequency;
    u.uRipple.value = ripple;
    u.uBandDensity.value = bandDensity;
    u.uLineSharpness.value = lineSharpness;
    u.uGlow.value = glow;
    u.uColorSpread.value = colorSpread;
    u.uBrightness.value = brightness;
    u.uContrast.value = contrast;
    u.uSoftness.value = softness;
    u.uVignette.value = vignette;
    u.uOpacity.value = opacity;
    u.uScanline.value = scanline ? 1.0 : 0.0;
    u.uGrain.value = grain ? 1.0 : 0.0;
    u.uGrainIntensity.value = grainIntensity;
    u.uDirection.value = directionToFloat(scanDirection);
    u.uMouseEnabled.value = mouseInteraction ? 1.0 : 0.0;
    u.uMouseRadius.value = mouseRadius;
    u.uMouseStrength.value = mouseStrength;
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const c3 = hexToRgb(color3);
    u.uColor1.value[0] = c1[0];
    u.uColor1.value[1] = c1[1];
    u.uColor1.value[2] = c1[2];
    u.uColor2.value[0] = c2[0];
    u.uColor2.value[1] = c2[1];
    u.uColor2.value[2] = c2[2];
    u.uColor3.value[0] = c3[0];
    u.uColor3.value[1] = c3[1];
    u.uColor3.value[2] = c3[2];

    mouseEnabledRef.current = mouseInteraction;
  }, [
    speed,
    sweepSpeed,
    sweepWidth,
    sweepFalloff,
    scale,
    frequency,
    ripple,
    bandDensity,
    lineSharpness,
    glow,
    colorSpread,
    brightness,
    contrast,
    softness,
    vignette,
    opacity,
    scanline,
    grain,
    grainIntensity,
    scanDirection,
    mouseInteraction,
    mouseRadius,
    mouseStrength,
    color1,
    color2,
    color3
  ]);

  return <div ref={containerRef} className={`scanner-container ${className}`.trim()} />;
};

export default Scanner;
