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

// Idle loops animate the individual `scale` / `rotate` / `translate` properties (or filter / pseudo-elements),
// so they combine with the `transform`-based hover and press states instead of fighting them.
const idle = (name: string, anim: string, rest: string) => `.idle-${name} { animation: ${anim}; }
.skin-gradient.idle-${name} { animation: grad-slide 6s linear infinite, ${anim}; }
${rest}`;

export const IDLE_CSS = {
  none: ``,
  breathe: idle('breathe', 'breathe 3.2s ease-in-out infinite', `@keyframes breathe { 50% { scale: 1.07; } }`),
  wobble: idle('wobble', 'wobble 2.4s ease-in-out infinite', `@keyframes wobble { 25% { rotate: -3deg; } 75% { rotate: 3deg; } }`),
  float: idle('float', 'float 4s ease-in-out infinite', `@keyframes float { 50% { translate: 0 -0.25em; } }`),
  'spin-border': `.idle-spin-border::before {
  content: ''; position: absolute; inset: -0.08em; border-radius: inherit; z-index: -1;
  background: conic-gradient(from var(--ang, 0deg), var(--a1), var(--a2), var(--a3), var(--a1));
  animation: spin-ang 3s linear infinite;
}
@property --ang { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes spin-ang { to { --ang: 360deg; } }`,
  heartbeat: idle('heartbeat', 'heartbeat 1.8s ease-in-out infinite', `@keyframes heartbeat { 0%, 40%, 100% { scale: 1; } 12% { scale: 1.08; } 26% { scale: 1.04; } }`),
  swing: idle('swing', 'swing 3.4s ease-in-out infinite', `.idle-swing { transform-origin: 50% -40%; }
@keyframes swing { 0%, 100% { rotate: -4deg; } 50% { rotate: 4deg; } }`),
  twitch: idle('twitch', 'twitch 4s steps(1) infinite', `@keyframes twitch { 0%, 88%, 100% { translate: 0 0; } 90% { translate: 0.05em -0.03em; } 92% { translate: -0.05em 0.02em; } 94% { translate: 0.03em 0.03em; } 96% { translate: 0 0; } }`),
  glow: idle('glow', 'glow-breathe 2.8s ease-in-out infinite', `@keyframes glow-breathe { 0%, 100% { filter: drop-shadow(0 0 0 transparent); } 50% { filter: drop-shadow(0 0 0.55em var(--a1)); } }`),
  hue: idle('hue', 'hue-drift 9s linear infinite', `@keyframes hue-drift { to { filter: hue-rotate(360deg); } }`),
  rubber: idle('rubber', 'rubber 3.2s ease-in-out infinite', `@keyframes rubber { 0%, 78%, 100% { scale: 1 1; } 84% { scale: 1.12 0.88; } 90% { scale: 0.93 1.07; } 95% { scale: 1.03 0.97; } }`),
  tilt3d: idle('tilt3d', 'tilt3d 6s ease-in-out infinite', `@keyframes tilt3d { 0%, 100% { rotate: y -14deg; } 50% { rotate: y 14deg; } }`),
  sway: idle('sway', 'sway 5s ease-in-out infinite', `@keyframes sway { 0%, 100% { translate: -0.18em 0; } 50% { translate: 0.18em 0; } }`),
  comet: `.idle-comet::before {
  content: ''; position: absolute; inset: -0.1em; border-radius: inherit; z-index: -1;
  background: conic-gradient(from var(--ang, 0deg), transparent 0 72%, var(--a2) 96%, var(--fg) 100%);
  animation: spin-ang 2.2s linear infinite;
}
@property --ang { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes spin-ang { to { --ang: 360deg; } }`,
  shimmer: `.idle-shimmer::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; z-index: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--fg) 45%, transparent) 50%, transparent 62%);
  background-size: 260% 100%; animation: shimmer-sweep 3.2s ease-in-out infinite;
}
@keyframes shimmer-sweep { 0% { background-position: 130% 0; } 60%, 100% { background-position: -130% 0; } }`,
  ring: `.idle-ring:not(.skin-brutal) { outline: 0.06em solid var(--a2); animation: ring-pulse 2.4s ease-out infinite; }
.skin-gradient.idle-ring { animation: grad-slide 6s linear infinite, ring-pulse 2.4s ease-out infinite; }
@keyframes ring-pulse { 0% { outline-offset: 0; outline-color: var(--a2); } 100% { outline-offset: 0.7em; outline-color: transparent; } }`
};

// Hover responses (a gene of their own). Written with :where() so they never beat :active (the press state)
// and they leave the 3D tilt / sink presses alone, which own the hover transform themselves.
const HOVER_OK = ':where(:not(:active):not(.press-tilt):not(.press-sink))';
const hover = (name: string, t: string, extra = '') => `.hover-${name}:hover${HOVER_OK} { transform: ${t}; ${extra} }
.shape-slant.hover-${name}:hover${HOVER_OK} { transform: skewX(-12deg) ${t}; ${extra} }`;

export const HOVER_CSS = {
  grow: hover('grow', 'scale(1.05)'),
  lift: hover('lift', 'translateY(-0.14em) scale(1.02)', 'filter: drop-shadow(0 0.35em 0.4em #0006);'),
  tilt: hover('tilt', 'rotate(-4deg) scale(1.03)'),
  squish: hover('squish', 'scale(1.1, 0.92)'),
  nudge: hover('nudge', 'translateX(0.12em) rotate(2deg)'),
  glow: hover('glow', 'scale(1.03)', 'filter: drop-shadow(0 0 0.5em var(--a1)) drop-shadow(0 0 0.15em var(--a2));'),
  bright: hover('bright', 'scale(1.02)', 'filter: brightness(1.2) saturate(1.35);'),
  shrink: hover('shrink', 'scale(0.96)')
};

// Entrances play once when a universe arrives, on a wrapper around the button.
const enter = (name: string, dur: string, ease: string, from: string) => `.enter-${name} { display: inline-block; animation: enter-${name} ${dur} ${ease} both; }
@keyframes enter-${name} { from { ${from} } }`;

export const ENTRANCE_CSS = {
  none: ``,
  pop: enter('pop', '0.55s', 'cubic-bezier(.2,1.5,.4,1)', 'scale: 0; opacity: 0;'),
  drop: enter('drop', '0.7s', 'cubic-bezier(.3,1.4,.5,1)', 'translate: 0 -40vh; opacity: 0;'),
  rise: enter('rise', '0.6s', 'cubic-bezier(.2,.9,.3,1)', 'translate: 0 1.2em; opacity: 0; filter: blur(6px);'),
  spin: enter('spin', '0.7s', 'cubic-bezier(.2,1.2,.4,1)', 'rotate: -200deg; scale: 0.3; opacity: 0;'),
  blur: enter('blur', '0.8s', 'ease-out', 'filter: blur(24px); opacity: 0; scale: 1.3;'),
  stretch: enter('stretch', '0.6s', 'cubic-bezier(.3,1.6,.5,1)', 'scale: 2.2 0.1; opacity: 0;'),
  flip: enter('flip', '0.75s', 'cubic-bezier(.2,1.1,.4,1)', 'transform: perspective(30em) rotateX(90deg); opacity: 0;'),
  zoom: enter('zoom', '0.6s', 'cubic-bezier(.2,.9,.3,1)', 'scale: 3; opacity: 0;')
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
/* WarpText's canvas is padded wider than its box; centre it instead of letting it overflow to the right */
.xbtn .warp-text { position: relative; }
.xbtn .warp-text > canvas { inset: auto !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%); }
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
export type Hover = keyof typeof HOVER_CSS;
export type Entrance = keyof typeof ENTRANCE_CSS;

export const ALL_BUTTON_CSS = [
  BUTTON_BASE_CSS,
  ...Object.values(SHAPE_CSS),
  ...Object.values(SKIN_CSS),
  ...Object.values(IDLE_CSS),
  ...Object.values(PRESS_CSS),
  ...Object.values(HOVER_CSS),
  ...Object.values(ENTRANCE_CSS),
  WRAP_CSS,
  LABEL_FX_CSS
].join('\n');

export const buttonCssFor = (shape: Shape, skin: Skin, idle: Idle, press: Press = 'none', hover: Hover = 'grow', entrance: Entrance = 'none') =>
  [BUTTON_BASE_CSS, SHAPE_CSS[shape], SKIN_CSS[skin], IDLE_CSS[idle], PRESS_CSS[press], HOVER_CSS[hover], ENTRANCE_CSS[entrance], WRAP_CSS, LABEL_FX_CSS].filter(Boolean).join('\n');
