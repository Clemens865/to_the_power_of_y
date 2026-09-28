import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { grow, type Genome } from './engine/genome';
import { newSeed } from './engine/rng';
import { loadFont } from './engine/fonts';
import { SoundEngine } from './engine/sound';
import { Background } from './genes/backgrounds';
import { XButton, labelColor } from './genes/button';
import { ALL_BUTTON_CSS } from './genes/buttonCss';
import { Label } from './genes/label';
import { CursorLayer, cursorCss, cursorEffectInfo } from './genes/cursor';
import { Decor, decorFor, LAYOUT_CSS } from './genes/layout';
import { ExportPanel } from './export/ExportPanel';

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
      root.dataset.transition = next.transition;
      root.style.setProperty('--vx', `${origin.current.x}px`);
      root.style.setProperty('--vy', `${origin.current.y}px`);
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
    sound.current.press(genomeRef.current.sound);
    location.hash = newSeed();
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

  const { palette, font, background, button, label, seed, cursor, layout } = genome;
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
    <main className="stage" style={stage}>
      <style>{ALL_BUTTON_CSS + LAYOUT_CSS}</style>
      <div className="bg" aria-hidden>
        <Suspense fallback={null}>
          <Background key={seed} gene={background} />
        </Suspense>
      </div>

      <Decor key={`d${seed}`} items={decorFor(layout, { seed, word: label.text, count })} />

      <div className="spot" style={{ left: `${layout.x}%`, top: `${layout.y}%` }}>
        <XButton key={seed} gene={button} palette={palette} onPress={press} onHover={() => sound.current.hover(genome.sound)}>
          <Label gene={label} palette={palette} font={font} color={labelColor(button, palette)} fontPx={button.size * 16} />
        </XButton>
      </div>

      <CursorLayer key={`c${seed}`} gene={cursor} text={label.text} />

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
        <span className="meta">
          {background.id} · {font.family} · {palette.mood} · {layout.kind} · {cursor.effect === 'none' ? cursor.css : cursor.effect} · {genome.sound.voice} · n={count}
        </span>
      </footer>

      <ExportPanel genome={genome} open={keepOpen} onClose={() => setKeepOpen(false)} />
    </main>
  );
};
