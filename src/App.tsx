import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { grow, type Genome } from './engine/genome';
import { newSeed } from './engine/rng';
import { loadFont, fontVariationCss } from './engine/fonts';
import { SoundEngine } from './engine/sound';
import { Background } from './genes/backgrounds';
import { XButton, labelColor } from './genes/button';
import { ALL_BUTTON_CSS } from './genes/buttonCss';
import { Label } from './genes/label';
import { CursorLayer, cursorCss, cursorEffectInfo } from './genes/cursor';
import { Decor, decorFor, LAYOUT_CSS } from './genes/layout';
import { Overlay, OVERLAY_CSS } from './genes/overlay';
import { generatedTransitionCss, isGenerated } from './genes/transition';
import { RARITY_CSS, RARITY_LABEL } from './genes/rarity';
import { BURST_CSS, fireBurst } from './genes/burst';
import { universeName } from './genes/name';
import { Behaviour } from './genes/behaviour';

// The export panel (and its zip/code generator) only loads when someone opens it.
const ExportPanel = lazy(() => import('./export/ExportPanel').then(m => ({ default: m.ExportPanel })));
import { Layer } from './engine/Layer';

const noop = () => {};
const seedFromHash = () => location.hash.slice(1).replace(/[^0-9a-z]/gi, '') || null;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const initialSeed = seedFromHash() ?? newSeed();
history.replaceState(null, '', `#${initialSeed}`);

const MUTE_KEY = 'xy-muted';
const readMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

export const App = () => {
  const [genome, setGenome] = useState<Genome>(() => grow(initialSeed));
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(readMuted);
  const [keepOpen, setKeepOpen] = useState(false);
  const origin = useRef({ x: innerWidth / 2, y: innerHeight / 2 });
  const sound = useRef(new SoundEngine());
  const heard = useRef(false); // audio may only start after a user gesture
  const genomeRef = useRef(genome);
  genomeRef.current = genome;
  const [name, setName] = useState('');

  useEffect(() => {
    let live = true;
    setName('');
    void universeName(genome.palette.accent, genome.seed).then(n => live && setName(n));
    return () => {
      live = false;
    };
  }, [genome.seed, genome.palette.accent]);

  useEffect(() => {
    void loadFont(genome.font);
  }, [genome.font]);

  useEffect(() => {
    sound.current.setMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* storage unavailable: mute just won't persist */
    }
    if (!muted && heard.current) sound.current.ambient(genomeRef.current.sound);
  }, [muted]);

  // Every universe change goes through the URL, so back/forward replays earlier ys.
  useEffect(() => {
    const onHash = async () => {
      const seed = seedFromHash();
      if (!seed) return;
      const next = grow(seed);
      await loadFont(next.font);
      const root = document.documentElement;
      const { x, y } = origin.current;
      const t = next.transition;
      root.dataset.transition = isGenerated(t) ? 'generated' : t.kind;
      root.style.setProperty('--vx', `${x}px`);
      root.style.setProperty('--vy', `${y}px`);
      root.style.setProperty('--vt-dur', `${t.duration}s`);
      root.style.setProperty('--vt-ease', t.easing);
      // Generated transitions are built for this seed and this press point.
      let dyn = document.getElementById('vt-generated');
      if (!dyn) {
        dyn = document.createElement('style');
        dyn.id = 'vt-generated';
        document.head.appendChild(dyn);
      }
      dyn.textContent = isGenerated(t) ? generatedTransitionCss(t, x, y) : '';
      const apply = () =>
        flushSync(() => {
          setGenome(next);
          setCount(c => c + 1);
        });
      if (document.startViewTransition && !reducedMotion()) document.startViewTransition(apply);
      else apply();
      if (heard.current) sound.current.ambient(next.sound);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const press = useCallback((e?: { clientX: number; clientY: number }) => {
    origin.current = e && e.clientX ? { x: e.clientX, y: e.clientY } : { x: innerWidth / 2, y: innerHeight / 2 };
    heard.current = true;
    const current = genomeRef.current;
    sound.current.press(current.sound);
    void fireBurst(current.burst, current.palette, origin.current.x, origin.current.y);
    // A beat of delay lets the press animation register before the universe is replaced.
    setTimeout(() => {
      location.hash = newSeed();
    }, 120);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keepOpen || e.metaKey || e.ctrlKey) return;
      if (e.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        press();
      } else if (e.key === 'e') setKeepOpen(true);
      else if (e.key === 'm') setMuted(m => !m);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [press, keepOpen]);

  const { palette, font, background, button, label, seed, cursor, layout, overlay, voice, rarity } = genome;
  const hidesCursor = cursorEffectInfo(cursor)?.hidesCursor;
  const stage = {
    background: palette.bg,
    color: palette.fg,
    cursor: hidesCursor ? 'none' : cursorCss(cursor, palette),
    '--bg': palette.bg,
    '--fg': palette.fg,
    '--a1': palette.accent,
    '--a2': palette.accent2,
    '--a3': palette.accent3,
    '--font': `"${font.family}", system-ui, sans-serif`,
    '--weight': font.weight,
    '--transform': font.transform,
    '--tracking': font.tracking,
    '--italic': font.italic ? 'italic' : 'normal'
  } as CSSProperties;

  return (
    <main className={`stage${rarity === 'mythic' ? ' rarity-mythic' : ''}`} style={stage}>
      <style>{ALL_BUTTON_CSS + LAYOUT_CSS + OVERLAY_CSS + RARITY_CSS + BURST_CSS + fontVariationCss(font, '.xbtn-label')}</style>
      <Layer key={`b${seed}`} name={`background:${background.id}`} className="bg">
        <Suspense fallback={null}>
          <Background gene={background} />
        </Suspense>
      </Layer>

      <Layer key={`o${seed}`} name={`overlay:${overlay.kind}`}>
        <Overlay gene={overlay} />
      </Layer>

      <Layer key={`d${seed}`} name={`layout:${layout.kind}`}>
        <Decor items={decorFor(layout, { seed, word: label.text, count, palette, tagline: voice.tagline, hint: voice.hint })} />
      </Layer>

      {/* The whole button area takes the click, not just the inner <button>: materials (specular, pixel card, glass, …)
          draw beyond it, and press/tilt transforms can move the button out from under a mouse-up. Keyboard presses
          on the <button> produce a click that bubbles here too. */}
      <div className={`spot${rarity !== 'common' ? ' rarity-holo' : ''}`} style={{ left: `${layout.x}%`, top: `${layout.y}%` }} onClick={press}>
        <div key={`e${seed}`} className={`entrance enter-${button.entrance}`}>
        <Layer name={`button:${button.wrap}/${label.effect}`}>
          <Behaviour gene={genome.behaviour}>
          <XButton gene={button} palette={palette} onPress={noop} onHover={() => sound.current.hover(genome.sound)}>
            <Layer name={`label:${label.effect}`} fallback={<span>{label.text}</span>}>
              <Label gene={label} palette={palette} font={font} color={labelColor(button, palette)} fontPx={button.size * 16} />
            </Layer>
          </XButton>
          </Behaviour>
        </Layer>
        </div>
      </div>

      <Layer key={`c${seed}`} name={`cursor:${cursor.effect}`}>
        <CursorLayer gene={cursor} text={label.text} />
      </Layer>

      {rarity !== 'common' && <div className="rarity-badge">{RARITY_LABEL[rarity]}</div>}

      <div className="chrome">
        <button onClick={() => setMuted(m => !m)} aria-pressed={!muted} title="Sound (m)">
          {muted ? 'sound off' : 'sound on'}
        </button>
        <button onClick={() => setKeepOpen(true)} title="Keep this universe (e)">
          keep ↓
        </button>
      </div>

      <footer className="caption">
        <span className="mark">
          x<sup>y</sup>
        </span>
        <span>y = {seed}</span>
        <span className="name">{name}</span>
        <span className="meta">
          {background.id} · {font.family} · {palette.mood} · {layout.kind} · {cursor.effect === 'none' ? cursor.css : cursor.effect} · {overlay.kind} · {voice.tone} · {genome.behaviour.kind} · {genome.sound.voice} · n={count}
        </span>
      </footer>

      {keepOpen && (
        <Suspense fallback={null}>
          <ExportPanel genome={{ ...genome, name }} open={keepOpen} onClose={() => setKeepOpen(false)} />
        </Suspense>
      )}
    </main>
  );
};
