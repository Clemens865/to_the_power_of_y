import { LibraryRuntime } from '../../../genes/bg/libraryRuntime';
// React Bits; see LICENSE.md. Local DPR cap and guarded lifecycle; see LibraryRuntime and LibrarySurface.
import { VERT, FRAG } from './shaders';
import { useEffect, useRef } from 'react';
import type { ElasticMeshProps } from './types';
export type { ElasticMeshProps } from './types';
import { Geometry, Program, Mesh, Texture } from 'ogl';

import './ElasticMesh.css';

const DIST = 4.6;
const FIT = 0.82;

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  const n = parseInt(h || '000000', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const ElasticMesh = ({
  image = '',
  color1 = '#5227FF',
  color2 = '#B19EEF',
  highlight = '#ffffff',
  showGrid = true,
  gridDensity = 20,
  gridOpacity = 0.28,
  gridColor = '#ffffff',
  borderRadius = 25,
  stiffness = 0.05,
  damping = 0.2,
  grabRadius = 0.6,
  pull = 0.4,
  wobble = 5,
  tilt = 14,
  shading = 0.5,
  resolution = 25,
  interaction = 'hover',
  enabled = true,
  className = '',
  style,
  ...rest
}: ElasticMeshProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef<Record<string, any>>({});
  propsRef.current = {
    color1,
    color2,
    highlight,
    showGrid,
    gridDensity,
    gridOpacity,
    gridColor,
    borderRadius,
    stiffness,
    damping,
    grabRadius,
    pull,
    wobble,
    tilt,
    shading,
    interaction,
    enabled
  };

  useEffect(() => {
    const container = containerRef.current as HTMLDivElement;
    if (!container) return;
    const runtime = new LibraryRuntime(container);
    runtime.run(() => {

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const renderer = runtime.renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 1.25) });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const N = Math.max(6, Math.min(40, Math.round(resolution)));
      const nodeCount = N * N;

      const aGrid = new Float32Array(nodeCount * 2);
      const uv = new Float32Array(nodeCount * 2);
      const aOffset = new Float32Array(nodeCount * 3);
      const aNormal = new Float32Array(nodeCount * 3);

      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = j * N + i;
          const u = i / (N - 1);
          const v = j / (N - 1);
          aGrid[idx * 2] = u;
          aGrid[idx * 2 + 1] = v;
          uv[idx * 2] = u;
          uv[idx * 2 + 1] = v;
          aNormal[idx * 3 + 2] = 1;
        }
      }

      const quads = (N - 1) * (N - 1);
      const index = new Uint16Array(quads * 6);
      let t = 0;
      for (let j = 0; j < N - 1; j++) {
        for (let i = 0; i < N - 1; i++) {
          const a = j * N + i;
          const b = a + 1;
          const c = a + N;
          const d = c + 1;
          index[t++] = a;
          index[t++] = c;
          index[t++] = b;
          index[t++] = b;
          index[t++] = c;
          index[t++] = d;
        }
      }

      const geometry = new Geometry(gl, {
        aGrid: { size: 2, data: aGrid },
        uv: { size: 2, data: uv },
        aOffset: { size: 3, data: aOffset },
        aNormal: { size: 3, data: aNormal },
        index: { data: index }
      });

      runtime.own(() => geometry.remove());
      const texture = new Texture(gl, { generateMipmaps: false, flipY: false });
      runtime.own(() => gl.deleteTexture(texture.texture));
      let hasImage = 0;
      if (image) {
        const img = new Image();
        runtime.own(() => { img.onload = null; img.onerror = null; img.removeAttribute('src'); });
        img.crossOrigin = 'anonymous';
        img.src = image;
        img.onload = runtime.guard(() => {
          texture.image = img;
          program.uniforms.uHasImage.value = 1;
        });
      }

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        transparent: true,
        cullFace: null,
        uniforms: {
          tMap: { value: texture },
          uHasImage: { value: hasImage },
          uColor1: { value: hexToRgb(color1) },
          uColor2: { value: hexToRgb(color2) },
          uHighlight: { value: hexToRgb(highlight) },
          uGrid: { value: showGrid ? 1 : 0 },
          uGridDensity: { value: gridDensity },
          uGridOpacity: { value: gridOpacity },
          uGridColor: { value: hexToRgb(gridColor) },
          uShading: { value: shading },
          uRes: { value: [1, 1] },
          uRadius: { value: borderRadius },
          uAspect: { value: 1 },
          uTilt: { value: (tilt * Math.PI) / 180 },
          uDist: { value: DIST },
          uFit: { value: FIT }
        }
      });

      runtime.program(program);
      const mesh = new Mesh(gl, { geometry, program });

      const baseX = new Float32Array(nodeCount);
      const baseY = new Float32Array(nodeCount);
      const pos = new Float32Array(nodeCount * 3);
      const vel = new Float32Array(nodeCount * 3);
      const accel = new Float32Array(nodeCount * 3);

      let aspect = 1;
      function refreshBase() {
        for (let idx = 0; idx < nodeCount; idx++) {
          baseX[idx] = (aGrid[idx * 2] * 2 - 1) * aspect;
          baseY[idx] = 1 - aGrid[idx * 2 + 1] * 2;
        }
      }

      function resize() {
        const w = container.offsetWidth || 1;
        const h = container.offsetHeight || 1;
        renderer.setSize(w, h);
        aspect = w / h;
        program.uniforms.uAspect.value = aspect;
        program.uniforms.uRes.value = [w, h];
        refreshBase();
      }

      runtime.resize(resize, container);
      resize();

      const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, targetActive: false };

      function toPlane(clientX: number, clientY: number) {
        const rect = container.getBoundingClientRect();
        const mx = (clientX - rect.left) / rect.width;
        const my = (clientY - rect.top) / rect.height;
        const clipX = mx * 2 - 1;
        const clipY = 1 - my * 2;
        const t = ((propsRef.current.tilt || 0) * Math.PI) / 180;
        const ct = Math.cos(t);
        const st = Math.sin(t);
        const a = clipY / (ct * FIT * DIST);
        const py = (a * DIST) / (1 + a * st);
        const persp = DIST / (DIST - py * st);
        pointer.tx = (clipX * aspect) / (persp * FIT);
        pointer.ty = py;
      }

      function onMove(e: MouseEvent) {
        toPlane(e.clientX, e.clientY);
        if (propsRef.current.interaction === 'hover') pointer.targetActive = true;
      }
      function onEnter() {
        if (propsRef.current.interaction === 'hover') pointer.targetActive = true;
      }
      function onLeave() {
        pointer.targetActive = false;
      }
      function onDown(e: MouseEvent) {
        if (propsRef.current.interaction === 'drag') {
          toPlane(e.clientX, e.clientY);
          pointer.x = pointer.tx;
          pointer.y = pointer.ty;
          pointer.targetActive = true;
        }
      }
      function onUp() {
        if (propsRef.current.interaction === 'drag') pointer.targetActive = false;
      }
      function onTouch(e: TouchEvent) {
        if (e.touches.length) {
          toPlane(e.touches[0].clientX, e.touches[0].clientY);
          pointer.targetActive = true;
        }
      }

      runtime.listen(container, 'mousemove', onMove);
      runtime.listen(container, 'mouseenter', onEnter);
      runtime.listen(container, 'mouseleave', onLeave);
      runtime.listen(container, 'mousedown', onDown);
      runtime.listen(window, 'mouseup', onUp);
      runtime.listen(container, 'touchstart', onTouch, { passive: true });
      runtime.listen(container, 'touchmove', onTouch, { passive: true });
      runtime.listen(container, 'touchend', onLeave);

      const STEP = 1 / 120;
      const MAX_SUB = 5;
      let accTime = 0;
      let last = performance.now();
      let maxOffset = 0;
      let maxVel = 0;

      function substep() {
        const p = propsRef.current;
        const s = p.stiffness;
        const retain = 1 - p.damping;
        const coupling = 0.06 + p.wobble * 0.032;
        const active = pointer.active && p.enabled && !reduceMotion;
        const r = Math.max(0.08, p.grabRadius) * 1.4;
        const invR = 1 / r;
        const force = p.pull * 0.009;

        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N; i++) {
            const idx = j * N + i;
            const o3 = idx * 3;
            const ox = pos[o3];
            const oy = pos[o3 + 1];
            const oz = pos[o3 + 2];

            let ax = -s * ox;
            let ay = -s * oy;
            let az = -s * oz;

            let sumx = 0;
            let sumy = 0;
            let sumz = 0;
            let cnt = 0;
            if (i > 0) {
              const n = (idx - 1) * 3;
              sumx += pos[n];
              sumy += pos[n + 1];
              sumz += pos[n + 2];
              cnt++;
            }
            if (i < N - 1) {
              const n = (idx + 1) * 3;
              sumx += pos[n];
              sumy += pos[n + 1];
              sumz += pos[n + 2];
              cnt++;
            }
            if (j > 0) {
              const n = (idx - N) * 3;
              sumx += pos[n];
              sumy += pos[n + 1];
              sumz += pos[n + 2];
              cnt++;
            }
            if (j < N - 1) {
              const n = (idx + N) * 3;
              sumx += pos[n];
              sumy += pos[n + 1];
              sumz += pos[n + 2];
              cnt++;
            }
            ax += coupling * (sumx - cnt * ox);
            ay += coupling * (sumy - cnt * oy);
            az += coupling * (sumz - cnt * oz);

            if (active) {
              const dx = pointer.x - (baseX[idx] + ox);
              const dy = pointer.y - (baseY[idx] + oy);
              const d = Math.sqrt(dx * dx + dy * dy);
              const tnorm = d * invR;
              if (tnorm < 1) {
                const zBump = 1 - tnorm * tnorm;
                az += force * zBump * zBump * 6.0;
                if (d > 1e-4) {
                  const pinch = tnorm * (1 - tnorm) * (1 - tnorm) * 6.75;
                  const dir = (force * pinch * 1.6) / d;
                  ax += dx * dir;
                  ay += dy * dir;
                }
              }
            }

            accel[o3] = ax;
            accel[o3 + 1] = ay;
            accel[o3 + 2] = az;
          }
        }

        for (let k = 0; k < nodeCount; k++) {
          const o3 = k * 3;
          const nvx = (vel[o3] + accel[o3]) * retain;
          const nvy = (vel[o3 + 1] + accel[o3 + 1]) * retain;
          const nvz = (vel[o3 + 2] + accel[o3 + 2]) * retain;
          vel[o3] = nvx;
          vel[o3 + 1] = nvy;
          vel[o3 + 2] = nvz;

          let px = pos[o3] + nvx;
          let py = pos[o3 + 1] + nvy;
          let pz = pos[o3 + 2] + nvz;
          if (px > 1.2) px = 1.2;
          else if (px < -1.2) px = -1.2;
          if (py > 1.2) py = 1.2;
          else if (py < -1.2) py = -1.2;
          if (pz > 1.2) pz = 1.2;
          else if (pz < -1.2) pz = -1.2;
          pos[o3] = px;
          pos[o3 + 1] = py;
          pos[o3 + 2] = pz;
        }
      }

      function commit() {
        maxOffset = 0;
        maxVel = 0;
        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N; i++) {
            const idx = j * N + i;
            const o3 = idx * 3;
            const iL = i > 0 ? idx - 1 : idx;
            const iR = i < N - 1 ? idx + 1 : idx;
            const iD = j > 0 ? idx - N : idx;
            const iU = j < N - 1 ? idx + N : idx;

            const lx = baseX[iL] + pos[iL * 3];
            const ly = baseY[iL] + pos[iL * 3 + 1];
            const lz = pos[iL * 3 + 2];
            const rx = baseX[iR] + pos[iR * 3];
            const ry = baseY[iR] + pos[iR * 3 + 1];
            const rz = pos[iR * 3 + 2];
            const dx = baseX[iD] + pos[iD * 3];
            const dy = baseY[iD] + pos[iD * 3 + 1];
            const dz = pos[iD * 3 + 2];
            const ux = baseX[iU] + pos[iU * 3];
            const uy = baseY[iU] + pos[iU * 3 + 1];
            const uz = pos[iU * 3 + 2];

            const txx = rx - lx;
            const txy = ry - ly;
            const txz = rz - lz;
            const tyx = ux - dx;
            const tyy = uy - dy;
            const tyz = uz - dz;

            let nx = txy * tyz - txz * tyy;
            let ny = txz * tyx - txx * tyz;
            let nz = txx * tyy - txy * tyx;
            if (nz < 0) {
              nx = -nx;
              ny = -ny;
              nz = -nz;
            }
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            aNormal[o3] = nx / len;
            aNormal[o3 + 1] = ny / len;
            aNormal[o3 + 2] = nz / len;

            aOffset[o3] = pos[o3];
            aOffset[o3 + 1] = pos[o3 + 1];
            aOffset[o3 + 2] = pos[o3 + 2];

            const om = Math.abs(pos[o3]) + Math.abs(pos[o3 + 1]) + Math.abs(pos[o3 + 2]);
            if (om > maxOffset) maxOffset = om;
            const vm = Math.abs(vel[o3]) + Math.abs(vel[o3 + 1]) + Math.abs(vel[o3 + 2]);
            if (vm > maxVel) maxVel = vm;
          }
        }
        geometry.attributes.aOffset.needsUpdate = true;
        geometry.attributes.aNormal.needsUpdate = true;
      }

      function frame(now: number) {
        const p = propsRef.current;

        program.uniforms.uShading.value = p.shading;
        program.uniforms.uRadius.value = p.borderRadius;
        program.uniforms.uTilt.value = (p.tilt * Math.PI) / 180;
        program.uniforms.uColor1.value = hexToRgb(p.color1);
        program.uniforms.uColor2.value = hexToRgb(p.color2);
        program.uniforms.uHighlight.value = hexToRgb(p.highlight);
        program.uniforms.uGrid.value = p.showGrid ? 1 : 0;
        program.uniforms.uGridDensity.value = p.gridDensity;
        program.uniforms.uGridOpacity.value = p.gridOpacity;
        program.uniforms.uGridColor.value = hexToRgb(p.gridColor);

        let dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;

        const tau = 0.06;
        const kLerp = 1 - Math.exp(-Math.max(dt, 1e-4) / tau);
        pointer.x += (pointer.tx - pointer.x) * kLerp;
        pointer.y += (pointer.ty - pointer.y) * kLerp;
        pointer.active = pointer.targetActive;

        accTime += dt;
        let sub = 0;
        while (accTime >= STEP && sub < MAX_SUB) {
          substep();
          accTime -= STEP;
          sub++;
        }
        if (accTime > STEP) accTime = 0;

        commit();
        renderer.render({ scene: mesh });
        runtime.frame(frame);
      }
      runtime.frame(frame);

      container.appendChild(gl.canvas);

    });
    return runtime.dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, resolution]);

  return (
    <div ref={containerRef} className={`elastic-mesh${className ? ` ${className}` : ''}`} style={style} {...rest} />
  );
};

export default ElasticMesh;
