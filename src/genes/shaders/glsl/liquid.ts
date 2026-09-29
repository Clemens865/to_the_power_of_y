// Liquid gradient bands: a sum of drifting sines bends the plane, then maps to soft palette bands.
// p0 = band count, p1 = distortion, p2 = band softness, p3 = flow direction.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.15;
  vec2 q = rot(u_p3 * 6.2831853) * p * 2.0;
  float amp = 0.2 + u_p1 * 0.5;
  for (int i = 1; i < 5; i++) {
    float fi = float(i);
    q.x += amp / fi * sin(fi * 1.7 * q.y + t * (0.7 + 0.2 * fi) + fi);
    q.y += amp / fi * cos(fi * 1.3 * q.x - t * (0.5 + 0.15 * fi));
  }
  vec2 m = pointer();
  q += 0.25 * (p - m) * exp(-5.0 * length(p - m));
  float bands = 2.0 + u_p0 * 5.0;
  float v = q.x * 0.35 + q.y * 0.15;
  float x = v * bands * 0.75;
  float idx = floor(x);
  float soft = 0.05 + u_p2 * 0.45;
  vec3 a = accents(idx / 3.0);
  vec3 b = accents((idx + 1.0) / 3.0);
  vec3 col = mix(a, b, smoothstep(0.5 - soft, 0.5 + soft, fract(x)));
  float shade = 0.5 + 0.5 * sin(v * 6.0 + t);
  col = mix(col, u_c0, 0.25 * shade);
  col = mix(u_c0, col, 0.45 + 0.55 * edge(p));
  gl_FragColor = finish(col);
}
`;
