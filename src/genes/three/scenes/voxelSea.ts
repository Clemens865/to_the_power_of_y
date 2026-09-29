import * as THREE from 'three';
import { FRAG_SOLID, drift, material, type SceneCtx, type SceneInstance } from '../common';

// voxelSea — a field of instanced voxel columns rising and falling in rolling waves, seen from above at an angle.
// p0 grid size · p1 wave height · p2 wave speed · p3 wave scale
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0] = ctx.params;
  const nx = Math.round(38 + p0 * 14);
  const nz = Math.round(36 + p0 * 12);
  const cell = 0.7;
  const count = nx * nz;
  const cellAttr = new Float32Array(count * 2);
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) cellAttr.set([(i - nx / 2 + 0.5) * cell, 9 - j * cell], (i * nz + j) * 2);
  const geo = new THREE.BoxGeometry(cell * 0.94, 1, cell * 0.94);
  geo.translate(0, 0.5, 0);
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellAttr, 2));
  const mat = material(
    ctx,
    `attribute vec2 aCell;
    void main(){
      vec2 c = aCell;
      float f = mix(.06, .16, uP.w);
      float s = uTime * mix(.3, .9, uP.z);
      float w = sin(c.x * f * 2.2 + s) * .5 + sin(c.y * f * 1.7 - s * .8 + c.x * .05) * .5;
      float n = snoise(vec3(c * f, s * .3)) * .6;
      float h = (w * .6 + n) * .5 + .5;
      float hh = .15 + h * h * mix(1., 3., uP.y);
      vec3 p = vec3(position.x + c.x, position.y * hh - 2., position.z + c.y);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float shade = normal.y > .5 ? 1. : (normal.x != 0. ? .62 : .78);
      vColor = ramp(h) * shade;
      vAlpha = fogOf(mv) * mix(.75, 1., h);
    }`,
    { frag: FRAG_SOLID, solid: true }
  );
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  // A diagonal grid keeps the gaps between columns from lining up with the view.
  mesh.rotation.y = 0.5;
  // A dim floor fills the gaps between columns, so they read as grooves rather than see-through streaks.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(nx * cell, nz * cell),
    material(ctx, `void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vColor = mix(uC0, uBg, .2) * .45; vAlpha = fogOf(mv); }`, { frag: FRAG_SOLID, solid: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.01, 9 - (nz - 1) * cell * 0.5);
  mesh.add(floor);
  ctx.scene.add(mesh);
  ctx.uniforms.uFog.value.set(14, 48);
  const base = new THREE.Vector3(0, 10.5, 12);
  const look = new THREE.Vector3(0, -2, -7);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1),
    dispose: () => {}
  };
}
