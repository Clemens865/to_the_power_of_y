import * as THREE from 'three';
import { drift, material, type SceneCtx, type SceneInstance } from '../common';

// ringTunnel — concentric dotted rings flowing toward the camera through a gently bending tunnel.
// p0 ring count · p1 twist · p2 wobble · p3 dots per ring
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, , , p3] = ctx.params;
  const rings = Math.round(28 + p0 * 22);
  const per = Math.round(120 + p3 * 120);
  const n = rings * per;
  const pos = new Float32Array(n * 3);
  const ring = new Float32Array(n);
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < per; i++) {
      const k = r * per + i;
      const a = (i / per) * Math.PI * 2;
      pos[k * 3] = Math.cos(a);
      pos[k * 3 + 1] = Math.sin(a);
      ring[k] = r / rings;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRing', new THREE.BufferAttribute(ring, 1));
  const L = 48;
  const mat = material(
    ctx,
    `attribute float aRing;
    void main(){
      float z = fract(aRing + uTime * .035) * ${L.toFixed(1)} - ${L.toFixed(1)} + 4.;
      float ang = atan(position.y, position.x) + z * mix(0., .06, uP.y) + uTime * .1;
      float rad = 3.2 + snoise(vec3(cos(ang) * 1.3, sin(ang) * 1.3, z * .08 + uTime * .2)) * mix(.1, .9, uP.z);
      vec3 p = vec3(cos(ang) * rad, sin(ang) * rad, z);
      p.x += sin(z * .09 + uTime * .3) * 1.6;
      p.y += cos(z * .07 + uTime * .23) * 1.1;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float band = fract(aRing * 3.);
      vColor = band < .33 ? uC0 : band < .66 ? uC1 : uC2;
      float nearFade = smoothstep(.5, 3.5, -mv.z);
      vAlpha = fogOf(mv) * nearFade * .9;
      gl_PointSize = sizeOf(.07, mv);
    }`
  );
  ctx.scene.add(new THREE.Points(geo, mat));
  ctx.uniforms.uFog.value.set(6, 44);
  const base = new THREE.Vector3(0, 0, 4.5);
  const look = new THREE.Vector3(0, 0, -20);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 0.8),
    dispose: () => {}
  };
}
