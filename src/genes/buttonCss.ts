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
.xbtn-label { position: relative; z-index: 1; display: inline-flex; align-items: center; }
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

export type Shape = keyof typeof SHAPE_CSS;
export type Skin = keyof typeof SKIN_CSS;
export type Idle = keyof typeof IDLE_CSS;

export const ALL_BUTTON_CSS = [BUTTON_BASE_CSS, ...Object.values(SHAPE_CSS), ...Object.values(SKIN_CSS), ...Object.values(IDLE_CSS)].join('\n');

export const buttonCssFor = (shape: Shape, skin: Skin, idle: Idle) =>
  [BUTTON_BASE_CSS, SHAPE_CSS[shape], SKIN_CSS[skin], IDLE_CSS[idle]].filter(Boolean).join('\n');
