import * as THREE from 'three';
import { FHEAD, NOISE, material, type SceneCtx } from '../common';
import { lines, shadeMat, type Ink, type Part } from './still-base';

// Glass orb: a rim-lit translucent shell with a slow "lava" of noise glowing inside (no transmission pass).
export const glassOrb = (ctx: SceneCtx, ink: Ink): Part => {
  const frag = `${FHEAD}${NOISE}
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    float ndv = max(dot(n, v), 0.);
    float fres = pow(1. - ndv, 2.2);
    vec3 q = vP * .9 + refract(-v, n, .7) * .45;
    // Lava-lamp blobs: soft-edged noise islands drifting upward, strongest in the middle of the orb.
    float n1 = snoise(q * 1.25 + vec3(0., -uTime * .28, uTime * .04));
    float n2 = snoise(q * 2.6 + vec3(uTime * .08, -uTime * .18, 0.));
    float lava = smoothstep(-.05, .6, n1 * .8 + n2 * .2 + (ndv - .5) * .9);
    float core = smoothstep(0., 1., ndv);
    float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-.4, .7, .6))), 0.), 36.);
    vec3 tint = ${ink.line};
    vec3 glow = mix(${ink.accent}, mix(${ink.accent}, vec3(1.), .45), smoothstep(.2, .9, n2 * .5 + lava * .6));
    vec3 col = mix(tint * .35, glow, lava) * (.55 + .45 * core) + ${ink.accent} * pow(core, 4.) * .25;
    col = mix(col, tint * 1.1, fres * .65) + vec3(1.) * spec * .8;
    float a = clamp(.16 + fres * .7 + lava * core * .8 + spec, 0., 1.) * calm() * uInk;
    gl_FragColor = vec4(col, min(a, 1.));
    #include <colorspace_fragment>
  }`;
  const mat = material(
    ctx,
    `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; vColor = vec3(0.); vAlpha = 1.; }`,
    { frag, normal: true }
  );
  const obj = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
  obj.add(orb);
  return {
    obj,
    update: t => {
      const b = 1 + Math.sin(t * 0.6) * 0.015;
      orb.scale.set(b, 1 / b, b);
    }
  };
};

// Faceted crystal: flat-shaded polyhedron with bright edges inside a faint turning wire cage.
export const crystal = (ctx: SceneCtx, ink: Ink, rng: () => number): Part => {
  const shape = rng() < 0.5 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.DodecahedronGeometry(1, 0);
  shape.scale(1, 1.25, 1);
  const obj = new THREE.Group();
  obj.add(new THREE.Mesh(shape, shadeMat(ctx, ink.line)));
  obj.add(lines(ctx, new THREE.EdgesGeometry(shape), ink.accent, 0.9));
  const inner = lines(ctx, new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.45, 0)), ink.line, 0.35);
  obj.add(inner);
  return {
    obj,
    update: t => {
      obj.rotation.set(Math.sin(t * 0.13) * 0.25, t * 0.12, 0.1);
      inner.rotation.set(t * 0.05, -t * 0.18, 0);
    }
  };
};
