import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
after(() => vite.close());
const { planPixelTransition, startPixelTransition } = await vite.ssrLoadModule('/src/engine/pixelTransition.ts');
const { rollTransition, rollPixelTransition } = await vite.ssrLoadModule('/src/genes/transition.ts');
const { createRng } = await vite.ssrLoadModule('/src/engine/rng.ts');
const gene = { kind: 'pixels', count: 14, duration: 0.8, easing: 'linear', sides: 4, angle: 0 };
const colors = ['#112233', '#ffaa00', '#445566'];

const installBrowser = t => {
  class Element {
    children = [];
    dataset = {};
    style = {};
    attributes = {};
    appendChild(child) { this.children.push(child); child.parent = this; return child; }
    setAttribute(name, value) { this.attributes[name] = value; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  const body = new Element();
  const listeners = new Map();
  const frames = new Map();
  let frameId = 0;
  const document = {
    body, hidden: false, createElement: () => new Element(),
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); }
  };
  const globals = {
    document, innerWidth: 1280, innerHeight: 720,
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : Reflect.deleteProperty(globalThis, key));
  }
  return {
    document, body, frames, listeners,
    advance(now) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    },
    hide() { document.hidden = true; listeners.get('visibilitychange')?.(); }
  };
};

test('pixel tile plans reproduce order, colors and timing from a seed', () => {
  const first = planPixelTransition('seed-a', gene, 1280, 720, colors);
  assert.deepEqual(first, planPixelTransition('seed-a', gene, 1280, 720, colors));
  assert.notDeepEqual(first.tiles, planPixelTransition('seed-b', gene, 1280, 720, colors).tiles);
  assert.equal(first.tiles.length, first.columns * first.rows);
  assert.equal(new Set(first.tiles.map(tile => tile.coverAt)).size, first.tiles.length);
  assert.equal(new Set(first.tiles.map(tile => tile.revealAt)).size, first.tiles.length);
  assert.ok(first.tiles.every(tile => colors.includes(tile.color) && tile.coverAt < first.coverMs && tile.revealAt < first.revealMs));
});

test('tile count and duration stay bounded across extreme viewport and gene inputs', () => {
  for (const [width, height] of [[0, 0], [1, 100000], [100000, 1], [100000, 100000], [NaN, Infinity]]) {
    const plan = planPixelTransition('bounded', { ...gene, count: Infinity, duration: NaN }, width, height, []);
    assert.ok(plan.columns >= 1 && plan.rows >= 1);
    assert.ok(plan.tiles.length <= 324);
    assert.ok(Number.isFinite(plan.coverMs + plan.holdMs + plan.revealMs));
    assert.ok(plan.tiles.every(tile => tile.color === '#111111'));
  }
});

test('optional pixel selection leaves the original transition stream unchanged', () => {
  for (let i = 0; i < 50; i++) {
    const baseline = createRng(`original-${i}`);
    const actual = createRng(`original-${i}`);
    const existing = rollTransition(actual);
    assert.deepEqual(existing, rollTransition(baseline));
    const before = { ...existing };
    const changed = rollPixelTransition(createRng(`original-${i}:pixels`), existing);
    assert.deepEqual(existing, before);
    assert.equal(actual.next(), baseline.next());
    if (changed.kind !== 'pixels') assert.equal(changed, existing);
  }
});

test('cover swaps exactly once only after every tile is opaque, then fully cleans up', async t => {
  const browser = installBrowser(t);
  let applied = 0;
  const running = startPixelTransition({ seed: 'cover', gene, colors, apply() {
    applied++;
    assert.ok(browser.body.children[0].children.every(tile => tile.style.opacity === '1'));
  } });
  const overlay = browser.body.children[0];
  assert.equal(overlay.style.pointerEvents, 'none');
  assert.equal(overlay.attributes['aria-hidden'], 'true');
  browser.advance(0);
  browser.advance(359);
  assert.equal(applied, 0);
  browser.advance(360);
  assert.equal(applied, 1);
  browser.advance(376);
  assert.ok(overlay.children.every(tile => tile.style.opacity === '1'));
  browser.advance(900);
  await running.finished;
  assert.equal(applied, 1);
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
  assert.equal(browser.listeners.size, 0);
});

test('cancellation before cover prevents stale commits and is idempotent', async t => {
  const browser = installBrowser(t);
  let applied = 0;
  const running = startPixelTransition({ seed: 'cancel', gene, colors, apply() { applied++; } });
  browser.advance(0);
  running.cancel();
  running.cancel();
  browser.advance(1000);
  await running.finished;
  assert.equal(applied, 0);
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
  assert.equal(browser.listeners.size, 0);
});

test('cancellation after a swap does not apply it again', async t => {
  const browser = installBrowser(t);
  let applied = 0;
  const running = startPixelTransition({ seed: 'cancel-covered', gene, colors, apply() { applied++; } });
  browser.advance(0);
  browser.advance(360);
  running.cancel();
  browser.advance(1000);
  await running.finished;
  assert.equal(applied, 1);
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
});

test('hiding during cover switches once and releases its frame and overlay immediately', async t => {
  const browser = installBrowser(t);
  let applied = 0;
  const running = startPixelTransition({ seed: 'hidden', gene, colors, apply() { applied++; } });
  browser.advance(0);
  browser.hide();
  browser.advance(1000);
  await running.finished;
  assert.equal(applied, 1);
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
  assert.equal(browser.listeners.size, 0);
});

test('reduced motion and initially hidden pages swap immediately without an overlay', async t => {
  const browser = installBrowser(t);
  let applied = 0;
  await startPixelTransition({ seed: 'reduced', gene, colors, reducedMotion: true, apply() { applied++; } }).finished;
  browser.document.hidden = true;
  await startPixelTransition({ seed: 'hidden', gene, colors, apply() { applied++; } }).finished;
  assert.equal(applied, 2);
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
});

test('a render failure still releases the overlay and frame', async t => {
  const browser = installBrowser(t);
  const running = startPixelTransition({ seed: 'failure', gene, colors, apply() { throw new Error('render failed'); } });
  browser.advance(0);
  assert.throws(() => browser.advance(360), /render failed/);
  await running.finished;
  assert.equal(browser.body.children.length, 0);
  assert.equal(browser.frames.size, 0);
  assert.equal(browser.listeners.size, 0);
});
