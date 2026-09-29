// Hex grid whose cells pulse with slow waves radiating from the pointer and the edges.
// p0 = cell size, p1 = wave spacing, p2 = gap width, p3 = colour spread.
export default /* glsl */ `
// Returns (local offset from hex centre, hex centre).
vec4 hexCell(vec2 p) {
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - s * 0.5;
  vec2 b = mod(p - s * 0.5, s) - s * 0.5;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  return vec4(g, p - g);
}
float hexDist(vec2 g) {
  g = abs(g);
  return max(dot(g, vec2(0.5, 0.8660254)), g.x);
}
void main() {
  vec2 p = centred();
  float n = 10.0 + u_p0 * 16.0;
  vec4 h = hexCell(p * n);
  vec2 c = h.zw / n;
  float d = hexDist(h.xy);
  float t = u_time;
  float fromPtr = length(c - pointer());
  float wave = 0.5 + 0.5 * sin(fromPtr * (10.0 + u_p1 * 20.0) - t * 1.2);
  float drift = vnoise(c * 3.0 + t * 0.1);
  float e = edge(c);
  float energy = wave * (0.35 + 0.65 * e) * (0.5 + 0.5 * drift);
  float gap = 0.5 - 0.03 - u_p2 * 0.08;
  float aa = n * 1.5 / u_res.y;
  float cell = 1.0 - smoothstep(gap - aa, gap + aa, d);
  vec3 tint = accents(drift * (0.3 + u_p3) + fromPtr * 0.3);
  vec3 col = mix(u_c0, tint, cell * (0.12 + 0.75 * energy));
  float rim = smoothstep(gap - 0.08, gap, d) * cell;
  col = mix(col, u_c3, rim * energy * 0.4);
  gl_FragColor = finish(col);
}
`;
