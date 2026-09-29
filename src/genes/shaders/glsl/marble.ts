// Domain-warped fbm marble. p0 = scale, p1 = warp strength, p2 = vein sharpness, p3 = colour drift.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  vec2 m = pointer();
  float t = u_time * 0.05;
  vec2 q = p * (1.5 + u_p0 * 2.5);
  q += (m - p) * 0.15 * exp(-4.0 * length(p - m));
  vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - t));
  float h = fbm(q + (1.0 + u_p1 * 3.0) * w + t * 0.5);
  float veins = abs(sin((h + w.x * 0.5) * (6.0 + u_p2 * 10.0)));
  veins = pow(1.0 - veins, 2.0 + u_p2 * 6.0);
  vec3 col = mix(u_c0, accents(h * 0.8 + u_p3 + t * 0.2), 0.35 + 0.45 * h);
  col = mix(col, u_c3, veins * 0.6);
  col = mix(u_c0, col, 0.35 + 0.65 * edge(p));
  gl_FragColor = finish(col);
}
`;
