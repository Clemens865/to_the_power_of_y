import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { grow, type Genome } from './engine/genome';
import { newSeed } from './engine/rng';
import { loadFont, fontVariationCss } from './engine/fonts';
import { SoundEngine } from './engine/sound';
import { startPixelTransition, type PixelTransition } from './engine/pixelTransition';
import { createHashNavigationGate } from './engine/hashNavigation';
import { Background } from './genes/backgrounds';
import { XButton, labelColor, buttonOwnsAction } from './genes/button';
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
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hashNavigation = useRef(createHashNavigationGate());
  const cancelUniverseChange = useRef(noop);
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
    let live = true;
    let request = 0;
    let requestedSeed: string | null = null;
    let pixels: PixelTransition | undefined;
    let view: ViewTransition | undefined;
    const cancelCurrent = () => {
      request++;
      requestedSeed = null;
      pixels?.cancel();
      pixels = undefined;
      view?.skipTransition();
      view = undefined;
    };
    cancelUniverseChange.current = cancelCurrent;
    const onHash = async (event: HashChangeEvent) => {
      if (!hashNavigation.current.acceptHashChange(event, location.href)) return;
      clearTimeout(pressTimer.current);
      pressTimer.current = undefined;
      const seed = seedFromHash();
      if (seed && seed === requestedSeed) return;
      cancelCurrent();
      if (!seed || seed === genomeRef.current.seed) return;
      requestedSeed = seed;
      const version = request;
      const next = grow(seed);
      await loadFont(next.font).catch(() => undefined);
      // Font loads and native transition callbacks can finish after a newer navigation.
      if (!live || version !== request || seed !== seedFromHash()) return;
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
      let applied = false;
      const apply = () => {
        if (applied || !live || version !== request || seed !== seedFromHash()) return;
        applied = true;
        flushSync(() => {
          setGenome(next);
          setCount(c => c + 1);
        });
        if (heard.current) {
          try {
            sound.current.ambient(next.sound);
          } catch (err) {
            console.warn('[xʸ] ambient sound failed:', err);
          }
        }
      };
      try {
        if (reducedMotion()) apply();
        else if (t.kind === 'pixels') {
          const running = startPixelTransition({ seed, gene: t,
            colors: [next.palette.accent, next.palette.accent2, next.palette.accent3, next.palette.bg], apply });
          pixels = running;
          void running.finished.then(() => { if (pixels === running) pixels = undefined; });
        } else if (document.startViewTransition) {
          const running = document.startViewTransition(apply);
          view = running;
          void running.ready.catch(noop);
          void running.updateCallbackDone.catch(apply);
          void running.finished.catch(noop).then(() => { if (view === running) view = undefined; });
        } else apply();
      } catch (err) {
        // A failed transition must not strand the page on the old universe.
        console.warn('[xʸ] transition failed, switching directly:', err);
        apply();
      }
    };
    addEventListener('hashchange', onHash);
    return () => {
      live = false;
      cancelCurrent();
      cancelUniverseChange.current = noop;
      clearTimeout(pressTimer.current);
      removeEventListener('hashchange', onHash);
      document.getElementById('vt-generated')?.remove();
    };
  }, []);

  const press = useCallback((e?: { clientX: number; clientY: number }) => {
    origin.current = e && e.clientX ? { x: e.clientX, y: e.clientY } : { x: innerWidth / 2, y: innerHeight / 2 };
    heard.current = true;
    const current = genomeRef.current;
    // Schedule the new universe FIRST: sound and bursts are extras and must never be able to stop a press
    // (e.g. a browser that refuses to create audio used to swallow the click entirely).
    // A beat of delay lets the press animation register before the universe is replaced.
    const intent = hashNavigation.current.beginPress();
    clearTimeout(pressTimer.current);
    cancelUniverseChange.current();
    pressTimer.current = setTimeout(() => {
      pressTimer.current = undefined;
      const seed = newSeed();
      const oldURL = location.href;
      const nextURL = new URL(oldURL);
      nextURL.hash = seed;
      hashNavigation.current.recordAuthored(oldURL, nextURL.href, intent);
      location.hash = seed;
    }, 120);
    try {
      sound.current.press(current.sound);
    } catch (err) {
      console.warn('[xʸ] press sound failed:', err);
    }
    fireBurst(current.burst, current.palette, origin.current.x, origin.current.y).catch(err => console.warn('[xʸ] burst failed:', err));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keepOpen || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
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
      <style>{ALL_BUTTON_CSS + LAYOUT_CSS + OVERLAY_CSS + RARITY_CSS + BURST_CSS + fontVariationCss(font, '.xbtn-label, .xy-hold .hold-button__label, .xy-sling-label')}</style>
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
      <div className={`spot${rarity !== 'common' ? ' rarity-holo' : ''}`} style={{ left: `${layout.x}%`, top: `${layout.y}%` }} onClick={buttonOwnsAction(button) ? undefined : press}>
        <div key={`e${seed}`} className={`entrance enter-${button.entrance}`}>
        <Layer name={`button:${button.wrap}/${label.effect}`}>
          <Behaviour gene={genome.behaviour}>
          <XButton gene={button} palette={palette} onPress={buttonOwnsAction(button) ? press : noop} onHover={() => sound.current.hover(genome.sound)}>
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
