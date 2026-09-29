import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// helix — a long double helix of glowing points with dotted rungs, twisting diagonally through depth.
// p0 twist density · p1 radius · p2 spin speed · p3 rung count
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const len = 40;
  const strand = 2200;
  const rungs = Math.round(50 + p3 * 70);
  const perRung = 14;
  const n = strand * 2 + rungs * perRung;
  const pos = new Float32Array(n * 3);
  let k = 0;
  // position = (axis coordinate, phase offset, radial fraction)
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < strand; i++) pos.set([(i / strand - 0.5) * len, s * Math.PI, 1 + ctx.rng() * 0.12], 3 * k++);
  for (let r = 0; r < rungs; r++) {
    const x = (r / rungs - 0.5) * len;
    for (let j = 0; j < perRung; j++) pos.set([x, 0, -1 + (2 * (j + 0.5)) / perRung], 3 * k++);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const twist = (0.25 + p0 * 0.35).toFixed(3);
  const mat = material(
    ctx,
    `void main(){
      float a = position.x * ${twist} + position.y + uTime * mix(.2, .7, uP.z);
      float rad = mix(1.6, 3., uP.y) * position.z;
      vec3 p = vec3(position.x, cos(a) * rad, sin(a) * rad);
      p.y += sin(position.x * .12 + uTime * .3) * .8;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float depth = sin(a) * .5 + .5;
      bool isRung = abs(position.z) < .99;
      vColor = isRung ? uC2 : (position.y > 1. ? uC0 : uC1);
      vAlpha = fogOf(mv) * (isRung ? .45 : .35 + .65 * depth);
      gl_PointSize = sizeOf(isRung ? .07 : .1, mv);
    }`
  );
  const pts = new THREE.Points(geo, mat);
  pts.rotation.set(0.2, -0.32, 0.22);
  ctx.scene.add(pts);
  ctx.uniforms.uFog.value.set(6, 30);
  const base = new THREE.Vector3(0, 0.5, 13);
  const look = new THREE.Vector3(0, 0, 0);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1.2),
    dispose: () => {}
  };
}
