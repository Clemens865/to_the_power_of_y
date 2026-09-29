// Moiré of three slowly counter-rotating soft line gratings. p0 = line frequency,
// p1 = rotation offset, p2 = radial vs linear gratings, p3 = interference contrast.
export default /* glsl */ `
float grating(vec2 p, float ang, float freq) {
  vec2 q = rot(ang) * p;
  float lin = q.x;
  float rad = length(q - vec2(0.25, 0.0));
  float v = mix(lin, rad, step(0.5, u_p2) * 0.85);
  // Soft sine lines: anti-aliased by construction, no hard edges to shimmer.
  return 0.5 + 0.5 * cos(v * freq * 6.2831853);
}
void main() {
  vec2 p = centred();
  float t = u_time * 0.02;
  float freq = 18.0 + u_p0 * 30.0;
  vec2 m = pointer() * 0.15;
  float g1 = grating(p - m, t + u_p1, freq);
  float g2 = grating(p + m, -t * 1.3 + u_p1 + 0.08, freq * 1.03);
  float g3 = grating(p, t * 0.7 + 1.9, freq * 0.97);
  float beat = g1 * g2;
  float fine = pow(beat, 1.0 + u_p3 * 3.0);
  vec3 col = mix(u_c0, u_c1, fine * 0.8);
  col = mix(col, u_c2, g3 * beat * 0.35);
  col = mix(col, u_c3, smoothstep(0.7, 1.0, g1 * g2 * g3) * 0.5);
  col = mix(u_c0, col, 0.25 + 0.75 * edge(p));
  gl_FragColor = finish(col);
}
`;
