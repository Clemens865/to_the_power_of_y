// Soft metaballs: a 2D implicit field with analytic gradient used as a normal for cheap
// pseudo-3D shading (no raymarching). p0 = ball size, p1 = orbit spread, p2 = gloss, p3 = colour mix.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.25;
  float field = 0.0;
  vec2 grad = vec2(0.0);
  float hueAcc = 0.0;
  float rad = 0.05 + u_p0 * 0.06;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ph = fi * 2.399 + u_p3 * 6.0;
    // Balls orbit the edges of an ellipse so the centre stays mostly clear.
    float orbit = 0.32 + 0.16 * u_p1 + 0.08 * sin(t * 0.7 + fi);
    vec2 c = vec2(cos(t * (0.3 + 0.07 * fi) + ph) * aspect() * 0.9, sin(t * (0.25 + 0.05 * fi) + ph * 1.3)) * orbit;
    if (i == 6) c = mix(c, pointer(), 0.7);
    vec2 d = p - c;
    float r2 = dot(d, d) + 1e-4;
    float k = rad * rad / r2;
    field += k;
    grad += -2.0 * k / r2 * d;
    hueAcc += k * fi / 6.0;
  }
  float hueT = hueAcc / field;
  float inside = smoothstep(0.9, 1.1, field);
  vec3 n = normalize(vec3(-grad * 0.05, 1.0));
  vec3 l = normalize(vec3(-0.5, 0.6, 0.7));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 12.0 + u_p2 * 48.0);
  vec3 body = accents(hueT * 0.9 + u_p3);
  vec3 col = mix(u_c0, body, 0.12 * smoothstep(0.2, 1.0, field));
  vec3 lit = body * (0.55 + 0.45 * diff) + u_c3 * spec * (0.3 + 0.5 * u_p2);
  col = mix(col, lit, inside);
  gl_FragColor = finish(col);
}
`;
