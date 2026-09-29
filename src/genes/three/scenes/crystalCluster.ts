import * as THREE from 'three';
import { FRAG_FLAT, drift, material, type SceneCtx, type SceneInstance } from '../common';

// crystalCluster — wireframe icosahedra of many sizes floating around an open centre, each turning on its own axis.
// p0 crystal count · p1 size range · p2 spin speed · p3 facet detail
export default function build(ctx: SceneCtx): SceneInstance {
  const [p0, p1, p2, p3] = ctx.params;
  const count = Math.round(16 + p0 * 22);
  const geos = [0, 1].map(d => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, d), 1));
  const vtx = (c: string) => `void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mv;
      float rim = .55 + .45 * normalize(position).y;
      vColor = ${c};
      vAlpha = fogOf(mv) * (.45 + .45 * rim);
    }`;
  const mats = ['uC0', 'uC1', 'uC2'].map(c => material(ctx, vtx(c), { frag: FRAG_FLAT }));
  const items: { o: THREE.LineSegments; axis: THREE.Vector3; sp: number; bob: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const o = new THREE.LineSegments(geos[ctx.rng() < p3 ? 1 : 0], mats[i % 3]);
    const ang = ctx.rng() * Math.PI * 2;
    const rad = 3.5 + Math.pow(ctx.rng(), 0.7) * 9;
    o.position.set(Math.cos(ang) * rad * 1.3, Math.sin(ang) * rad * 0.65, -ctx.rng() * 16 + 2);
    o.scale.setScalar(0.35 + Math.pow(ctx.rng(), 2) * (1 + p1 * 2.2));
    o.rotation.set(ctx.rng() * 6, ctx.rng() * 6, ctx.rng() * 6);
    const axis = new THREE.Vector3(ctx.rng() - 0.5, ctx.rng() - 0.5, ctx.rng() - 0.5).normalize();
    items.push({ o, axis, sp: (0.1 + ctx.rng() * 0.3) * (0.5 + p2), bob: ctx.rng() * 6, y: o.position.y });
    ctx.scene.add(o);
  }
  ctx.uniforms.uFog.value.set(8, 30);
  const base = new THREE.Vector3(0, 0.5, 12);
  const look = new THREE.Vector3(0, 0, -4);
  const q = new THREE.Quaternion();
  return {
    update: (t, dt, p) => {
      for (const it of items) {
        it.o.quaternion.multiply(q.setFromAxisAngle(it.axis, it.sp * dt));
        it.o.position.y = it.y + Math.sin(t * 0.3 + it.bob) * 0.35;
      }
      drift(ctx, base, look, t, p, 1.3);
    },
    dispose: () => geos.forEach(g => g.dispose())
  };
}
