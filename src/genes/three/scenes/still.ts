import * as THREE from 'three';
import { type SceneCtx, type SceneInstance } from '../common';
import { backdrop, type Ink, type Part } from './still-base';
import { floor, type FloorKind } from './still-floor';
import { crystal, glassOrb } from './still-solid';
import { cubeStack, gyro, urchin, wireGlobe, wireKnot, wireTorus } from './still-wire';

// Still life: one large hero object off-centre, 0–2 smaller companions at other depths, an optional
// waving floor, a soft backdrop and vignette, and a slowly orbiting camera. The centre stays clear.
// layout: [floor, side, companions, companion A, companion B, placement, bob, camera]
type Maker = (ctx: SceneCtx, ink: Ink, rng: () => number) => Part;
const OBJECTS: Record<string, Maker> = { globe: wireGlobe, orb: glassOrb, torus: wireTorus, crystal, gyro, urchin, knot: wireKnot, cubes: cubeStack };
const COMPANIONS = ['orb', 'orb', 'crystal', 'torus', 'cubes', 'gyro', 'urchin', 'globe'];
// Visual size of each object relative to a unit sphere.
const SIZE: Record<string, number> = { gyro: 1.45, torus: 1.15, knot: 1.25, cubes: 0.95 };
const FLOORS: FloorKind[] = ['grid', 'dots', 'rings', 'horizon'];

export function buildStill(ctx: SceneCtx, hero: string): SceneInstance {
  const L = (i: number) => ctx.layout[i] ?? ctx.rng();
  const [p0, p1] = ctx.params;
  const side = L(1) < 0.5 ? -1 : 1;
  backdrop(ctx);
  const heroX = side * (5.4 + p0 * 0.5);
  if (L(0) > 0.2) ctx.scene.add(floor(ctx, FLOORS[Math.floor(((L(0) - 0.2) / 0.8) * 3.999)], heroX));

  const parts: { part: Part; base: THREE.Vector3; bob: number }[] = [];
  const place = (kind: string, ink: Ink, at: THREE.Vector3, scale: number, bob: number) => {
    const part = (OBJECTS[kind] ?? wireGlobe)(ctx, ink, ctx.rng);
    part.obj.scale.setScalar(scale * (SIZE[kind] ?? 1));
    const holder = new THREE.Group();
    holder.add(part.obj);
    holder.position.copy(at);
    ctx.scene.add(holder);
    parts.push({ part: { obj: holder, update: part.update }, base: at.clone(), bob });
  };
  place(hero, { line: 'uC0', accent: 'uC1' }, new THREE.Vector3(heroX, 0.1, 0), 2.3 + p0 * 0.6, 0.12);

  // Companions go into screen-space slots (normalised x/y at a depth) seen from the base camera,
  // so they never drift into the centre or sit on top of the hero, whatever the depth.
  const orbit = (L(7) - 0.5) * 0.3;
  const look = new THREE.Vector3(0, 0.3, -2);
  const eye = new THREE.Vector3(Math.sin(orbit) * 12.5, 1.4, Math.cos(orbit) * 12.5 - 2);
  const fwd = look.clone().sub(eye).normalize();
  const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(fwd);
  const tan = Math.tan((55 / 2) * (Math.PI / 180));
  const slot = (x: number, y: number, d: number) =>
    eye.clone().addScaledVector(fwd, d).addScaledVector(right, x * tan * 1.6 * d).addScaledVector(up, y * tan * d);
  const count = L(2) < 0.25 ? 0 : L(2) < 0.7 ? 1 : 2;
  const pick = (v: number) => {
    const pool = COMPANIONS.filter(k => k !== hero);
    return pool[Math.floor(v * pool.length) % pool.length];
  };
  // Opposite side, upper: balances the hero.
  if (count > 0) place(pick(L(3)), { line: 'uC1', accent: 'uC2' }, slot(-side * (0.55 + L(5) * 0.15), 0.3 + L(6) * 0.25, 15 + L(5) * 5), 0.8 + L(6) * 0.4, 0.25);
  // Far and small: low on the opposite side, or high in the hero's outer corner.
  if (count > 1) {
    const corner = L(4) > 0.5;
    place(pick(L(4) * 7), { line: 'uC2', accent: 'uC0' }, corner ? slot(side * 0.84, 0.68, 24) : slot(-side * 0.78, -0.18, 22), 0.9 + L(5) * 0.4, 0.3);
  }
  ctx.uniforms.uFog.value.set(16, 50);

  const spin = 0.6 + p1 * 0.8;
  const cam = new THREE.Vector3();
  return {
    update: (t, _dt, p) => {
      parts.forEach(({ part, base, bob }, i) => {
        part.update(t * spin);
        part.obj.position.set(base.x, base.y + Math.sin(t * 0.5 + i * 2.1 + L(6) * 6) * bob, base.z);
      });
      const a = orbit + Math.sin(t * 0.045) * 0.16 + p.x * 0.08;
      const r = 12.5 + Math.sin(t * 0.06) * 0.8;
      cam.set(Math.sin(a) * r, 1.4 + Math.sin(t * 0.05) * 0.3 + p.y * 0.6, Math.cos(a) * r - 2);
      ctx.camera.position.copy(cam);
      ctx.camera.lookAt(look);
    },
    dispose: () => {}
  };
}
