import { zipSync, strToU8 } from 'fflate';
import type { Genome } from '../engine/genome';
import { fontUrl, fontVariationCss } from '../engine/fonts';
import { backgroundKit, isShaderBackground } from '../genes/backgrounds';
import { shaderKit, type shaderProps } from '../genes/shaders';
import { buttonCssFor } from '../genes/buttonCss';
import { buttonKit, labelColor, pressNeedsJs, PRESS_HELPER_SOURCE } from '../genes/button';
import { labelKit } from '../genes/label';
import { cursorCss, cursorEffectInfo } from '../genes/cursor';
import { decorKit, LAYOUT_CSS } from '../genes/layout';
import { overlayKit } from '../genes/overlay';
import { RARITY_CSS, RARITY_LABEL } from '../genes/rarity';
import { BURST_CSS } from '../genes/burst';
import { behaviourKit } from '../genes/behaviour';
import soundSource from '../engine/sound.ts?raw';
import zzfxTypesSource from '../types/zzfx.d.ts?raw';
import trailsSource from '../genes/trails.tsx?raw';

// Builds a "keep this y" kit: a React component that reproduces one universe.
// Third-party component source is NOT bundled (React Bits and similar licences restrict redistribution);
// the README lists the official install command for each component instead.

const js = (v: unknown) => JSON.stringify(v);
const RB_IMPORT = /^import (\w+) from '\.\/components\/\1\/\1';$/;
const NAMED_IMPORT = /^import \{ ([\w, ]+) \} from '([^']+)';$/;

// Everything the component needs, gathered from each gene's own kit generator.
const parts = (g: Genome) => {
  const color = labelColor(g.button, g.palette);
  const label = labelKit(g.label, g.palette, g.font, color, g.button.size * 16);
  const button = buttonKit(g.button, g.palette, label.jsx);
  const decor = decorKit(g.layout, { seed: g.seed, word: g.label.text, count: 0, palette: g.palette, tagline: g.voice.tagline, hint: g.voice.hint });
  const shader = isShaderBackground(g.background.id) ? shaderKit(g.background.props as ReturnType<typeof shaderProps>) : null;
  const background = shader ? { importLine: shader.importLine, jsx: shader.jsx, install: [] as string[] } : backgroundKit(g.background);
  const overlay = overlayKit(g.overlay);
  const cursor = cursorEffectInfo(g.cursor);
  const behaviour = behaviourKit(g.behaviour);

  const rb = new Set<string>([...label.components, ...button.components, ...decor.components]);
  if (cursor?.rb) rb.add(cursor.rb);
  const rawImports = [background.importLine, overlay.importLine].filter((l): l is string => !!l);
  const named = new Map<string, Set<string>>();
  const otherImports: string[] = [];
  for (const line of rawImports) {
    const m = line.match(RB_IMPORT);
    if (m) rb.add(m[1]);
    const n = line.match(NAMED_IMPORT);
    if (n) n[1].split(',').forEach(name => (named.get(n[2]) ?? named.set(n[2], new Set()).get(n[2])!).add(name.trim()));
    if (!m && !n) otherImports.push(line);
  }
  const install = new Set<string>(['npm i ogl three gsap motion', ...background.install, ...overlay.install, ...behaviour.install]);
  if (g.sound.voice === 'zzfx') install.add('npm i zzfx');
  const hasConfetti = g.burst.kind !== 'none' && g.burst.kind !== 'shockwave';
  if (hasConfetti) install.add('npm i @tsparticles/confetti');
  for (const c of rb) install.add(`npx shadcn@latest add @react-bits/${c}-TS-CSS`);
  return { label, button, decor, background, overlay, cursor, behaviour, shader, rb: [...rb], named, otherImports, install: [...install], hasConfetti };
};

const burstOptions = (g: Genome) => {
  const b = g.burst;
  const p = g.palette;
  const base = { particleCount: b.count, spread: b.spread, startVelocity: b.velocity, gravity: b.gravity, scalar: b.scalar, colors: [p.accent, p.accent2, p.accent3, p.fg], zIndex: 45 };
  const byKind: Record<string, object> = {
    confetti: { shapes: ['square', 'circle'] },
    stars: { shapes: ['star'] },
    hearts: { shapes: ['heart'] },
    suits: { shapes: ['spades', 'hearts', 'diamonds', 'clubs'] },
    firework: { shapes: ['circle'], spread: 360, startVelocity: 45, gravity: 0.6, ticks: 120 },
    snow: { shapes: ['circle'], spread: 360, startVelocity: 12, gravity: 0.25, drift: 0.5, ticks: 260, colors: ['#ffffff', p.fg] },
    emoji: { shapes: ['emoji'], shapeOptions: { emoji: { value: b.emoji } }, scalar: b.scalar * 2 }
  };
  return { ...base, ...byKind[b.kind] };
};

export const universeTsx = (g: Genome): string => {
  const k = parts(g);
  const imports = [
    ...k.rb.map(n => `import ${n} from './components/${n}/${n}';`),
    ...[...k.named].map(([mod, names]) => `import { ${[...names].join(', ')} } from '${mod}';`),
    ...k.otherImports
  ];
  if (k.cursor?.trail) imports.push(`import { Trails } from './trails';`);
  if (k.hasConfetti) imports.push(`import { confetti } from '@tsparticles/confetti';`);
  if (k.behaviour.source) imports.push(`import { Behaviour } from './Behaviour';`);

  const cursorNode = !k.cursor ? '' : k.cursor.trail
    ? `<Trails mode={${js(k.cursor.trail)}} {...${js(g.cursor.props)}} text={${js(g.label.text)}} />`
    : `<CursorLayer><${k.cursor.rb} {...${js(g.cursor.props)}} /></CursorLayer>`;
  // Several React Bits cursors only listen on their own container; forward real pointer events into it.
  const cursorLayer = k.cursor?.rb
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

  const burst =
    g.burst.kind === 'shockwave'
      ? `const ring = document.createElement('div');
    ring.className = 'burst-shockwave';
    ring.style.cssText = \`left:\${e?.clientX ?? innerWidth / 2}px;top:\${e?.clientY ?? innerHeight / 2}px;--ring:${g.palette.accent}\`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);`
      : k.hasConfetti
        ? `void confetti({ ...BURST, origin: { x: (e?.clientX ?? innerWidth / 2) / innerWidth, y: (e?.clientY ?? innerHeight / 2) / innerHeight } });`
        : '';

  return `// xʸ universe  y = ${g.seed}  —  ${g.name}${g.rarity !== 'common' ? `  (${RARITY_LABEL[g.rarity]})` : ''}
// Generated by "x to the power of y". Recreates this exact page as one React component.
import { useEffect, useRef${k.cursor?.rb ? ', type ReactNode' : ''} } from 'react';
${imports.join('\n')}
import { SoundEngine, type SoundGene } from './sound';
import './universe.css'; // last, so it wins over the components' own CSS

const SOUND: SoundGene = ${js(g.sound)};
${k.hasConfetti ? `const BURST = ${js(burstOptions(g))};\n` : ''}${cursorLayer}${pressNeedsJs(g.button.press) ? PRESS_HELPER_SOURCE : ''}
export default function Universe({ onPress }: { onPress?: () => void }) {
  const sound = useRef(new SoundEngine());
  const started = useRef(false);
  useEffect(() => () => sound.current.stopAmbient(), []);

  const press = (e?: { clientX: number; clientY: number }) => {
    sound.current.press(SOUND);
    if (!started.current) {
      started.current = true;
      sound.current.ambient(SOUND); // audio may only start after a user gesture
    }
    ${burst}
    onPress?.();
  };

  return (
    <main className="xy-stage${g.rarity === 'mythic' ? ' rarity-mythic' : ''}">
      <div className="xy-bg" aria-hidden>
        ${k.background.jsx}
      </div>
      ${k.overlay.jsx}
      <div className="layout" aria-hidden>
        ${k.decor.jsx}
      </div>
      <div className="xy-spot${g.rarity !== 'common' ? ' rarity-holo' : ''}" style={{ left: '${g.layout.x}%', top: '${g.layout.y}%' }}>
        <div className="entrance enter-${g.button.entrance}">
        ${k.behaviour.jsx(k.button.jsx)}
        </div>
      </div>
      ${g.rarity !== 'common' ? `<div className="rarity-badge">{${js(RARITY_LABEL[g.rarity])}}</div>` : ''}
      ${cursorNode}
    </main>
  );
}
`;
};

export const universeCss = (g: Genome): string => {
  const { palette: p, font: f } = g;
  const k = parts(g);
  const hides = k.cursor?.hidesCursor;
  return `/* xʸ universe y = ${g.seed} — ${g.name} — ${p.mood} palette, ${f.family} */
@import url('${fontUrl(f.family).replace('display=block', 'display=swap')}');

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
.xy-spot { position: absolute; transform: translate(-50%, -50%); z-index: 2; perspective: 40em; }
.entrance { display: inline-block; }
.cursor-layer { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
.cursor-layer > * { width: 100%; height: 100%; }
${fontVariationCss(f, '.xbtn-label')}
${buttonCssFor(g.button.shape, g.button.skin, g.button.idle, g.button.press, g.button.hover, g.button.entrance)}
${g.layout.kind === 'bare' ? '' : LAYOUT_CSS}
${k.overlay.css}
${g.rarity !== 'common' ? RARITY_CSS : ''}
${g.burst.kind === 'shockwave' ? BURST_CSS : ''}
@media (prefers-reduced-motion: reduce) { .xbtn, .xbtn::before { animation: none !important; } }
`;
};

export const readme = (g: Genome, link: string): string => {
  const k = parts(g);
  return `# xʸ universe \`${g.seed}\` — ${g.name}

Live: ${link}${g.rarity !== 'common' ? `\n\n**${RARITY_LABEL[g.rarity]}**` : ''}

| Layer | Value |
| --- | --- |
| Palette | ${g.palette.mood} · bg ${g.palette.bg} · fg ${g.palette.fg} · ${g.palette.accent} ${g.palette.accent2} ${g.palette.accent3} |
| Font | ${g.font.family} ${g.font.weight}${g.font.italic ? ' italic' : ''}, ${g.font.transform}, tracking ${g.font.tracking}${Object.keys(g.font.axes).length ? ` · axes ${Object.entries(g.font.axes).map(([t, v]) => `${t} ${v}`).join(', ')}` : ''}${g.font.pulse ? ` · breathing ${g.font.pulse.tag}` : ''} |
| Background | ${g.background.id} |
| Overlay | ${g.overlay.kind} |
| Button | ${g.button.shape} · ${g.button.skin} · idle ${g.button.idle} · press ${g.button.press}${g.button.wrap !== 'none' ? ` · ${g.button.wrap}` : ''}${g.button.magnet ? ' · magnetic' : ''}${g.button.spark ? ' · click sparks' : ''} |
| Label | "${g.label.text}" · ${g.label.effect} · ${g.voice.tone} voice |
| Layout | ${g.layout.kind} · button at ${g.layout.x}% / ${g.layout.y}% |
| Cursor | ${g.cursor.css}${k.cursor ? ` + ${k.cursor.rb ?? `${k.cursor.trail} trail`}` : ''} |
| Burst | ${g.burst.kind} |
| Sound | ${g.sound.voice} press${g.sound.ambient !== 'none' ? ` · ${g.sound.ambient} ambient` : ''} · root ${g.sound.root} Hz |

## Rebuild it in a React + TypeScript project

1. Install dependencies and components:

   \`\`\`sh
${k.install.map(c => `   ${c}`).join('\n')}
   \`\`\`

   The React Bits imports in \`Universe.tsx\` expect \`./components/<Name>/<Name>\`; adjust them to wherever the CLI put the files.
   React Bits is MIT + Commons Clause: fine inside your site or app, not for re-selling the components themselves.

2. Copy the files in this folder next to each other and render \`<Universe />\`.

\`recipe.json\` holds the full genome. Opening the live link with the same seed always regenerates this universe.
`;
};

export const buildKit = (g: Genome, link: string) => {
  const files: Record<string, string> = {
    'README.md': readme(g, link),
    'Universe.tsx': universeTsx(g),
    'universe.css': universeCss(g),
    'sound.ts': soundSource,
    'zzfx.d.ts': zzfxTypesSource,
    'recipe.json': JSON.stringify(g, null, 2)
  };
  if (cursorEffectInfo(g.cursor)?.trail) files['trails.tsx'] = trailsSource;
  const shaderFiles = parts(g).shader?.files ?? {};
  Object.assign(files, shaderFiles);
  const behaviourSource = behaviourKit(g.behaviour).source;
  if (behaviourSource) files['Behaviour.tsx'] = behaviourSource;
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
