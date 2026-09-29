import * as THREE from 'three';

// Shared types + GLSL helpers for the xʸ three.js scene pack (inlined verbatim into export kits).

export interface SharedUniforms {
  uTime: { value: number };
  uRes: { value: THREE.Vector2 };
  uPointer: { value: THREE.Vector2 };
  uBg: { value: THREE.Color };
  uC0: { value: THREE.Color };
  uC1: { value: THREE.Color };
  uC2: { value: THREE.Color };
  uC3: { value: THREE.Color };
  uP: { value: THREE.Vector4 };
  uFog: { value: THREE.Vector2 };
  /** Alpha boost: thin dots/lines need more ink on light grounds. */
  uInk: { value: number };
}

export interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  colors: THREE.Color[];
  bg: THREE.Color;
  params: number[];
  isLight: boolean;
  uniforms: SharedUniforms;
  rng: () => number;
}

export interface SceneInstance {
  update(t: number, dt: number, pointer: THREE.Vector2): void;
  dispose(): void;
}

export type SceneBuilder = (ctx: SceneCtx) => SceneInstance;

export const seeded = (seed: number) => {
  let a = Math.floor(seed * 1e6) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const UNI = `uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer; uniform vec3 uBg, uC0, uC1, uC2, uC3; uniform vec4 uP; uniform vec2 uFog; uniform float uInk;
varying vec3 vColor; varying float vAlpha;
`;

// 3D simplex noise (Ashima / Stefan Gustavson, MIT).
export const NOISE = `vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 prm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=m289(i);vec4 p=prm(prm(prm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
`;

// Vertex prelude: depth fog factor and perspective point size (world units → device pixels).
export const VHEAD = `${UNI}${NOISE}
float fogOf(vec4 mv){ return smoothstep(uFog.y, uFog.x, -mv.z); }
float sizeOf(float s, vec4 mv){ return clamp(s * projectionMatrix[1][1] * 0.5 * uRes.y / max(0.1, -mv.z), 1.0, 48.0); }
vec3 ramp(float h){ h = clamp(h, 0., 1.); return h < .5 ? mix(uC0, uC1, h * 2.) : mix(uC1, uC2, h * 2. - 1.); }
`;

// Fragment prelude: calmer, fainter centre where the button sits.
const FHEAD = `${UNI}
float calm(){ vec2 q = (gl_FragCoord.xy / uRes - .5) * vec2(uRes.x / uRes.y, 1.); return mix(.35, 1., smoothstep(.05, .5, length(q))); }
`;

export const FRAG_POINT = `${FHEAD}
void main(){ float r = length(gl_PointCoord - .5); float a = min(1., smoothstep(.5, .28, r) * vAlpha * calm() * uInk); if (a < .01) discard;
gl_FragColor = vec4(vColor, a);
#include <colorspace_fragment>
}`;

export const FRAG_FLAT = `${FHEAD}
void main(){ float a = min(1., vAlpha * calm() * uInk); if (a < .005) discard; gl_FragColor = vec4(vColor, a);
#include <colorspace_fragment>
}`;

// Opaque surfaces: fog/centre calm blend the colour into the background instead of using alpha.
export const FRAG_SOLID = `${FHEAD}
void main(){ gl_FragColor = vec4(mix(uBg, vColor, clamp(vAlpha * (.4 + .6 * calm()), 0., 1.)), 1.);
#include <colorspace_fragment>
}`;

// Rotate v around a unit axis by angle a (Rodrigues).
export const ROTATE = `vec3 rotAxis(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c); }
`;

// A ShaderMaterial wired to the shared uniforms. Dark palettes glow additively; light ones paint normally.
export const material = (ctx: SceneCtx, vertexShader: string, opts: { frag?: string; uniforms?: Record<string, { value: unknown }>; solid?: boolean } = {}) =>
  new THREE.ShaderMaterial({
    uniforms: { ...ctx.uniforms, ...opts.uniforms },
    vertexShader: VHEAD + vertexShader,
    fragmentShader: opts.frag ?? FRAG_POINT,
    transparent: !opts.solid,
    depthWrite: !!opts.solid,
    blending: opts.solid || ctx.isLight ? THREE.NormalBlending : THREE.AdditiveBlending
  });

// Gentle drift + eased pointer parallax around a base camera pose.
export const drift = (ctx: SceneCtx, base: THREE.Vector3, look: THREE.Vector3, t: number, p: THREE.Vector2, amt = 1) => {
  const c = ctx.camera;
  c.position.set(base.x + Math.sin(t * 0.11) * 0.6 * amt + p.x * 1.4 * amt, base.y + Math.cos(t * 0.083) * 0.35 * amt + p.y * 0.8 * amt, base.z + Math.sin(t * 0.05) * 0.4 * amt);
  c.lookAt(look);
};
