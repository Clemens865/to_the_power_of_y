import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const vite = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { middlewareMode: true, ws: false }, appType: 'custom'
});
after(() => vite.close());
const { createHoldAction, holdFillTextColor } = await vite.ssrLoadModule('/src/genes/holdButton.tsx');
const { holdKitFiles } = await vite.ssrLoadModule('/src/genes/holdKit.ts');
const point = { clientX: 150, clientY: 70 };
const pointer = { kind: 'pointer', id: 1, bounds: { left: 10, top: 10, right: 300, bottom: 130 } };
const key = key => ({ kind: 'key', key });
function fixture(onPress) {
  let now = 0, url = 'https://example.test/#a', visible = true;
  const actions = [];
  const guard = createHoldAction({
    now: () => now, url: () => url, canAct: () => visible, holdTime: () => 800,
    onPress: point => { actions.push(point); onPress?.(guard); }
  });
  return { guard, actions, advance: value => { now += value; }, navigate: () => { url = 'https://example.test/#b'; }, hide: () => { visible = false; } };
}

test('quick pointer tap commits immediately and its trailing click cannot commit again', () => {
  const f = fixture();
  assert.equal(f.guard.start(pointer, point), true);
  f.advance(110);
  assert.equal(f.guard.complete('tap'), true);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.guard.end(), 'tap');
  assert.equal(f.guard.click(point), false);
  assert.deepEqual(f.actions, [point]);
});

test('800 ms liquid fill commits exactly once even if timer and frame finish together', () => {
  const f = fixture();
  f.guard.start(pointer, point);
  f.advance(799);
  assert.equal(f.guard.complete('hold'), false);
  f.advance(1);
  assert.equal(f.guard.complete('hold'), true);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.guard.complete('tap'), false);
  f.advance(1000);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.guard.end(), 'hold');
  assert.equal(f.guard.click(point), false);
  assert.equal(f.actions.length, 1);
});

test('early partial hold returns without firing tap or hold', () => {
  const f = fixture();
  f.guard.start(pointer, point);
  f.advance(500);
  assert.equal(f.guard.complete('tap'), false);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.guard.end(), null);
  f.advance(600);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.actions.length, 0);
});

test('outside movement cancels and a late timer cannot activate the old gesture', () => {
  const f = fixture();
  f.guard.start(pointer, point);
  f.advance(200);
  assert.equal(f.guard.move(2, { clientX: 500, clientY: 80 }), false, 'unrelated pointer is ignored');
  assert.equal(f.guard.move(1, { clientX: 301, clientY: 80 }), true);
  f.advance(900);
  assert.equal(f.guard.complete('hold'), false);
  assert.equal(f.guard.current(), null);
  assert.equal(f.guard.start(pointer, point), true, 'next gesture is not stuck');
  assert.equal(f.guard.complete('hold'), false, 'old completion cannot prematurely finish a new hold');
  assert.equal(f.actions.length, 0);
});

test('cancel, hidden page and changed URL all reject delayed completion', () => {
  for (const reason of ['cancel', 'hidden', 'navigation']) {
    const f = fixture();
    f.guard.start(pointer, point);
    if (reason === 'cancel') f.guard.cancel();
    if (reason === 'hidden') f.hide();
    if (reason === 'navigation') f.navigate();
    f.advance(1000);
    assert.equal(f.guard.complete('hold'), false, reason);
    assert.equal(f.actions.length, 0, reason);
  }
});

test('Enter and Space support both short presses and held completion without duplicate clicks', () => {
  for (const name of ['Enter', ' ']) for (const duration of [80, 800]) {
    const f = fixture();
    f.guard.start(key(name), point);
    assert.equal(f.guard.start(key(name), point), false, 'key repeat cannot restart progress');
    f.advance(duration);
    assert.equal(f.guard.complete(duration === 800 ? 'hold' : 'tap'), true);
    f.guard.end();
    assert.equal(f.guard.click(point), false);
    assert.deepEqual(f.actions, [point]);
  }
});

test('accessibility click works without a pointer gesture and the control remains reusable', () => {
  const f = fixture();
  assert.equal(f.guard.click(point), true);
  assert.equal(f.guard.click(point), false);
  f.advance(100);
  assert.equal(f.guard.click(point), true);
  assert.equal(f.actions.length, 2);
});

test('callback reentry cannot duplicate a hold completion', () => {
  const f = fixture(guard => assert.equal(guard.complete('hold'), false));
  f.guard.start(pointer, point);
  f.advance(800);
  assert.equal(f.guard.complete('hold'), true);
  assert.equal(f.actions.length, 1);
});

test('fill text chooses contrast for the fill color independently of the idle ink', () => {
  assert.equal(holdFillTextColor('#ffff00'), '#000000');
  assert.equal(holdFillTextColor('#001144'), '#ffffff');
  assert.equal(holdFillTextColor('#ffffff'), '#000000');
  assert.equal(holdFillTextColor('#000000'), '#ffffff');
});

test('export includes only original adapter and styles plus the official component reference', () => {
  const files = holdKitFiles();
  assert.deepEqual(Object.keys(files), ['holdButton.tsx', 'holdButton.css']);
  assert.ok(files['holdButton.tsx'].includes("import HoldButton from './components/HoldButton/HoldButton'"));
  assert.ok(!files['holdButton.tsx'].includes('interface Motion'));
  assert.ok(!files['holdButton.css'].includes('data:image/svg+xml'));
});
