// Truchet quarter-arc tiles on a slowly rotating grid with light flowing along the arcs.
// p0 = tile density, p1 = stroke width, p2 = rotation speed/direction, p3 = flow speed.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time;
  vec2 q = rot(t * 0.03 * (u_p2 - 0.5) * 2.0) * p;
  q += (pointer() - p) * 0.08;
  float n = 5.0 + u_p0 * 9.0;
  q *= n;
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  float r = hash21(id);
  if (r < 0.5) f.x = -f.x;
  // Distance to the two quarter arcs centred on opposite corners.
  vec2 a = f - vec2(0.5);
  vec2 b = f + vec2(0.5);
  float da = abs(length(a) - 0.5);
  float db = abs(length(b) - 0.5);
  float d = min(da, db);
  vec2 c = da < db ? a : b;
  float ang = atan(c.y, c.x);
  float w = 0.05 + u_p1 * 0.14;
  float aa = n * 1.5 / u_res.y;
  float stroke = 1.0 - smoothstep(w - aa, w + aa, d);
  float dir = mod(id.x + id.y, 2.0) * 2.0 - 1.0;
  float flow = 0.5 + 0.5 * sin(ang * 4.0 * dir + t * (0.6 + u_p3 * 1.4) + r * 6.2831);
  vec3 ink = accents(hash21(id + 7.0) * 0.5 + flow * 0.25 + t * 0.01);
  float glow = exp(-d * 10.0) * 0.18;
  vec3 col = mix(u_c0, ink, glow);
  col = mix(col, ink, stroke * (0.55 + 0.45 * flow));
  col = mix(u_c0, col, 0.25 + 0.75 * edge(p));
  gl_FragColor = finish(col);
}
`;
