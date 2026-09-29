// Kaleidoscope: polar mirror folding of drifting noise. p0 = number of segments, p1 = zoom,
// p2 = twist, p3 = contrast of the colour bands.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.06;
  float seg = floor(4.0 + u_p0 * 8.0);
  float r = length(p);
  float a = atan(p.y, p.x) + r * (u_p2 - 0.5) * 3.0 + t * 0.5;
  float k = 6.2831853 / seg;
  a = mod(a, k);
  a = abs(a - 0.5 * k);
  vec2 q = vec2(cos(a), sin(a)) * r * (1.5 + u_p1 * 3.0);
  q += pointer() * 0.6;
  float n = fbm(q + vec2(t, -t * 0.7));
  float n2 = vnoise(q * 3.0 - t * 2.0);
  float bands = 0.5 + 0.5 * sin((n * 5.0 + r * 3.0 - t * 2.0) * (1.0 + u_p3 * 2.0));
  vec3 col = mix(u_c0, accents(n + r * 0.5), 0.25 + 0.6 * bands);
  col = mix(col, u_c3, smoothstep(0.65, 0.95, n2) * 0.35);
  float ring = smoothstep(-0.01, 0.025, abs(fract(r * 4.0 - t) - 0.5) - 0.47);
  col = mix(col, u_c2, ring * 0.25);
  col = mix(u_c0, col, 0.2 + 0.8 * edge(p));
  gl_FragColor = finish(col);
}
`;
