// Button CSS lives here (not in styles.css) so the live page and the exported kit share one source.
// Rules read palette tokens --bg --fg --a1 --a2 --a3 and --size, typography from --font etc.

export const BUTTON_BASE_CSS = `
.xbtn {
  font-family: var(--font);
  font-weight: var(--weight);
  font-style: var(--italic);
  text-transform: var(--transform);
  letter-spacing: var(--tracking);
  font-size: var(--size);
  line-height: 1;
  padding: 0.6em 1.2em;
  border: 0;
  cursor: inherit;
  position: relative;
  display: inline-grid;
  place-items: center;
  min-width: 2.4em;
  min-height: 2.4em;
  transition: transform 0.25s cubic-bezier(.2,.9,.3,1.4), box-shadow 0.25s, filter 0.25s;
  -webkit-tap-highlight-color: transparent;
}
.xbtn:hover { transform: scale(1.04); }
.xbtn:active { transform: scale(0.94); }
.xbtn:focus-visible { outline: 3px solid var(--a2); outline-offset: 6px; }
.xbtn-label { position: relative; z-index: 1; display: inline-flex; align-items: center; white-space: nowrap; }
.xbtn-label * { white-space: nowrap; }
.xbtn-label > * { font: inherit; }
`;

export const SHAPE_CSS = {
  pill: `.shape-pill { border-radius: 999px; }`,
  square: `.shape-square { border-radius: 0; }`,
  rounded: `.shape-rounded { border-radius: 0.35em; }`,
  circle: `.shape-circle { border-radius: 50%; aspect-ratio: 1; padding: 0.8em; }`,
  blob: `.shape-blob { border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; padding: 0.9em 1.4em; }`,
  ticket: `.shape-ticket { border-radius: 0.2em; clip-path: polygon(0 0, 100% 0, 100% 35%, 94% 50%, 100% 65%, 100% 100%, 0 100%, 0 65%, 6% 50%, 0 35%); padding: 0.6em 1.6em; }`,
  hex: `.shape-hex { clip-path: polygon(12% 0, 88% 0, 100% 50%, 88% 100%, 12% 100%, 0 50%); padding: 0.7em 1.6em; }`,
  slant: `.shape-slant { transform: skewX(-12deg); }
.shape-slant:hover { transform: skewX(-12deg) scale(1.04); }
.shape-slant:active { transform: skewX(-12deg) scale(0.94); }`
};

export const SKIN_CSS = {
  solid: `.skin-solid { background: var(--a1); }`,
  outline: `.skin-outline { background: transparent; box-shadow: inset 0 0 0 0.08em var(--fg); }`,
  glass: `.skin-glass { background: color-mix(in srgb, var(--fg) 12%, transparent); backdrop-filter: blur(16px) saturate(1.6); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fg) 30%, transparent), 0 20px 60px -20px #0008; }`,
  brutal: `.skin-brutal { background: var(--a1); box-shadow: 0.14em 0.14em 0 var(--fg); outline: 0.05em solid var(--fg); }
.skin-brutal:active { box-shadow: 0 0 0 var(--fg); }`,
  neon: `.skin-neon { background: transparent; box-shadow: 0 0 0 0.05em var(--a1), 0 0 0.6em var(--a1), inset 0 0 0.6em var(--a1); text-shadow: 0 0 0.3em var(--a1); }`,
  emboss: `.skin-emboss { background: var(--fg); box-shadow: inset 0 -0.12em 0 #0005, 0 0.2em 0 color-mix(in srgb, var(--fg) 60%, #000), 0 0.4em 1em #0006; }
.skin-emboss:active { box-shadow: inset 0 0.08em 0 #0005, 0 0.02em 0 color-mix(in srgb, var(--fg) 60%, #000); }`,
  gradient: `.skin-gradient { background: linear-gradient(120deg, var(--a1), var(--a2), var(--a3), var(--a1)); background-size: 300% 100%; animation: grad-slide 6s linear infinite; }
@keyframes grad-slide { to { background-position: 300% 0; } }`,
  invert: `.skin-invert { background: #fff; mix-blend-mode: difference; }
.skin-invert .xbtn-label { color: #000; }`,
  naked: `.skin-naked { background: transparent; padding: 0.2em; }`
};

export const IDLE_CSS = {
  none: ``,
  breathe: `.idle-breathe { animation: breathe 3.2s ease-in-out infinite; }
.skin-gradient.idle-breathe { animation-name: grad-slide; }
@keyframes breathe { 50% { scale: 1.07; } }`,
  wobble: `.idle-wobble { animation: wobble 2.4s ease-in-out infinite; }
.skin-gradient.idle-wobble { animation-name: grad-slide; }
@keyframes wobble { 25% { rotate: -3deg; } 75% { rotate: 3deg; } }`,
  float: `.idle-float { animation: float 4s ease-in-out infinite; }
.skin-gradient.idle-float { animation-name: grad-slide; }
@keyframes float { 50% { translate: 0 -0.25em; } }`,
  'spin-border': `.idle-spin-border::before {
  content: ''; position: absolute; inset: -0.08em; border-radius: inherit; z-index: -1;
  background: conic-gradient(from var(--ang, 0deg), var(--a1), var(--a2), var(--a3), var(--a1));
  animation: spin-ang 3s linear infinite;
}
@property --ang { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes spin-ang { to { --ang: 360deg; } }`
};

// Press micro-interactions (hand-written). JS in button.tsx toggles .is-pressing and sets
// --rx/--ry (ripple origin) or --tilt-x/--tilt-y/--gx/--gy (tilt + glare) on the <button>.
const PRESS_REDUCED = (rules: string) => `@media (prefers-reduced-motion: reduce) { ${rules} }`;

export const PRESS_CSS = {
  none: ``,
  pop: `.press-pop.is-pressing { animation: press-pop 340ms cubic-bezier(.3,1.5,.5,1); }
@keyframes press-pop { 0% { scale: 1; } 28% { scale: 0.86; } 64% { scale: 1.12; } 100% { scale: 1; } }
${PRESS_REDUCED('.press-pop.is-pressing { animation: none; }')}`,
  shake: `.press-shake.is-pressing { animation: press-shake 320ms linear; }
@keyframes press-shake { 0%, 100% { translate: 0 0; } 14% { translate: -0.09em 0; } 28% { translate: 0.08em 0; } 42% { translate: -0.06em 0; } 57% { translate: 0.045em 0; } 71% { translate: -0.03em 0; } 86% { translate: 0.015em 0; } }
${PRESS_REDUCED('.press-shake.is-pressing { animation: none; }')}`,
  jelly: `.press-jelly.is-pressing { animation: press-jelly 380ms ease-out; }
@keyframes press-jelly { 0% { scale: 1 1; } 22% { scale: 1.18 0.8; } 42% { scale: 0.88 1.12; } 62% { scale: 1.06 0.95; } 82% { scale: 0.98 1.02; } 100% { scale: 1 1; } }
${PRESS_REDUCED('.press-jelly.is-pressing { animation: none; }')}`,
  sink: `.press-sink { transform-origin: 50% 100%; transition: transform 0.12s ease-out, box-shadow 0.12s, filter 0.12s; }
.press-sink:active, .press-sink.is-pressing { transform: perspective(24em) rotateX(16deg) translateY(0.08em) scale(0.97); filter: brightness(0.9); }
.shape-slant.press-sink:active, .shape-slant.press-sink.is-pressing { transform: perspective(24em) rotateX(16deg) translateY(0.08em) skewX(-12deg) scale(0.97); }
${PRESS_REDUCED('.press-sink:active, .press-sink.is-pressing { transform: none; } .shape-slant.press-sink:active, .shape-slant.press-sink.is-pressing { transform: skewX(-12deg); }')}`,
  ripple: `@property --ripple-r { syntax: '<length>'; inherits: false; initial-value: 0px; }
.press-ripple::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0; opacity: 0;
  background: radial-gradient(circle at var(--rx, 50%) var(--ry, 50%), transparent calc(var(--ripple-r) - 0.2em), color-mix(in srgb, currentColor 60%, transparent) var(--ripple-r), transparent calc(var(--ripple-r) + 0.2em));
}
.press-ripple.is-pressing::after { animation: press-ripple 380ms ease-out; }
@keyframes press-ripple { from { --ripple-r: 0px; opacity: 1; } to { --ripple-r: 5em; opacity: 0; } }
${PRESS_REDUCED('.press-ripple.is-pressing::after { animation: none; }')}`,
  tilt: `.press-tilt { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)); transition: transform 0.12s ease-out, box-shadow 0.25s, filter 0.25s; }
.press-tilt:hover { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.04); }
.press-tilt:active { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(0.95); }
.shape-slant.press-tilt { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) skewX(-12deg); }
.shape-slant.press-tilt:hover { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) skewX(-12deg) scale(1.04); }
.shape-slant.press-tilt:active { transform: perspective(28em) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) skewX(-12deg) scale(0.95); }
.press-tilt::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.2s;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), color-mix(in srgb, #fff 55%, transparent), transparent 60%);
}
.press-tilt:hover::after { opacity: 0.55; }
${PRESS_REDUCED('.press-tilt, .press-tilt:hover, .press-tilt:active { transform: none; } .shape-slant.press-tilt, .shape-slant.press-tilt:hover, .shape-slant.press-tilt:active { transform: skewX(-12deg); } .press-tilt::after { display: none; }')}`
};

// Scoped overrides for the React Bits button wrappers: shrink-to-fit and palette colours
// instead of the components' hard-coded dark surfaces. Reads --bg --fg --a1..3 from the stage.
export const WRAP_CSS = `
.xwrap { display: inline-grid; place-items: center; vertical-align: middle; }
.xwrap-specular { display: inline-block; }
.xwrap-specular .specular-button { margin: 0; }
.xwrap-borderglow.border-glow-card { display: inline-grid; border-color: color-mix(in srgb, var(--fg) 16%, transparent); border-radius: 22px; }
.xwrap-borderglow .border-glow-inner { overflow: visible; padding: 8px; display: grid; place-items: center; }
.xwrap-pixel.pixel-card { width: auto; height: auto; aspect-ratio: auto; display: inline-grid; place-items: center; padding: 14px; border-radius: 22px;
  --pixel-card-border: color-mix(in srgb, var(--fg) 22%, transparent); --pixel-card-active-color: color-mix(in srgb, var(--a1) 40%, transparent); }
.xwrap-pixel .pixel-canvas { position: absolute; inset: 0; pointer-events: none; }
.xwrap-pixel > .xbtn, .xwrap-pixel > * { position: relative; z-index: 1; }
.xwrap-pixel > .pixel-canvas { position: absolute; z-index: 0; }
.xwrap-glass.glass-surface { display: inline-flex; overflow: visible; }
.xwrap-glass .glass-surface__content { padding: 10px; }
.xwrap-glass.glass-surface--fallback { background: color-mix(in srgb, var(--fg) 10%, transparent); border: 1px solid color-mix(in srgb, var(--fg) 24%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, var(--fg) 30%, transparent), 0 10px 30px -10px #0006; }
.xwrap-spotlight.card-spotlight { display: inline-grid; place-items: center; padding: 12px; border-radius: 22px; background-color: color-mix(in srgb, var(--fg) 7%, var(--bg)); border: 1px solid color-mix(in srgb, var(--fg) 18%, transparent); }
.xwrap-spotlight > .xbtn { position: relative; z-index: 1; }
`;

// Makes the React Bits text effects sit inside the button like plain text: inherit the
// universe font and size instead of each component's demo typography.
export const LABEL_FX_CSS = `
.xbtn .split-flap-text { font-weight: inherit; }
.xbtn .text-block { margin: 0; max-width: none; font: inherit; color: inherit; }
.xbtn .text-block p { margin: 0; }
.xbtn .depth-text__layer, .xbtn .depth-text__face { letter-spacing: inherit; line-height: 1; }
.xbtn .echo-text { letter-spacing: inherit; line-height: 1; }
.xbtn .stroke-text { display: inline-block; width: auto; line-height: 0; }
.xbtn .stroke-text__svg { width: auto; }
.xbtn .warp-text, .xbtn .particle-text, .xbtn .tech-text { display: inline-block; min-height: 0; border-radius: 0; }
.xbtn .fold-text { letter-spacing: inherit; line-height: 1; }
.xbtn .focus-container { gap: 0.1em; flex-wrap: nowrap; }
.xbtn .focus-word { font-size: inherit; font-weight: inherit; }
.xbtn .focus-container .corner { width: 0.35em; height: 0.35em; border-width: 2px; }
.xbtn .focus-container .top-left, .xbtn .focus-container .top-right { top: -0.18em; }
.xbtn .focus-container .bottom-left, .xbtn .focus-container .bottom-right { bottom: -0.18em; }
.xbtn .focus-container .top-left, .xbtn .focus-container .bottom-left { left: -0.18em; }
.xbtn .focus-container .top-right, .xbtn .focus-container .bottom-right { right: -0.18em; }
.xbtn .split-parent { font: inherit; margin: 0; overflow: visible !important; }
.xbtn .text-pressure-title { color: inherit; }
`;

export type Shape = keyof typeof SHAPE_CSS;
export type Skin = keyof typeof SKIN_CSS;
export type Idle = keyof typeof IDLE_CSS;
export type Press = keyof typeof PRESS_CSS;

export const ALL_BUTTON_CSS = [
  BUTTON_BASE_CSS,
  ...Object.values(SHAPE_CSS),
  ...Object.values(SKIN_CSS),
  ...Object.values(IDLE_CSS),
  ...Object.values(PRESS_CSS),
  WRAP_CSS,
  LABEL_FX_CSS
].join('\n');

export const buttonCssFor = (shape: Shape, skin: Skin, idle: Idle, press: Press = 'none') =>
  [BUTTON_BASE_CSS, SHAPE_CSS[shape], SKIN_CSS[skin], IDLE_CSS[idle], PRESS_CSS[press], WRAP_CSS, LABEL_FX_CSS].filter(Boolean).join('\n');
