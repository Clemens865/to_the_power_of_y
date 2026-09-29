// Shared GLSL (ES 1.00, so it runs on WebGL1 and WebGL2) for every shader in the pack.
// Uniforms: u_time (already scaled by speed), u_res (px), u_mouse (0..1, eased, y up),
// u_c0 = base/background colour, u_c1..u_c3 = accents, u_p0..u_p3 = per-shader parameters in 0..1.

export const VERTEX = /* glsl */ `attribute vec2 position;
attribute vec2 uv;
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const PRELUDE = /* glsl */ `precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform float u_p0;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
varying vec2 v_uv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n * 17.0 + 3.1));
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// 4 octaves, rotated between octaves to hide the grid.
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return s / 0.9375;
}
mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
float aspect() { return u_res.x / max(u_res.y, 1.0); }
// Centred coordinates, y in [-0.5, 0.5].
vec2 centred() { return (v_uv - 0.5) * vec2(aspect(), 1.0); }
vec2 pointer() { return (u_mouse - 0.5) * vec2(aspect(), 1.0); }
// 0 at the centre, 1 towards the edges: used to keep the area behind the button calm.
float edge(vec2 p) { return smoothstep(0.06, 0.6, length(p * vec2(0.8, 1.0))); }
// Smooth 4-stop gradient through the palette (t in 0..1).
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c = mix(u_c0, u_c1, smoothstep(0.0, 1.0, t));
  c = mix(c, u_c2, smoothstep(1.0, 2.0, t));
  return mix(c, u_c3, smoothstep(2.0, 3.0, t));
}
// Cyclic gradient over the three accents.
vec3 accents(float t) {
  t = fract(t) * 3.0;
  vec3 c = mix(u_c1, u_c2, smoothstep(0.0, 1.0, t));
  c = mix(c, u_c3, smoothstep(1.0, 2.0, t));
  return mix(c, u_c1, smoothstep(2.0, 3.0, t));
}
vec4 finish(vec3 col) {
  col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  return vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
