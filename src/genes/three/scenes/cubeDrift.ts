import * as THREE from 'three';
import { FRAG_SOLID, ROTATE, drift, material, type SceneCtx, type SceneInstance } from '../common';

// cubeDrift — instanced cubes tumbling slowly through deep space toward the camera, face-shaded.
// p0 count · p1 cube size · p2 tumble speed · p3 spread
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, p1, , p3] = ctx.params;
  const count = Math.round(260 + p0 * 420);
  const off = new Float32Array(count * 4);
  const rot = new Float32Array(count * 4);
  const spread = 10 + p3 * 8;
  for (let i = 0; i < count; i++) {
    let x = (ctx.rng() * 2 - 1) * spread;
    let y = (ctx.rng() * 2 - 1) * spread * 0.6;
    // Keep a quiet corridor around the centre line, where the button sits.
    const d = Math.hypot(x / 1.6, y);
    if (d < 2.5) {
      const k = (2.5 + ctx.rng() * 2) / Math.max(d, 0.01);
      x *= k;
      y *= k;
    }
    off.set([x, y, ctx.rng(), (0.2 + ctx.rng() * 0.6) * (0.5 + p1 * 0.8)], i * 4);
    const ax = new THREE.Vector3(ctx.rng() - 0.5, ctx.rng() - 0.5, ctx.rng() - 0.5).normalize();
    rot.set([ax.x, ax.y, ax.z, ctx.rng() * 3], i * 4);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  geo.setAttribute('aRot', new THREE.InstancedBufferAttribute(rot, 4));
  const mat = material(
    ctx,
    `${ROTATE}
    attribute vec4 aOff; attribute vec4 aRot;
    void main(){
      float ang = aRot.w * 6.28 + uTime * mix(.15, .8, uP.z) * (.5 + aRot.w * .3);
      float z = fract(aOff.z + uTime * .02) * 50. - 44.;
      vec3 centre = vec3(aOff.xy + vec2(sin(uTime * .2 + aOff.z * 9.), cos(uTime * .17 + aOff.z * 7.)) * .4, z);
      // Cubes shrink away as they pass the camera instead of fading (they are opaque).
      float near = smoothstep(.5, 5., -(modelViewMatrix * vec4(centre, 1.)).z);
      vec3 p = rotAxis(position * aOff.w * near, aRot.xyz, ang) + centre;
      vec3 n = rotAxis(normal, aRot.xyz, ang);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float shade = .55 + .45 * max(dot(n, normalize(vec3(.4, .8, .5))), 0.);
      float pick = fract(aOff.z * 13.);
      vec3 c = pick < .4 ? uC0 : pick < .75 ? uC1 : uC2;
      vColor = c * shade + uC3 * pow(max(dot(n, normalize(vec3(-.5, .3, .8))), 0.), 8.) * .3;
      vAlpha = fogOf(mv) * .95;
    }`,
    { frag: FRAG_SOLID, solid: true }
  );
  ctx.scene.add(new THREE.InstancedMesh(geo, mat, count));
  ctx.uniforms.uFog.value.set(6, 44);
  const base = new THREE.Vector3(0, 0, 6);
  const look = new THREE.Vector3(0, 0, -20);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 1.2),
    dispose: () => {}
  };
}
