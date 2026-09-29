// Dot-matrix LED panel: round diodes whose brightness follows ripples from the pointer and a slow
// noise field, quantised into a few levels. p0 = pitch, p1 = quantisation steps, p2 = ripple spacing, p3 = diode size.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float pitch = 40.0 + u_p0 * 60.0;
  vec2 g = p * pitch;
  vec2 id = floor(g) + 0.5;
  vec2 c = id / pitch;
  vec2 f = fract(g) - 0.5;
  float t = u_time;
  float dp = length(c - pointer());
  float ripple = 0.5 + 0.5 * cos(dp * (18.0 + u_p2 * 30.0) - t * 1.4);
  ripple *= exp(-dp * 1.6);
  float field = fbm(c * 2.5 + vec2(t * 0.06, -t * 0.04));
  float level = clamp(field * 1.2 - 0.3 + ripple * 0.7, 0.0, 1.0);
  level *= 0.25 + 0.75 * edge(c);
  float steps = 3.0 + floor(u_p1 * 5.0);
  level = floor(level * steps + 0.5) / steps;
  float size = 0.28 + u_p3 * 0.16;
  float aa = pitch * 1.5 / u_res.y;
  float diode = 1.0 - smoothstep(size - aa, size + aa, length(f));
  vec3 lit = mix(u_c1, u_c2, smoothstep(0.3, 1.0, level));
  lit = mix(lit, u_c3, smoothstep(0.85, 1.0, level) * 0.6);
  vec3 off = mix(u_c0, u_c1, 0.08);
  vec3 col = mix(u_c0, mix(off, lit, level), diode);
  gl_FragColor = finish(col);
}
`;
