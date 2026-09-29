// Voronoi stained glass with slowly drifting cells, dark leading and light pooling inside each pane.
// p0 = cell density, p1 = lead width, p2 = drift amount, p3 = pane colour variety.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.12;
  float n = 3.0 + u_p0 * 6.0;
  vec2 g = p * n;
  vec2 ip = floor(g);
  vec2 fp = fract(g);
  float d1 = 8.0;
  float d2 = 8.0;
  vec2 best = vec2(0.0);
  vec2 bestOff = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 h = hash22(ip + o);
      vec2 site = o + 0.5 + (0.15 + 0.25 * u_p2) * sin(t + 6.2831853 * h);
      vec2 r = site - fp;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        best = ip + o;
        bestOff = r;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  // Distance to the cell border (cheap F2 - F1 approximation).
  float border = sqrt(d2) - sqrt(d1);
  float lw = 0.04 + u_p1 * 0.1;
  float aa = n * 1.5 / u_res.y;
  float lead = 1.0 - smoothstep(lw - aa, lw + aa, border);
  float k = hash21(best);
  vec3 pane = accents(k * (0.4 + u_p3 * 0.6) + 0.1 * t);
  float pool = 1.0 - smoothstep(0.0, 0.7, length(bestOff));
  float light = 0.55 + 0.45 * vnoise(best * 1.7 + t * 0.3);
  vec3 col = mix(u_c0, pane, (0.45 + 0.45 * pool) * light);
  col = mix(u_c0, col, 0.35 + 0.65 * edge(p));
  vec3 leadCol = mix(u_c0, vec3(0.0), 0.35);
  col = mix(col, leadCol, lead);
  gl_FragColor = finish(col);
}
`;
