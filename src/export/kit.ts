import { zipSync, strToU8 } from 'fflate';
import type { Genome } from '../engine/genome';
import { backgroundComponentName } from '../genes/backgrounds';
import { buttonCssFor } from '../genes/buttonCss';
import { labelColor } from '../genes/button';
import { cursorCss, cursorEffectInfo } from '../genes/cursor';
import { decorFor, LAYOUT_CSS } from '../genes/layout';
import soundSource from '../engine/sound.ts?raw';
import trailsSource from '../genes/trails.tsx?raw';

// Builds a "keep this y" kit: a React component that reproduces one universe.
// React Bits source is NOT bundled (its licence restricts redistribution); the README
// lists the official shadcn install command for each component instead.

const LABEL_COMPONENTS: Record<string, string | null> = {
  plain: null, shiny: 'ShinyText', gradient: 'GradientText', decrypt: 'DecryptedText',
  fuzzy: 'FuzzyText', type: 'TextType', rotate: 'RotatingText', blur: 'BlurText'
};

const js = (v: unknown) => JSON.stringify(v);
const spread = (props: Record<string, unknown>) => `{...${JSON.stringify(props)}}`;

const labelJsx = (g: Genome): string => {
  const { text, speed, effect } = g.label;
  const color = labelColor(g.button, g.palette);
  const p = g.palette;
  const round = (n: number) => Math.round(n * 100) / 100;
  switch (effect) {
    case 'shiny': return `<ShinyText text={${js(text)}} color={${js(color)}} shineColor={${js(p.accent3)}} speed={${round(2 / speed)}} />`;
    case 'gradient': return `<GradientText colors={${js([p.accent, p.accent2, p.accent3, p.accent])}} animationSpeed={${round(6 / speed)}}>{${js(text)}}</GradientText>`;
    case 'decrypt': return `<DecryptedText text={${js(text)}} animateOn="view" speed={${round(40 / speed)}} maxIterations={14} sequential revealDirection="center" />`;
    case 'fuzzy': return `<FuzzyText fontSize={${round(g.button.size * 16)}} fontWeight={${g.font.weight}} fontFamily={${js(`"${g.font.family}"`)}} color={${js(color)}} baseIntensity={${round(0.12 * speed)}} hoverIntensity={0.5} enableHover>{${js(text)}}</FuzzyText>`;
    case 'type': return `<TextType text={${js([text, 'xʸ', text])}} typingSpeed={${round(70 / speed)}} pauseDuration={1800} showCursor cursorCharacter="▍" />`;
    case 'rotate': return `<RotatingText texts={${js([text, 'xʸ', 'y', text])}} rotationInterval={${round(1600 / speed)}} staggerDuration={0.02} splitBy="characters" />`;
    case 'blur': return `<BlurText text={${js(text)}} animateBy="letters" delay={${round(60 / speed)}} direction="top" />`;
    default: return `<span>{${js(text)}}</span>`;
  }
};

const buttonJsx = (g: Genome): string => {
  const b = g.button;
  const p = g.palette;
  let node = `<button type="button" className="xbtn shape-${b.shape} skin-${b.skin} idle-${b.idle}" style={{ color: ${js(labelColor(b, p))} }} onClick={press} onMouseEnter={() => sound.current.hover(SOUND)}>
          <span className="xbtn-label">${labelJsx(g)}</span>
        </button>`;
  if (b.wrap === 'electric') node = `<ElectricBorder color={${js(p.accent)}} speed={1} chaos={0.12} borderRadius={${b.shape === 'pill' || b.shape === 'circle' ? 999 : 12}}>\n        ${node}\n        </ElectricBorder>`;
  if (b.wrap === 'glare') node = `<GlareHover width="auto" height="auto" background="transparent" borderColor="transparent" borderRadius="999px" glareColor={${js(p.fg)}} glareOpacity={0.4}>\n        ${node}\n        </GlareHover>`;
  if (b.magnet) node = `<Magnet padding={120} magnetStrength={3}>\n        ${node}\n        </Magnet>`;
  if (b.spark) node = `<ClickSpark sparkColor={${js(p.accent2)}} sparkCount={12} sparkRadius={40} sparkSize={14}>\n        ${node}\n        </ClickSpark>`;
  return node;
};

const decorJsx = (g: Genome): string =>
  decorFor(g.layout, { seed: g.seed, word: g.label.text, count: 0 })
    .map(it =>
      'circular' in it
        ? `<div className="lay-orbit"><CircularText text={${js(it.circular)}} spinDuration={24} onHover="speedUp" /></div>`
        : `<div className={${js(it.cls)}}${it.style ? ` style={${js(it.style)}}` : ''}>${it.text ? `{${js(it.text)}}` : ''}</div>`
    )
    .join('\n        ');

export const reactBitsUsed = (g: Genome): string[] => {
  const used = new Set<string>([backgroundComponentName(g.background.id)]);
  const label = LABEL_COMPONENTS[g.label.effect];
  if (label) used.add(label);
  if (g.button.wrap === 'electric') used.add('ElectricBorder');
  if (g.button.wrap === 'glare') used.add('GlareHover');
  if (g.button.magnet) used.add('Magnet');
  if (g.button.spark) used.add('ClickSpark');
  if (g.layout.kind === 'orbit') used.add('CircularText');
  const c = cursorEffectInfo(g.cursor);
  if (c?.rb) used.add(c.rb);
  return [...used];
};

export const universeTsx = (g: Genome): string => {
  const bg = backgroundComponentName(g.background.id);
  const cursor = cursorEffectInfo(g.cursor);
  const imports = reactBitsUsed(g).map(n => `import ${n} from './components/${n}/${n}';`);
  if (cursor?.trail) imports.push(`import { Trails } from './trails';`);
  const cursorNode = !cursor ? '' : cursor.trail
    ? `<Trails mode={${js(cursor.trail)}} {...${js(g.cursor.props)}} text={${js(g.label.text)}} />`
    : `<CursorLayer><${cursor.rb} ${spread(g.cursor.props)} /></CursorLayer>`;
  // Several React Bits cursors only listen on their own container; forward real pointer events into it.
  const cursorLayer = cursor?.rb
    ? `
function CursorLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const forward = (e: MouseEvent) => {
      const target = ref.current?.firstElementChild;
      if (!e.isTrusted || !target) return;
      const init = { clientX: e.clientX, clientY: e.clientY, bubbles: true };
      target.dispatchEvent(e instanceof PointerEvent ? new PointerEvent(e.type, init) : new MouseEvent(e.type, init));
    };
    addEventListener('mousemove', forward);
    addEventListener('pointermove', forward);
    return () => {
      removeEventListener('mousemove', forward);
      removeEventListener('pointermove', forward);
    };
  }, []);
  return <div ref={ref} className="cursor-layer" aria-hidden>{children}</div>;
}
`
    : '';

  return `// xʸ universe  y = ${g.seed}
// Generated by "x to the power of y". Recreates this exact page as one React component.
import { useEffect, useRef${cursor?.rb ? ', type ReactNode' : ''} } from 'react';
${imports.join('\n')}
import { SoundEngine, type SoundGene } from './sound';
import './universe.css'; // last, so it wins over the components' own CSS

const SOUND: SoundGene = ${js(g.sound)};
${cursorLayer}
export default function Universe({ onPress }: { onPress?: () => void }) {
  const sound = useRef(new SoundEngine());
  const started = useRef(false);
  useEffect(() => () => sound.current.stopAmbient(), []);

  const press = () => {
    sound.current.press(SOUND);
    if (!started.current) {
      started.current = true;
      sound.current.ambient(SOUND); // audio may only start after a user gesture
    }
    onPress?.();
  };

  return (
    <main className="xy-stage">
      <div className="xy-bg" aria-hidden>
        <${bg} ${spread(g.background.props)} />
      </div>
      <div className="layout" aria-hidden>
        ${decorJsx(g)}
      </div>
      <div className="xy-spot" style={{ left: '${g.layout.x}%', top: '${g.layout.y}%' }}>
        ${buttonJsx(g)}
      </div>
      ${cursorNode}
    </main>
  );
}
`;
};

export const universeCss = (g: Genome): string => {
  const { palette: p, font: f } = g;
  const hides = cursorEffectInfo(g.cursor)?.hidesCursor;
  return `/* xʸ universe y = ${g.seed} — ${p.mood} palette, ${f.family} */
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@${f.weight}&display=swap');

.xy-stage {
  --bg: ${p.bg}; --fg: ${p.fg}; --a1: ${p.accent}; --a2: ${p.accent2}; --a3: ${p.accent3};
  --size: ${Math.round(g.button.size * 100) / 100}rem;
  --font: "${f.family}", system-ui, sans-serif; --weight: ${f.weight};
  --transform: ${f.transform}; --tracking: ${f.tracking}; --italic: ${f.italic ? 'italic' : 'normal'};
  position: fixed; inset: 0; overflow: hidden;
  background: var(--bg); color: var(--fg);
  cursor: ${hides ? 'none' : cursorCss(g.cursor, p)};
}
.xy-bg { position: absolute; inset: 0; }
.xy-bg > * { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; }
.xy-spot { position: absolute; transform: translate(-50%, -50%); }
.cursor-layer { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
.cursor-layer > * { width: 100%; height: 100%; }
.xbtn .shiny-text, .xbtn .animated-gradient-text, .xbtn .text-type, .xbtn .text-rotate { font: inherit; margin: 0; }
.xbtn .animated-gradient-text { backdrop-filter: none; border-radius: 0; overflow: visible; }
${buttonCssFor(g.button.shape, g.button.skin, g.button.idle)}
${g.layout.kind === 'bare' ? '' : LAYOUT_CSS}
@media (prefers-reduced-motion: reduce) { .xbtn, .xbtn::before { animation: none !important; } }
`;
};

export const readme = (g: Genome, link: string): string => {
  const comps = reactBitsUsed(g);
  const cursor = cursorEffectInfo(g.cursor);
  return `# xʸ universe \`${g.seed}\`

Live: ${link}

| Layer | Value |
| --- | --- |
| Palette | ${g.palette.mood} · bg ${g.palette.bg} · fg ${g.palette.fg} · ${g.palette.accent} ${g.palette.accent2} ${g.palette.accent3} |
| Font | ${g.font.family} ${g.font.weight}${g.font.italic ? ' italic' : ''}, ${g.font.transform}, tracking ${g.font.tracking} |
| Background | ${backgroundComponentName(g.background.id)} (React Bits) |
| Button | ${g.button.shape} · ${g.button.skin} · idle ${g.button.idle}${g.button.wrap !== 'none' ? ` · ${g.button.wrap} border` : ''}${g.button.magnet ? ' · magnetic' : ''}${g.button.spark ? ' · click sparks' : ''} |
| Label | "${g.label.text}" · ${g.label.effect} |
| Layout | ${g.layout.kind} · button at ${g.layout.x}% / ${g.layout.y}% |
| Cursor | ${g.cursor.css}${cursor ? ` + ${cursor.rb ?? `${cursor.trail} trail`}` : ''} |
| Sound | ${g.sound.voice} press${g.sound.ambient !== 'none' ? ` · ${g.sound.ambient} ambient` : ''} · root ${g.sound.root} Hz |

## Rebuild it in a React + TypeScript project

1. Install runtime dependencies:

   \`\`\`sh
   npm i ogl three gsap motion
   \`\`\`

2. Add the React Bits components through their official registry (CSS variants):

   \`\`\`sh
${comps.map(c => `   npx shadcn@latest add @react-bits/${c}-TS-CSS`).join('\n')}
   \`\`\`

   The imports in \`Universe.tsx\` expect \`./components/<Name>/<Name>\`; adjust them to wherever the CLI put the files.
   React Bits is MIT + Commons Clause: fine inside your site or app, not for re-selling the components themselves.

3. Copy \`Universe.tsx\`, \`universe.css\` and \`sound.ts\`${cursor?.trail ? ' and `trails.tsx`' : ''} next to each other and render \`<Universe />\`.

\`recipe.json\` holds the full genome. Opening the live link with the same seed always regenerates this universe.
`;
};

export const buildKit = (g: Genome, link: string) => {
  const files: Record<string, string> = {
    'README.md': readme(g, link),
    'Universe.tsx': universeTsx(g),
    'universe.css': universeCss(g),
    'sound.ts': soundSource,
    'recipe.json': JSON.stringify(g, null, 2)
  };
  if (cursorEffectInfo(g.cursor)?.trail) files['trails.tsx'] = trailsSource;
  return files;
};

export const downloadKit = (g: Genome, link: string) => {
  const files = buildKit(g, link);
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [`xy-${g.seed}/${k}`, strToU8(v)])));
  const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `xy-${g.seed}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
