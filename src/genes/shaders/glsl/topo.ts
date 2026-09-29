// Flowing topographic contour lines. p0 = terrain scale, p1 = line density, p2 = line weight, p3 = fill amount.
export default /* glsl */ `
float height(vec2 q, float t) {
  return fbm(q + 0.4 * vec2(vnoise(q * 0.7 + t), vnoise(q * 0.7 - t)));
}
void main() {
  vec2 p = centred();
  float t = u_time * 0.04;
  float sc = 1.2 + u_p0 * 2.0;
  vec2 q = p * sc + vec2(t, -t * 0.6);
  float h = height(q, t);
  h += 0.25 * exp(-6.0 * dot(p - pointer(), p - pointer()));
  float n = 10.0 + u_p1 * 20.0;
  float f = fract(h * n);
  float d = min(f, 1.0 - f) / n;
  // Approximate one pixel in height units using the local gradient.
  float e = 0.02;
  float h0 = h - 0.25 * exp(-6.0 * dot(p - pointer(), p - pointer()));
  vec2 grad = vec2(height(q + vec2(e, 0.0), t) - h0, height(q + vec2(0.0, e), t) - h0) / e;
  float g = length(grad) * sc / u_res.y + 1e-4;
  float line = 1.0 - smoothstep(0.0, g * (0.8 + u_p2 * 2.5), d);
  float major = step(0.8, fract(floor(h * n) / 5.0 + 0.01));
  vec3 fill = mix(u_c0, ramp(0.2 + h * 0.8), 0.18 + u_p3 * 0.35);
  vec3 ink = mix(u_c1, u_c2, h);
  vec3 col = mix(fill, ink, line * (0.55 + 0.45 * major));
  col = mix(u_c0, col, 0.3 + 0.7 * edge(p));
  gl_FragColor = finish(col);
}
`;
