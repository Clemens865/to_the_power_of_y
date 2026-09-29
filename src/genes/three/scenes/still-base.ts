import * as THREE from 'three';
import { FHEAD, FRAG_FLAT, FRAG_SOLID, material, type SceneCtx } from '../common';

// Still-life building blocks: a part is one object of the composition with its own animation.
export interface Part {
  obj: THREE.Object3D;
  update(t: number): void;
}
/** GLSL colour expressions for a part: main wire colour and a contrasting accent. */
export interface Ink {
  line: string;
  accent: string;
}

// Wire lines in a palette colour, fading with depth.
export const lineMat = (ctx: SceneCtx, color: string, alpha = 1) =>
  material(ctx, `void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vColor = ${color}; vAlpha = fogOf(mv) * ${alpha.toFixed(3)}; }`, { frag: FRAG_FLAT });

// Opaque faceted surface: soft key light + rim, pushed back so its own edges draw cleanly on top.
export const shadeMat = (ctx: SceneCtx, color: string) => {
  const m = material(
    ctx,
    `void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mv;
      vec3 n = normalize(normalMatrix * normal);
      float l = .5 + .5 * max(dot(n, normalize(vec3(.5, .8, .6))), 0.);
      float rim = pow(1. - abs(dot(n, normalize(-mv.xyz))), 3.);
      vColor = ${color} * l + mix(uC3, uBg, .3) * rim * .35;
      vAlpha = fogOf(mv);
    }`,
    { frag: FRAG_SOLID, solid: true }
  );
  m.polygonOffset = true;
  m.polygonOffsetFactor = 1;
  m.polygonOffsetUnits = 1;
  return m;
};

export const lines = (ctx: SceneCtx, geo: THREE.BufferGeometry, color: string, alpha = 1) => new THREE.LineSegments(geo, lineMat(ctx, color, alpha));

// Evenly spread unit vectors (Fibonacci sphere).
export const fib = (n: number): THREE.Vector3[] =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });

// Radial spikes from radius r0 to r1 (tips breathe in the shader via aTip).
export const spikes = (ctx: SceneCtx, dirs: THREE.Vector3[], r0: number, r1: number, color: string, alpha = 1) => {
  const pos: number[] = [];
  const tip: number[] = [];
  const seed: number[] = [];
  dirs.forEach((d, i) => {
    const s = (i * 0.618) % 1;
    pos.push(d.x * r0, d.y * r0, d.z * r0, d.x, d.y, d.z);
    tip.push(0, 1);
    seed.push(s, s);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const mat = material(
    ctx,
    `attribute float aTip; attribute float aSeed;
    void main(){
      float len = ${r1.toFixed(3)} * (.75 + .25 * sin(uTime * .9 + aSeed * 40.)) * mix(.8, 1.25, uP.w);
      vec3 p = aTip > .5 ? position * len : position;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vColor = ${color};
      vAlpha = fogOf(mv) * ${alpha.toFixed(3)} * (aTip > .5 ? .35 : 1.);
    }`,
    { frag: FRAG_FLAT }
  );
  return new THREE.LineSegments(geo, mat);
};

// Screen-space backdrop (soft radial light behind everything) and a vignette over everything.
export const backdrop = (ctx: SceneCtx) => {
  const quad = (frag: string, order: number, opaque = false) => {
    const m = material(ctx, 'void main(){ vColor = uBg; vAlpha = 1.; gl_Position = vec4(position.xy, .999, 1.); }', { frag, normal: true });
    m.depthTest = false;
    m.depthWrite = false;
    // The backdrop is opaque so it sorts (by renderOrder) before every other opaque body.
    m.transparent = !opaque;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    mesh.renderOrder = order;
    ctx.scene.add(mesh);
  };
  const R = 'vec2 q = (gl_FragCoord.xy / uRes - vec2(.5, .55)) * vec2(uRes.x / uRes.y, 1.); float r = length(q);';
  const light = ctx.isLight ? 'uBg + (vec3(1.) - uBg) * .45' : 'uBg * 1.5 + mix(uC0, uC3, .5) * .02';
  quad(`${FHEAD} void main(){ ${R} float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.; gl_FragColor = vec4(mix(uBg, ${light}, 1. - smoothstep(.0, .9, r)), 1.); \n#include <colorspace_fragment>\n gl_FragColor.rgb += dither * 1.5;\n}`, -10, true);
  const edge = ctx.isLight ? 'uBg * .82' : 'uBg * .35';
  quad(`${FHEAD} void main(){ ${R} gl_FragColor = vec4(${edge}, smoothstep(.45, 1.15, r) * .6); \n#include <colorspace_fragment>\n}`, 100);
};
