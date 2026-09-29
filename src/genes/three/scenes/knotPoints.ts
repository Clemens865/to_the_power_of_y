import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// knotPoints — a torus knot sampled as a tube of points, turning slowly while light pulses travel along it.
// p0 knot type · p1 tube radius · p2 spin speed · p3 pulse count
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const knots: [number, number][] = [[2, 3], [3, 4], [2, 5], [3, 5], [3, 7]];
  const [P, Q] = knots[Math.min(knots.length - 1, Math.floor(p0 * knots.length))];
  const along = 1400;
  const around = 9;
  const n = along * around;
  const uv = new Float32Array(n * 3);
  for (let i = 0; i < along; i++)
    for (let j = 0; j < around; j++) uv.set([(i + ctx.rng() * 0.5) / along, (j + ctx.rng() * 0.3) / around, 0], (i * around + j) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(uv, 3));
  const mat = material(
    ctx,
    `vec3 knot(float u){ float a = u * 6.2831853; float r = 2. + cos(${Q.toFixed(1)} * a);
      return vec3(r * cos(${P.toFixed(1)} * a), r * sin(${P.toFixed(1)} * a), -sin(${Q.toFixed(1)} * a)) * 1.55; }
    void main(){
      float u = position.x;
      vec3 c = knot(u);
      vec3 t = normalize(knot(u + .001) - c);
      vec3 b = normalize(cross(t, normalize(knot(u + .002) + c - 2. * knot(u + .001) + vec3(0., 0., 1e-4))));
      vec3 nn = cross(b, t);
      float ang = position.y * 6.2831853 + u * 40. + uTime * .3;
      float tube = mix(.18, .6, uP.y) * (1. + .25 * snoise(vec3(u * 12., position.y * 3., uTime * .3)));
      vec3 p = c + (nn * cos(ang) + b * sin(ang)) * tube;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float pulse = pow(.5 + .5 * sin((u * ${Math.round(3 + p3 * 6)}.0 - uTime * .12) * 6.2831853), 6.);
      vColor = mix(mix(uC0, uC1, .5 + .5 * sin(u * 12.566)), uC2, pulse);
      vAlpha = fogOf(mv) * (.35 + .65 * pulse + .2 * (.5 + .5 * cos(ang)));
      gl_PointSize = sizeOf(.07 + pulse * .04, mv);
    }`
  );
  const pts = new THREE.Points(geo, mat);
  ctx.scene.add(pts);
  ctx.uniforms.uFog.value.set(9, 26);
  const base = new THREE.Vector3(0, 0.5, 14);
  const look = new THREE.Vector3(0, 0, 0);
  const spin = 0.04 + ctx.params[2] * 0.12;
  return {
    update: (t, _dt, p) => {
      pts.rotation.set(0.5 + Math.sin(t * 0.07) * 0.3, t * spin, 0.2);
      drift(ctx, base, look, t, p, 1.2);
    },
    dispose: () => {}
  };
}
