// Starfield warp tunnel: stars on concentric depth layers streak outwards from a vanishing point.
// The centre (vanishing point) stays dark/calm. p0 = star density, p1 = streak length,
// p2 = tunnel twist, p3 = vanishing-point offset towards the pointer.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  vec2 vp = pointer() * (0.1 + 0.3 * u_p3);
  vec2 d = p - vp;
  float r = length(d);
  float a = atan(d.y, d.x);
  float t = u_time * 0.35;
  vec3 col = u_c0;
  float spokes = 60.0 + u_p0 * 80.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ang = a + (u_p2 - 0.5) * 0.6 / (r + 0.2) + fi * 1.7;
    float cell = floor(ang / 6.2831853 * spokes);
    float rnd = hash21(vec2(cell, fi * 13.0));
    // Depth coordinate: 1/r grows towards the centre, scrolling makes stars fly outwards.
    float z = 0.25 / (r + 0.02) + t * (0.6 + 0.4 * rnd) + rnd * 10.0;
    float fz = fract(z * 0.5);
    float angCentre = (cell + 0.5) / spokes * 6.2831853;
    float angDist = abs(mod(ang - angCentre + 3.14159, 6.2831853) - 3.14159) * r * spokes;
    float len = 0.04 + u_p1 * 0.25;
    float streak = (1.0 - smoothstep(0.0, len, fz)) * (1.0 - smoothstep(0.0, 0.6, angDist));
    float bright = streak * step(0.55, rnd) * smoothstep(0.03, 0.35, r);
    col = mix(col, accents(rnd + fi * 0.2), clamp(bright, 0.0, 1.0) * 0.9);
  }
  col = mix(col, u_c1, 0.1 * smoothstep(0.2, 0.9, r));
  gl_FragColor = finish(col);
}
`;
