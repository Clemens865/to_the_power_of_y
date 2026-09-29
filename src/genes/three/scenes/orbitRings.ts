import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// orbitRings — tilted planetary rings of dots orbiting an empty centre, each at its own speed.
// p0 ring count · p1 tilt spread · p2 orbit speed · p3 ring thickness
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, p1, , p3] = ctx.params;
  const rings = Math.round(5 + p0 * 5);
  const per = 1300;
  // A shared system tilt keeps the rings reading as one planetary system; each ring deviates a little.
  const sysX = (ctx.rng() - 0.5) * 0.5;
  const sysZ = (ctx.rng() - 0.5) * 0.6;
  const n = rings * per;
  const pos = new Float32Array(n * 3);
  const orb = new Float32Array(n * 4);
  for (let r = 0; r < rings; r++) {
    const radius = 3 + r * (5.5 / rings) + ctx.rng() * 0.3;
    const tx = sysX + (ctx.rng() - 0.5) * (0.08 + p1 * 0.45);
    const tz = sysZ + (ctx.rng() - 0.5) * (0.08 + p1 * 0.45);
    const sp = (0.15 + ctx.rng() * 0.35) * (ctx.rng() < 0.3 ? -1 : 1) * (4 / radius);
    for (let i = 0; i < per; i++) {
      const k = r * per + i;
      const a = (i / per) * Math.PI * 2;
      const spread = (ctx.rng() - 0.5) * (0.05 + p3 * 0.5);
      pos[k * 3] = a;
      pos[k * 3 + 1] = radius + spread;
      pos[k * 3 + 2] = (ctx.rng() - 0.5) * p3 * 0.2;
      orb.set([tx, tz, sp, r % 3], k * 4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aOrb', new THREE.BufferAttribute(orb, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
  const mat = material(
    ctx,
    `attribute vec4 aOrb;
    mat3 rx(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
    mat3 rz(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
    void main(){
      float a = position.x + uTime * aOrb.z * mix(.4, 1.3, uP.z);
      float rad = position.y * (1. + .03 * sin(a * 3. + uTime));
      vec3 p = vec3(cos(a) * rad, position.z, sin(a) * rad);
      p = rz(aOrb.y + sin(uTime * .05) * .1) * rx(aOrb.x) * p;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = aOrb.w < .5 ? uC0 : aOrb.w < 1.5 ? uC1 : uC2;
      float spark = .55 + .45 * sin(position.x * 40. + uTime * 2.);
      vAlpha = fogOf(mv) * (.35 + .65 * spark);
      gl_PointSize = sizeOf(.075, mv);
    }`
  );
  ctx.scene.add(new THREE.Points(geo, mat));
  ctx.uniforms.uFog.value.set(6, 26);
  const base = new THREE.Vector3(0, 3.4, 12.5);
  const look = new THREE.Vector3(0, 0, 0);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1.3),
    dispose: () => {}
  };
}
