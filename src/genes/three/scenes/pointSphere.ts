import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// pointSphere — a Fibonacci globe of points, slowly turning and breathing with 3D noise, plus a faint halo shell.
// p0 density · p1 breathing amplitude · p2 noise scale · p3 halo amount
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const n = Math.round(5000 + p0 * 5000);
  const halo = Math.round(600 + p3 * 1800);
  const pos = new Float32Array((n + halo) * 3);
  const shell = new Float32Array(n + halo);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n + halo; i++) {
    const isHalo = i >= n;
    const j = isHalo ? i - n : i;
    const m = isHalo ? halo : n;
    const y = 1 - (j / (m - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = isHalo ? ctx.rng() * Math.PI * 2 : j * golden;
    const yy = isHalo ? ctx.rng() * 2 - 1 : y;
    const rr = isHalo ? Math.sqrt(1 - yy * yy) : r;
    pos.set([Math.cos(th) * rr, yy, Math.sin(th) * rr], i * 3);
    shell[i] = isHalo ? 1.25 + ctx.rng() * 0.9 : 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aShell', new THREE.BufferAttribute(shell, 1));
  const mat = material(
    ctx,
    `attribute float aShell;
    void main(){
      float f = mix(1.2, 2.8, uP.z);
      float n = snoise(position * f + vec3(0., uTime * .18, uTime * .1));
      float rad = 3.6 * aShell * (1. + n * mix(.04, .16, uP.y) * (aShell > 1.01 ? .3 : 1.));
      float ang = uTime * (aShell > 1.01 ? .03 : .07);
      float c = cos(ang), s = sin(ang);
      vec3 p = position * rad;
      p.xz = mat2(c, -s, s, c) * p.xz;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = aShell > 1.01 ? uC2 : ramp(n * .6 + .5 + position.y * .25);
      float front = smoothstep(-4.5, 3., p.z);
      vAlpha = (aShell > 1.01 ? .35 : .25 + .75 * front) * fogOf(mv);
      gl_PointSize = sizeOf(aShell > 1.01 ? .06 : .075, mv);
    }`
  );
  ctx.scene.add(new THREE.Points(geo, mat));
  ctx.uniforms.uFog.value.set(10, 26);
  const base = new THREE.Vector3(0, 1.2, 12.5);
  const look = new THREE.Vector3(0, 0, 0);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1.4),
    dispose: () => {}
  };
}
