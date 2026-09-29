import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
after(() => vite.close());
const { createHashNavigationGate } = await vite.ssrLoadModule('/src/engine/hashNavigation.ts');
const url = seed => `https://example.test/universe#${seed}`;
const change = (from, to) => ({ oldURL: url(from), newURL: url(to) });

test('a current authored hash event is accepted', () => {
  const gate = createHashNavigationGate();
  const press = gate.beginPress();
  gate.recordAuthored(url('a'), url('b'), press);
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('b')), true);
});

test('queued first-press event cannot cancel a newer press waiting for its timer', () => {
  const gate = createHashNavigationGate();
  const first = gate.beginPress();
  gate.recordAuthored(url('a'), url('b'), first);
  // The second input arrives after the first timer writes #b but before hashchange runs.
  const second = gate.beginPress();
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('b')), false);
  // The second timer remains alive and its eventual navigation is accepted.
  gate.recordAuthored(url('b'), url('c'), second);
  assert.equal(gate.acceptHashChange(change('b', 'c'), url('c')), true);
});

test('external Back navigation supersedes a pending press even with authored events queued', () => {
  const gate = createHashNavigationGate();
  const first = gate.beginPress();
  gate.recordAuthored(url('a'), url('b'), first);
  gate.beginPress();
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('a')), false);
  assert.equal(gate.acceptHashChange(change('b', 'a'), url('a')), true);
});

test('stale external hash events do not invalidate a newer intended destination', () => {
  const gate = createHashNavigationGate();
  const latest = gate.beginPress();
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('c')), false);
  gate.recordAuthored(url('c'), url('d'), latest);
  assert.equal(gate.acceptHashChange(change('c', 'd'), url('d')), true);
});

test('consumed authored events do not prevent later Forward navigation to the same URL', () => {
  const gate = createHashNavigationGate();
  const first = gate.beginPress();
  gate.recordAuthored(url('a'), url('b'), first);
  gate.beginPress();
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('b')), false);
  assert.equal(gate.acceptHashChange(change('b', 'a'), url('a')), true);
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('b')), true);
});

test('external navigation invalidates older authored intent even if it is received later', () => {
  const gate = createHashNavigationGate();
  const oldPress = gate.beginPress();
  gate.recordAuthored(url('a'), url('b'), oldPress);
  assert.equal(gate.acceptHashChange(change('b', 'c'), url('c')), true);
  assert.equal(gate.acceptHashChange(change('a', 'b'), url('b')), false);
});
