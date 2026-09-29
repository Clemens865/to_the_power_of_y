// Op-art concentric rings from two wandering centres; their interference bends the stripes.
// Stripes use a soft cosine profile (no aliasing shimmer). p0 = ring frequency,
// p1 = second-centre weight, p2 = stripe hardness, p3 = colour split.
export default /* glsl */ `
void main() {
  vec2 p = centred();
  float t = u_time * 0.1;
  vec2 a = vec2(sin(t * 0.7), cos(t * 0.5)) * vec2(0.45 * aspect(), 0.25);
  vec2 b = mix(-a, pointer(), 0.5);
  float ra = length(p - a);
  float rb = length(p - b);
  float field = ra + (rb - ra) * (0.3 + 0.5 * u_p1);
  float freq = 14.0 + u_p0 * 26.0;
  float s = cos(field * freq * 6.2831853 - t * 6.0);
  float hard = 1.0 + u_p2 * 5.0;
  float stripe = clamp(0.5 + 0.5 * s * hard, 0.0, 1.0);
  // Fade the contrast down near the centre so the button sits on a quiet patch.
  float e = edge(p);
  vec3 ink = mix(u_c1, u_c2, smoothstep(0.2, 0.8, fract(field * (0.5 + u_p3))));
  ink = mix(ink, u_c3, 0.25 * sin(field * 3.0 + t) + 0.25);
  vec3 col = mix(u_c0, ink, stripe * (0.2 + 0.8 * e));
  gl_FragColor = finish(col);
}
`;
