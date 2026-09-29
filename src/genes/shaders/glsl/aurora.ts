// Aurora curtains: three noise-bent ribbons with vertical ray streaks, fading upward.
// p0 = curtain height, p1 = waviness, p2 = ray fineness, p3 = vertical position.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.08;
  vec3 col = u_c0;
  float base = -0.05 + (u_p3 - 0.5) * 0.3;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x = p.x * (1.0 + 0.4 * fi) + fi * 3.1;
    float bend = (fbm(vec2(x * (0.6 + u_p1), t + fi * 5.0)) - 0.5) * (0.3 + 0.4 * u_p1);
    float y = p.y - base - bend - fi * 0.09 + (pointer().y) * 0.05;
    float height = 0.15 + u_p0 * 0.3;
    // Sharp lower edge, long soft fade upwards.
    float curtain = smoothstep(-0.02, 0.01, y) * exp(-max(y, 0.0) / height);
    float rays = vnoise(vec2(x * (20.0 + u_p2 * 40.0), t * 3.0 + fi));
    rays = 0.4 + 0.6 * rays * rays;
    float a = curtain * rays * (0.75 - 0.15 * fi);
    vec3 c = fi < 0.5 ? u_c1 : (fi < 1.5 ? u_c2 : u_c3);
    c = mix(c, u_c3, smoothstep(0.0, height, y) * 0.5);
    col = mix(col, c, clamp(a, 0.0, 1.0));
  }
  // Keep the button area calmer.
  col = mix(u_c0, col, 0.45 + 0.55 * edge(p));
  float stars = step(0.997, hash21(floor(gl_FragCoord.xy))) * 0.35 * smoothstep(0.0, 0.4, p.y);
  col = mix(col, u_c3, stars);
  gl_FragColor = finish(col);
}
`;
