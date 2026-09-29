// Halftone dot wave: a rotated dot screen whose dot radius follows a travelling wave plus noise.
// p0 = screen frequency, p1 = screen angle, p2 = wave length, p3 = second-ink offset (misregistration).
export default /* glsl */ `
float screen(vec2 p, float freq, float ang, float level) {
  vec2 q = rot(ang) * p * freq;
  vec2 f = fract(q) - 0.5;
  float r = sqrt(clamp(level, 0.0, 1.0)) * 0.62;
  float aa = freq * 1.5 / u_res.y;
  return 1.0 - smoothstep(r - aa, r + aa, length(f));
}
float tone(vec2 p, float t) {
  float w = sin(dot(p, vec2(0.8, 0.6)) * (3.0 + u_p2 * 8.0) - t) * 0.5 + 0.5;
  float n = fbm(p * 1.8 + t * 0.1);
  float d = length(p - pointer());
  return (0.6 * w + 0.5 * n - 0.15) * (0.25 + 0.75 * edge(p)) + 0.35 * exp(-d * d * 30.0);
}
void main() {
  vec2 p = centred();
  float t = u_time * 0.5;
  float freq = 35.0 + u_p0 * 45.0;
  float ang = u_p1 * 1.5708;
  vec2 off = vec2(0.004 + u_p3 * 0.012, 0.0);
  float k1 = screen(p, freq, ang, tone(p, t));
  float k2 = screen(p + off, freq, ang + 0.2618, tone(p + off, t + 0.6) * 0.8);
  vec3 col = u_c0;
  col = mix(col, u_c2, k2 * 0.75);
  col = mix(col, u_c1, k1 * 0.9);
  col = mix(col, u_c3, k1 * k2 * 0.5);
  gl_FragColor = finish(col);
}
`;
