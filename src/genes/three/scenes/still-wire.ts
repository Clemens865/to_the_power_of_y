import * as THREE from 'three';
import { type SceneCtx } from '../common';
import { fib, lines, shadeMat, spikes, type Ink, type Part } from './still-base';

const circle = (r: number, seg: number, out: number[], tilt = 0) => {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    out.push(Math.cos(a0) * r, Math.sin(a0) * tilt, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * tilt, Math.sin(a1) * r);
  }
};
const geoOf = (pos: number[]) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
const spinY = (obj: THREE.Object3D, rate: number, tilt = 0.25): Part => ({ obj, update: t => obj.rotation.set(tilt + Math.sin(t * 0.1) * 0.08, t * rate, 0) });

// Wire globe: latitude/longitude lines plus radial needles of varying length.
export const wireGlobe = (ctx: SceneCtx, ink: Ink): Part => {
  const pos: number[] = [];
  for (let i = 1; i < 14; i++) {
    const phi = (i / 14) * Math.PI;
    const r = Math.sin(phi);
    const y = Math.cos(phi);
    const seg = 64;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2;
      const a1 = ((k + 1) / seg) * Math.PI * 2;
      pos.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  for (let m = 0; m < 20; m++) {
    const th = (m / 20) * Math.PI * 2;
    for (let k = 0; k < 32; k++) {
      const p0 = (k / 32) * Math.PI;
      const p1 = ((k + 1) / 32) * Math.PI;
      pos.push(Math.sin(p0) * Math.cos(th), Math.cos(p0), Math.sin(p0) * Math.sin(th), Math.sin(p1) * Math.cos(th), Math.cos(p1), Math.sin(p1) * Math.sin(th));
    }
  }
  const obj = new THREE.Group();
  obj.add(lines(ctx, geoOf(pos), ink.line, 0.85), spikes(ctx, fib(260), 1, 1.35, ink.accent));
  return spinY(obj, 0.07, 0.35);
};

export const wireTorus = (ctx: SceneCtx, ink: Ink): Part => {
  const obj = new THREE.Group();
  obj.add(lines(ctx, new THREE.WireframeGeometry(new THREE.TorusGeometry(0.85, 0.36, 14, 44)), ink.line, 0.7));
  return { obj, update: t => obj.rotation.set(1.1 + Math.sin(t * 0.12) * 0.3, t * 0.1, t * 0.04) };
};

export const wireKnot = (ctx: SceneCtx, ink: Ink): Part => {
  const obj = new THREE.Group();
  obj.add(lines(ctx, new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(0.72, 0.22, 110, 7, 2, 3)), ink.line, 0.6));
  return { obj, update: t => obj.rotation.set(t * 0.05, t * 0.11, 0.3) };
};

// Stacked wire cubes, each level turning at its own offset.
export const cubeStack = (ctx: SceneCtx, ink: Ink, rng: () => number): Part => {
  const obj = new THREE.Group();
  const n = 3 + Math.floor(rng() * 2);
  const edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const cubes = Array.from({ length: n }, (_, i) => {
    const c = lines(ctx, edge, i % 2 ? ink.accent : ink.line, 0.9);
    const s = 0.95 - i * 0.12;
    c.scale.setScalar(s);
    c.position.y = -0.9 + i * (1.9 / (n - 1));
    obj.add(c);
    return c;
  });
  return { obj, update: t => cubes.forEach((c, i) => (c.rotation.y = t * 0.12 * (i % 2 ? -1 : 1) + i * 0.4)) };
};

// Gyroscope: three nested rings on different axes around a small shaded core.
export const gyro = (ctx: SceneCtx, ink: Ink): Part => {
  const obj = new THREE.Group();
  const rings = [1, 0.8, 0.6].map((r, i) => {
    const pos: number[] = [];
    [0, 0.02, -0.02].forEach(o => circle(r + o, 96, pos));
    const g = new THREE.Group();
    g.add(lines(ctx, geoOf(pos), i === 1 ? ink.accent : ink.line, 0.9));
    return g;
  });
  rings[0].add(rings[1]);
  rings[1].add(rings[2]);
  obj.add(rings[0], new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), shadeMat(ctx, ink.accent)));
  return {
    obj,
    update: t => {
      rings[0].rotation.set(0.4, 0, t * 0.15);
      rings[1].rotation.set(t * 0.22, 0, 0);
      rings[2].rotation.set(0, 0, t * 0.3);
      obj.rotation.y = t * 0.05;
    }
  };
};

// Urchin: shaded core and many long breathing spikes.
export const urchin = (ctx: SceneCtx, ink: Ink): Part => {
  const obj = new THREE.Group();
  obj.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), shadeMat(ctx, ink.line)));
  obj.add(spikes(ctx, fib(200), 0.5, 1.35, ink.accent, 0.9));
  return spinY(obj, 0.09, 0.2);
};
