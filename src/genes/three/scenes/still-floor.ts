import * as THREE from 'three';
import { FRAG_FLAT, FRAG_POINT, material, type SceneCtx } from '../common';

// Still-life floors: a gently waving plane below the composition that fades into the distance.
export type FloorKind = 'grid' | 'dots' | 'rings' | 'horizon';

const WAVE = `float wave(vec3 p){
  return (sin(p.x * .32 + uTime * .45) * .35 + sin(p.z * .27 - uTime * .35) * .35 + snoise(vec3(p.xz * .08, uTime * .07))) * mix(.12, .75, uP.z);
}`;

export const floor = (ctx: SceneCtx, kind: FloorKind, cx: number): THREE.Object3D => {
  const pos: number[] = [];
  const W = 64;
  const z0 = 10;
  const z1 = -46;
  if (kind === 'grid' || kind === 'horizon' || kind === 'dots') {
    const step = kind === 'dots' ? 0.9 : kind === 'horizon' ? 0.9 : 1.6;
    const nx = Math.round(W / step);
    const nz = Math.round((z0 - z1) / step);
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = -W / 2 + i * step;
        const z = z0 - j * step;
        if (kind === 'dots') pos.push(x, 0, z);
        else {
          // Horizontal lines are split into short segments so the wave can bend them.
          if (i < nx) pos.push(x, 0, z, x + step, 0, z);
          if (kind === 'grid' && j < nz) pos.push(x, 0, z, x, 0, z - step);
        }
      }
  } else {
    for (let r = 1; r <= 30; r++) {
      const rad = r * 1.25;
      const seg = Math.round(24 + rad * 5);
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;
        pos.push(cx + Math.cos(a0) * rad, 0, Math.sin(a0) * rad, cx + Math.cos(a1) * rad, 0, Math.sin(a1) * rad);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const vtx = `${WAVE}
    void main(){
      vec3 p = position;
      p.y += wave(p);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = mix(uC0, uC1, smoothstep(-.6, .8, p.y));
      vAlpha = fogOf(mv) * smoothstep(1., 5., -mv.z) * ${kind === 'dots' ? '.8' : '.55'};
      gl_PointSize = sizeOf(.07, mv);
    }`;
  const obj = kind === 'dots' ? new THREE.Points(geo, material(ctx, vtx, { frag: FRAG_POINT })) : new THREE.LineSegments(geo, material(ctx, vtx, { frag: FRAG_FLAT }));
  obj.position.y = -2.9;
  return obj;
};
