import * as THREE from 'three';
import { FRAG_FLAT, FRAG_SOLID, drift, material, type SceneCtx, type SceneInstance } from '../common';

// lineStack — stacked ridge lines (pulsar-plot style) in perspective; each ridge hides the ones behind it.
// p0 ridge count · p1 peak height · p2 drift speed · p3 peak width
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0] = ctx.params;
  const ridges = Math.round(36 + p0 * 30);
  const seg = 150;
  const W = 30;
  const depth = 34;
  const line: number[] = [];
  const curtain: number[] = [];
  const index: number[] = [];
  for (let r = 0; r < ridges; r++) {
    const z = 6 - (r / ridges) * depth;
    for (let i = 0; i < seg; i++) {
      const x = (i / (seg - 1) - 0.5) * W;
      const x2 = ((i + 1) / (seg - 1) - 0.5) * W;
      if (i < seg - 1) line.push(x, 1, z, x2, 1, z);
      curtain.push(x, 1, z, x, 0, z);
      const b = (r * seg + i) * 2;
      if (i < seg - 1) index.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  // position.y: 1 = on the ridge, 0 = curtain bottom.
  const height = `float ridge(vec3 p){
      float env = exp(-pow(p.x * mix(.22, .1, uP.w), 2.)) * .85 + .15;
      float n = snoise(vec3(p.x * .3, p.z * .35 - uTime * mix(.15, .5, uP.z), uTime * .08)) * .5 + .5;
      float n2 = snoise(vec3(p.x * 1.1, p.z * .9, uTime * .2)) * .15;
      return env * (n * n + n2 * env) * mix(1.5, 4., uP.y);
    }`;
  const vtx = (ink: string) => `${height}
    void main(){
      vec3 p = position;
      float h = ridge(p);
      p.y = p.y > .5 ? h - 1.5 : -3.;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      ${ink}
    }`;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(line, 3));
  const lineMat = material(ctx, vtx('vColor = ramp(h * .35); vAlpha = fogOf(mv);'), { frag: FRAG_FLAT });
  const curtGeo = new THREE.BufferGeometry();
  curtGeo.setAttribute('position', new THREE.Float32BufferAttribute(curtain, 3));
  curtGeo.setIndex(index);
  const curtMat = material(ctx, vtx('vColor = uBg; vAlpha = 0.;'), { frag: FRAG_SOLID, solid: true });
  curtMat.polygonOffset = true;
  curtMat.polygonOffsetFactor = 1;
  curtMat.polygonOffsetUnits = 1;
  curtMat.side = THREE.DoubleSide;
  ctx.scene.add(new THREE.Mesh(curtGeo, curtMat), new THREE.LineSegments(lineGeo, lineMat));
  ctx.uniforms.uFog.value.set(8, 38);
  const base = new THREE.Vector3(0, 5.5, 13);
  const look = new THREE.Vector3(0, -1, -6);
  return {
    update: (t, _dt, p) => drift(ctx, base, look, t, p, 0.8),
    dispose: () => {}
  };
}
