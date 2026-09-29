import { LibraryRuntime } from '../../../genes/bg/libraryRuntime';
// React Bits; see LICENSE.md. Local DPR cap and guarded lifecycle; see LibraryRuntime and LibrarySurface.
import { vertex, fragment } from './shaders';
import React, { useEffect, useRef } from 'react';
import { type Renderer, Program, Mesh, Triangle, RenderTarget } from 'ogl';
import './AcidSquares.css';

export type AcidSquaresDetail = 'low' | 'medium' | 'high';

export interface AcidSquaresProps {
  color1?: string;
  color2?: string;
  color3?: string;
  detail?: AcidSquaresDetail;
  speed?: number;
  waveDepth?: number;
  zoom?: number;
  density?: number;
  glow?: number;
  exposure?: number;
  spread?: number;
  stepSize?: number;
  colorShift?: number;
  contrast?: number;
  brightness?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  mouseRadius?: number;
  blur?: number;
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

const DETAIL_STEPS: Record<AcidSquaresDetail, number> = { low: 20, medium: 32, high: 48 };
const stepsFor = (detail: AcidSquaresDetail): number => DETAIL_STEPS[detail] || DETAIL_STEPS.medium;





const postFragment = `#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform vec2 iResolution;
uniform vec2 uDirection;
uniform float uRadius;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float iTime;
out vec4 fragColor;

vec4 samp(vec2 uv) {
  return texture(tMap, uv);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution;
  vec2 texel = uDirection / iResolution;
  float st = uRadius * 0.25;
  vec4 sum = samp(uv) * 0.2026;
  sum += (samp(uv + texel * st) + samp(uv - texel * st)) * 0.179;
  sum += (samp(uv + texel * (st * 2.0)) + samp(uv - texel * (st * 2.0))) * 0.124;
  sum += (samp(uv + texel * (st * 3.0)) + samp(uv - texel * (st * 3.0))) * 0.0672;
  sum += (samp(uv + texel * (st * 4.0)) + samp(uv - texel * (st * 4.0))) * 0.0285;
  vec4 col = sum;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    col.rgb = clamp(col.rgb + gv, 0.0, 1.0);
    col.a = clamp(col.a + gv, 0.0, 1.0);
  }
  fragColor = col;
}
`;

type AcidSquaresCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, AcidSquaresCtx>();

const AcidSquares: React.FC<AcidSquaresProps> = ({
  color1 = '#5227FF',
  color2 = '#A855F7',
  color3 = '#FFFFFF',
  detail = 'medium',
  speed = 0.7,
  waveDepth = 1,
  zoom = 1.3,
  density = 10.0,
  glow = 1.0,
  exposure = 2700,
  spread = 0.3,
  stepSize = 0.002,
  colorShift = 0,
  contrast = 1,
  brightness = 1.0,
  opacity = 1.0,
  mouseInteraction = true,
  mouseStrength = 0.1,
  mouseRadius = 0.35,
  blur = 0,
  grain = true,
  grainIntensity = 0.05,
  lightMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseTarget = useRef<[number, number]>([0, 0]);
  const mouseCurrent = useRef<[number, number]>([0, 0]);
  const enableMouseRef = useRef<boolean>(mouseInteraction);
  const mouseStrengthRef = useRef<number>(mouseStrength);
  const mouseActive = useRef<number>(0);
  const mouseActiveTarget = useRef<number>(0);
  const blurRef = useRef<number>(blur);
  const grainRef = useRef<boolean>(grain);
  const grainIntensityRef = useRef<number>(grainIntensity);

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
          uSpeed: { value: 0.7 },
          uWaveDepth: { value: 1 },
          uZoom: { value: 1.3 },
          uDensity: { value: 10.0 },
          uSpread: { value: 0.3 },
          uStepSize: { value: 0.002 },
          uGlow: { value: 1.0 },
          uExposure: { value: 2700 },
          uColorShift: { value: 0 },
          uContrast: { value: 1 },
          uBrightness: { value: 1.0 },
          uOpacity: { value: 1.0 },
          uSteps: { value: 32 },
          uColor1: { value: new Float32Array([1, 1, 1]) },
          uColor2: { value: new Float32Array([1, 1, 1]) },
          uColor3: { value: new Float32Array([1, 1, 1]) },
          uMouse: { value: new Float32Array([0, 0]) },
          uMouseStrength: { value: 0.1 },
          uMouseRadius: { value: 0.35 },
          uEnableMouse: { value: 1.0 },
          uMouseActive: { value: 0.0 },
          uGrain: { value: 1.0 },
          uGrainIntensity: { value: 0.05 },
          uLightMode: { value: 0.0 }
        }
      });

      runtime.program(program);
      const mesh = new Mesh(gl, { geometry, program });

      const postProgram = new Program(gl, {
        vertex,
        fragment: postFragment,
        uniforms: {
          tMap: { value: null },
          iResolution: { value: new Float32Array([1, 1]) },
          uDirection: { value: new Float32Array([1, 0]) },
          uRadius: { value: 0 },
          uGrain: { value: 0 },
          uGrainIntensity: { value: 0.05 },
          iTime: { value: 0 }
        }
      });
      runtime.program(postProgram);
      const postMesh = new Mesh(gl, { geometry, program: postProgram });
      const pu = postProgram.uniforms as Record<string, { value: any }>;
      const mu = program.uniforms as Record<string, { value: any }>;

      let rtA: InstanceType<typeof RenderTarget> | null = null;
      let rtB: InstanceType<typeof RenderTarget> | null = null;
      const ensureTargets = () => {
        if (!rtA) {
          const bw = gl.drawingBufferWidth;
          const bh = gl.drawingBufferHeight;
          rtA = new RenderTarget(gl, { width: bw, height: bh, depth: false });
          const rtAResource = rtA;
          runtime.own(() => { gl.deleteFramebuffer(rtAResource.buffer); rtAResource.textures.forEach(tex => gl.deleteTexture(tex.texture)); });
          rtB = new RenderTarget(gl, { width: bw, height: bh, depth: false });
          const rtBResource = rtB;
          runtime.own(() => { gl.deleteFramebuffer(rtBResource.buffer); rtBResource.textures.forEach(tex => gl.deleteTexture(tex.texture)); });
        }
      };

      const renderFrame = () => {
        const grainOn = grainRef.current ? 1.0 : 0.0;
        const grainAmt = grainIntensityRef.current;
        program.uniforms.uGrainIntensity.value = grainAmt;
        postProgram.uniforms.uGrainIntensity.value = grainAmt;
        if (blurRef.current > 0) {
          ensureTargets();
          mu.uGrain.value = 0.0;
          renderer.render({ scene: mesh, target: rtA ?? undefined });
          pu.uRadius.value = blurRef.current * 14.0;
          pu.tMap.value = rtA!.texture;
          pu.uDirection.value[0] = 1;
          pu.uDirection.value[1] = 0;
          pu.uGrain.value = 0.0;
          renderer.render({ scene: postMesh, target: rtB ?? undefined });
          pu.tMap.value = rtB!.texture;
          pu.uDirection.value[0] = 0;
          pu.uDirection.value[1] = 1;
          pu.uGrain.value = grainOn;
          renderer.render({ scene: postMesh });
        } else {
          mu.uGrain.value = grainOn;
          renderer.render({ scene: mesh });
        }
      };

      runtime.own(() => ctxMap.delete(container));
      ctxMap.set(container, { renderer, program, mesh });

      const setSize = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        renderer.setSize(w, h);
        const bw = gl.drawingBufferWidth;
        const bh = gl.drawingBufferHeight;
        const res = (program.uniforms.iResolution as { value: Float32Array }).value;
        res[0] = bw;
        res[1] = bh;
        const pres = pu.iResolution.value as Float32Array;
        pres[0] = bw;
        pres[1] = bh;
        if (rtA) {
          rtA.setSize(bw, bh);
          rtB!.setSize(bw, bh);
        }
        renderFrame();
      };

      runtime.resize(setSize, container);
      setSize();

      const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2.0;
        const y = -((e.clientY - rect.top) / rect.height - 0.5) * 2.0;
        mouseTarget.current = [x, y];
        mouseActiveTarget.current = 1;
      };
      const handleMouseLeave = () => {
        mouseActiveTarget.current = 0;
      };
      runtime.listen(container, 'mousemove', handleMouseMove);
      runtime.listen(container, 'mouseleave', handleMouseLeave);

      let raf = 0;
      let isVisible = true;
      let isPageVisible = !document.hidden;
      const t0 = performance.now();

      const loop = (t: number) => {
        (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;

        const cur = mouseCurrent.current;
        const tgt = mouseTarget.current;
        cur[0] += 0.05 * (tgt[0] - cur[0]);
        cur[1] += 0.05 * (tgt[1] - cur[1]);
        const m = (program.uniforms.uMouse as { value: Float32Array }).value;
        m[0] = cur[0];
        m[1] = cur[1];
        const activeTarget = enableMouseRef.current ? mouseActiveTarget.current : 0;
        mouseActive.current += 0.05 * (activeTarget - mouseActive.current);
        (program.uniforms.uMouseActive as { value: number }).value = mouseActive.current;
        (program.uniforms.uEnableMouse as { value: number }).value = enableMouseRef.current ? 1.0 : 0.0;
        (program.uniforms.uMouseStrength as { value: number }).value = mouseStrengthRef.current;

        pu.iTime.value = (program.uniforms.iTime as { value: number }).value;
        renderFrame();
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
    u.uWaveDepth.value = waveDepth;
    u.uZoom.value = zoom;
    u.uDensity.value = density;
    u.uSpread.value = spread;
    u.uStepSize.value = stepSize;
    u.uGlow.value = glow;
    u.uExposure.value = exposure;
    u.uColorShift.value = colorShift;
    u.uContrast.value = contrast;
    u.uBrightness.value = brightness;
    u.uOpacity.value = opacity;
    u.uLightMode.value = lightMode ? 1.0 : 0.0;
    u.uSteps.value = stepsFor(detail);
    u.uMouseRadius.value = mouseRadius;
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

    enableMouseRef.current = mouseInteraction;
    mouseStrengthRef.current = mouseStrength;
    blurRef.current = blur;
    grainRef.current = grain;
    grainIntensityRef.current = grainIntensity;
  }, [
    color1,
    color2,
    color3,
    detail,
    speed,
    waveDepth,
    zoom,
    density,
    glow,
    exposure,
    spread,
    stepSize,
    colorShift,
    contrast,
    brightness,
    opacity,
    mouseInteraction,
    mouseStrength,
    mouseRadius,
    blur,
    grain,
    grainIntensity,
    lightMode
  ]);

  return <div ref={containerRef} className={`acid-squares-container ${className}`.trim()} />;
};

export default AcidSquares;
