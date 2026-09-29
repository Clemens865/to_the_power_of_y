import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// galaxySpiral — a tilted spiral galaxy of ~12k stars with differential rotation and a soft core.
// p0 arm count · p1 arm swirl · p2 rotation speed · p3 disc thickness
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, p1, , p3] = ctx.params;
  const n = 12000;
  const arms = 2 + Math.round(p0 * 3);
  const swirl = 0.35 + p1 * 0.6;
  const R = 11;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 0.6 + Math.pow(ctx.rng(), 0.8) * R;
    const arm = (Math.floor(ctx.rng() * arms) / arms) * Math.PI * 2;
    const scatter = Math.pow(ctx.rng(), 2.5) * (ctx.rng() < 0.5 ? -1 : 1) * (0.9 - r / (R * 2));
    const a = arm + r * swirl + scatter;
    const g = (ctx.rng() + ctx.rng() + ctx.rng() - 1.5) / 1.5;
    const y = g * (0.15 + p3 * 0.6) * (1.3 - r / R);
    pos.set([a, y, r], i * 3);
    seed[i] = ctx.rng();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = material(
    ctx,
    `attribute float aSeed;
    void main(){
      float r = position.z;
      float a = position.x - uTime * mix(.05, .2, uP.z) * (3. / (r + 2.));
      vec3 p = vec3(cos(a) * r, position.y, sin(a) * r);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float t = r / ${R.toFixed(1)};
      vColor = aSeed > .93 ? uC2 : mix(mix(uC3, uC0, smoothstep(.0, .3, t)), uC1, smoothstep(.3, .9, t));
      float twinkle = .7 + .3 * sin(uTime * 2. + aSeed * 60.);
      vAlpha = fogOf(mv) * twinkle * mix(.5, .95, smoothstep(.05, .25, t));
      gl_PointSize = sizeOf(aSeed > .97 ? .12 : .065, mv);
    }`
  );
  const pts = new THREE.Points(geo, mat);
  pts.rotation.set(0, 0, 0.18);
  ctx.scene.add(pts);
  ctx.uniforms.uFog.value.set(8, 34);
  const base = new THREE.Vector3(0, 7, 12.5);
  const look = new THREE.Vector3(0, -0.5, 0);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1.5),
    dispose: () => {}
  };
}
