import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// dotField — a wide grid of dots undulating like a noisy sea surface, seen from a low camera.
// p0 density · p1 amplitude · p2 noise scale · p3 camera height
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const step = 0.55 - p0 * 0.2;
  const nx = Math.round(44 / step);
  const nz = Math.round(40 / step);
  const pos = new Float32Array(nx * nz * 3);
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const k = (i * nz + j) * 3;
      pos[k] = (i - nx / 2) * step;
      pos[k + 2] = 8 - j * step;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = material(
    ctx,
    `void main(){
      vec3 p = position;
      float f = mix(.07, .18, uP.z);
      float n = snoise(vec3(p.x * f, p.z * f - uTime * .22, uTime * .1));
      float w = sin(p.x * .22 + uTime * .5) * .25 + cos(p.z * .18 - uTime * .4) * .25;
      float h = n * mix(.6, 1.7, uP.y) + w;
      p.y = h;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = ramp(h * .45 + .5);
      vAlpha = fogOf(mv) * (.45 + .55 * smoothstep(-1., 1.4, h));
      gl_PointSize = sizeOf(.1, mv);
    }`
  );
  ctx.scene.add(new THREE.Points(geo, mat));
  ctx.uniforms.uFog.value.set(6, 30);
  const base = new THREE.Vector3(0, 1.6 + p3 * 2.2, 11);
  const look = new THREE.Vector3(0, -0.4, -6);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p),
    dispose: () => {}
  };
}
