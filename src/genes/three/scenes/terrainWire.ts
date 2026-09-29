import * as THREE from 'three';
import { FRAG_FLAT, drift, material, type SceneCtx, type SceneInstance } from '../common';

// terrainWire — a wireframe landscape scrolling toward a striped horizon sun (synthwave), valley kept flat.
// p0 grid density · p1 mountain height · p2 scroll speed · p3 sun size
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const cell = 1.1 - p0 * 0.4;
  const nx = Math.round(48 / cell);
  const nz = Math.round(44 / cell);
  const v: number[] = [];
  const at = (i: number, j: number) => [(i - nx / 2) * cell, 0, 4 - j * cell];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      if (j < nz) v.push(...at(i, j), ...at(i, j + 1));
      if (i < nx) v.push(...at(i, j), ...at(i + 1, j));
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const mat = material(
    ctx,
    `void main(){
      float cell = ${cell.toFixed(4)};
      float s = uTime * mix(1.2, 3.5, uP.z);
      float step = floor(s / cell) * cell;
      vec3 p = position;
      p.z += s - step;
      vec2 q = vec2(p.x, position.z - step) * .12;
      float n = snoise(vec3(q, 1.7)) * .6 + snoise(vec3(q * 2.3, 4.1)) * .25;
      float valley = smoothstep(2.5, 11., abs(p.x));
      float h = (n * .5 + .5) * valley * mix(2., 6., uP.y);
      p.y = h - 1.2;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = mix(uC0, uC1, smoothstep(.5, 4.5, h));
      vAlpha = fogOf(mv) * .9;
    }`,
    { frag: FRAG_FLAT }
  );
  ctx.scene.add(new THREE.LineSegments(geo, mat));
  const sunMat = material(
    ctx,
    `varying vec2 vUv2;
    void main(){ vUv2 = uv; vColor = uC2; vAlpha = 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    {
      frag: FRAG_FLAT.replace('void main(){', 'varying vec2 vUv2;\nvoid main(){').replace(
        'float a = min(1., vAlpha * calm() * uInk);',
        `vec2 d = vUv2 - .5; float r = length(d);
        float stripe = d.y > 0. ? 1. : step(.35 + d.y * 1.2, fract(d.y * 14. - uTime * .4));
        float a = smoothstep(.5, .48, r) * stripe * .85 * calm() * uInk;
        vec3 vColor = mix(uC2, uC1, smoothstep(.45, -.45, d.y));`
      )
    }
  );
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sunMat);
  const size = 16 + p3 * 14;
  sun.scale.set(size, size, 1);
  sun.position.set(0, size * 0.18, -44);
  sun.renderOrder = -1;
  ctx.scene.add(sun);
  // An opaque ground in the background colour hides the lower half of the sun behind the horizon.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshBasicMaterial({ color: ctx.bg }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -1.25, -40);
  ctx.scene.add(ground);
  ctx.uniforms.uFog.value.set(8, 42);
  const base = new THREE.Vector3(0, 2.2, 7);
  const look = new THREE.Vector3(0, 1.2, -20);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 0.7),
    dispose: () => {}
  };
}
