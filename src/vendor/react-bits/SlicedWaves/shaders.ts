// React Bits; see LICENSE.md. Extracted from the cached TS-CSS variant.
export const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uColumns;
uniform float uRows;
uniform float uThickness;
uniform float uSpeed;
uniform float uTravel;
uniform float uWaveSpread;
uniform float uRowOffset;
uniform float uSoftness;
uniform float uGlow;
uniform float uBrightness;
uniform float uContrast;
uniform float uOpacity;
uniform float uVertical;
uniform float uAlternate;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uEnableMouse;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uLightMode;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec2 grid = vec2(max(uColumns, 1.0), max(uRows, 1.0));
  vec2 p = uv * grid;
  vec2 gv = fract(p) - 0.5;
  vec2 id = floor(p);

  float barCoord, waveId, offId, along;
  if (uVertical > 0.5) {
    barCoord = gv.x; waveId = id.y; offId = id.x; along = uv.y;
  } else {
    barCoord = gv.y; waveId = id.x; offId = id.y; along = uv.x;
  }

  float dir = 1.0;
  if (uAlternate > 0.5 && mod(offId, 2.0) >= 1.0) dir = -1.0;

  float phase = iTime * uSpeed + waveId * uWaveSpread + cos(offId * uRowOffset);
  float mv = sin(phase) * 0.5 + 0.5;
  if (dir < 0.0) mv = 1.0 - mv;

  float infl = 0.0;
  if (uEnableMouse > 0.5) {
    float md = distance(uv, uMouse);
    infl = smoothstep(uMouseRadius, 0.0, md) * uMouseStrength * uMouseActive;
  }

  float thick = clamp(uThickness + infl * 0.25, 0.0, 1.0);
  float startPos = (0.5 - thick * 0.5) * uTravel;
  float endPos = (-0.5 + thick * 0.5) * uTravel;
  float pos = mix(startPos, endPos, mv);

  float aa = max(uSoftness, 0.0005);
  float d = abs(barCoord + pos) - thick * 0.5;
  float aaWidth = fwidth(uVertical > 0.5 ? p.x : p.y);
  float edge = max(aa, aaWidth);
  float mask = smoothstep(edge, -edge, d);
  float glow = exp(-max(d, 0.0) * (7.0 / (uGlow + 0.001))) * clamp(uGlow, 0.0, 1.0);
  float intensity = clamp(mask + glow * (1.0 - mask), 0.0, 1.0);

  if (uGrain > 0.5) {
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    intensity = clamp(intensity + (g - 0.5) * uGrainIntensity, 0.0, 1.0);
  }

  float tint = mv;
  vec3 grad = mix(uColor2, uColor1, tint);
  grad = mix(grad, uColor3, clamp(along, 0.0, 1.0) * 0.45);

  vec3 col = grad * uBrightness * (1.0 + infl * 0.6);
  col = (col - 0.5) * uContrast + 0.5;
  col = clamp(col, 0.0, 1.0);

  float a = intensity * uOpacity;
  if (uLightMode > 0.5) {
    float peak = max(col.r, max(col.g, col.b));
    vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.16));
    fragColor = vec4(mix(vec3(1.0), chroma, a * 0.94), 1.0);
  } else {
    fragColor = vec4(col * a, a);
  }
}
`;
