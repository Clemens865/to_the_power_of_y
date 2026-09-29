import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

// Execute the production event handlers with deterministic React/Motion hooks and a fake browser.
// This tests gesture decisions and resource ownership; it does not assert browser layout/animation.
const reactMock = `
const h = () => globalThis.__xySlingHarness;
export const useRef = value => h().ref(value);
export const useState = value => h().state(value);
export const useEffect = fn => h().effects.push(fn);
export const useId = () => 'sling-hint';
export const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
export const jsxs = jsx; export const jsxDEV = jsx;
export default { createElement: (type, props, ...children) => jsx(type, { ...props, children }) };
`;
const motionMock = `
import { useRef, useEffect } from 'react';
export const motion = { span: 'motion-span' };
export const useReducedMotion = () => globalThis.__xySlingHarness.reduced;
export const useMotionTemplate = (strings, ...values) => strings.join('');
export const useMotionValue = initial => useRef({ value: initial, listeners: new Set(), get() { return this.value; }, set(value) { this.value = value; this.listeners.forEach(fn => fn()); }, jump(value) { this.set(value); } }).current;
export const useMotionValueEvent = (value, event, fn) => useEffect(() => { value.listeners.add(fn); return () => value.listeners.delete(fn); });
export const animate = (value, to) => { value.set(to); return { stop() {} }; };
`;
const vite = await createServer({
  configFile: false, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error',
  ssr: { noExternal: true },
  plugins: [{ name: 'sling-hook-harness', enforce: 'pre',
    resolveId(id) {
      if (id === 'react' || id.startsWith('react/jsx-')) return '\0sling-react';
      if (id === 'motion/react') return '\0sling-motion';
    },
    load(id) { if (id === '\0sling-react') return reactMock; if (id === '\0sling-motion') return motionMock; }
  }]
});
after(() => vite.close());
const { default: Vendor } = await vite.ssrLoadModule('/src/vendor/react-bits/SlingButton/SlingButton.tsx');
const { default: Adapter } = await vite.ssrLoadModule('/src/genes/slingButton.tsx');
const { slingKitFiles } = await vite.ssrLoadModule('/src/genes/slingKit.ts');

const visit = (node, callback) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(child => visit(child, callback)); return; }
  callback(node);
  visit(node.props?.children, callback);
};
const find = (tree, predicate) => {
  let found;
  visit(tree, node => { if (!found && predicate(node)) found = node; });
  assert.ok(found, 'expected node exists');
  return found;
};
const install = (t, reduced = false) => {
  const frames = new Map(), timers = new Map(), animations = [];
  const restores = [], unmounts = [];
  let sequence = 0;
  const events = () => ({
    listeners: new Map(),
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); },
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); },
    emit(name) { this.listeners.get(name)?.forEach(fn => fn()); }
  });
  const window = { ...events(), location: { href: 'https://example.test/#a' } };
  const document = { ...events(), hidden: false };
  const globals = {
    window, document,
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const element = () => ({
    style: {}, offsetWidth: 80, getBoundingClientRect: () => ({ width: 80, height: 80, left: 100, top: 100 }),
    setAttribute() {}, setPointerCapture() {}, releasePointerCapture() {}, closest: () => true,
    animate() { const animation = { cancelled: false, cancel() { this.cancelled = true; } }; animations.push(animation); return animation; }
  });
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    restores.push(() => original ? Object.defineProperty(globalThis, key, original) : Reflect.deleteProperty(globalThis, key));
  }
  t.after(() => { unmounts.forEach(fn => fn()); restores.forEach(fn => fn()); Reflect.deleteProperty(globalThis, '__xySlingHarness'); });
  const mount = (Component, props) => {
    const slots = [], cleanups = [];
    let index = 0;
    const harness = {
      reduced, effects: [],
      ref(value) { const i = index++; return slots[i] ??= { current: value }; },
      state(value) { const i = index++; slots[i] ??= typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; }
    };
    globalThis.__xySlingHarness = harness;
    const tree = Component(props);
    visit(tree, node => {
      const ref = node.props?.ref;
      if (typeof ref === 'function') ref(element());
      else if (ref) ref.current = element();
    });
    for (const effect of harness.effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
    let mounted = true;
    const unmount = () => { if (mounted) { mounted = false; cleanups.reverse().forEach(fn => fn()); } };
    unmounts.push(unmount);
    return { tree, unmount };
  };
  const event = (x = 100, y = 100, extra = {}) => ({
    button: 0, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y,
    currentTarget: element(), target: element(), detail: 1, preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; }, ...extra
  });
  return { mount, event, frames, timers, animations, window, document,
    runTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
};
const adapterProps = onPress => ({ color: '#111', background: '#fff', accent: '#00f', size: 2, children: 'GO AGAIN', onPress });

test('vendor tap and armed pull each send once; the following native click is suppressed', t => {
  const env = install(t);
  let calls = 0;
  const { tree } = env.mount(Vendor, { particles: 0, onSend: () => calls++ });
  const button = find(tree, node => node.type === 'button').props;
  button.onPointerDown(env.event()); button.onPointerUp(env.event()); button.onClick();
  assert.equal(calls, 1);
  button.onPointerDown(env.event()); button.onPointerMove(env.event(220)); button.onPointerUp(env.event(220)); button.onClick();
  assert.equal(calls, 2);
});

test('vendor partial pull, return to origin and pointer cancellation never send', t => {
  const env = install(t);
  let calls = 0;
  const { tree } = env.mount(Vendor, { particles: 0, onSend: () => calls++ });
  const button = find(tree, node => node.type === 'button').props;
  button.onPointerDown(env.event()); button.onPointerMove(env.event(110)); button.onPointerUp(env.event(110)); button.onClick();
  button.onPointerDown(env.event()); button.onPointerMove(env.event(220)); button.onPointerUp(env.event()); button.onClick();
  button.onPointerDown(env.event()); button.onPointerMove(env.event(220)); button.onPointerCancel(env.event(220)); button.onClick();
  assert.equal(calls, 0);
});

test('vendor cancels all paint frames, feedback timers and particle animations on unmount', t => {
  const env = install(t);
  const mounted = env.mount(Vendor, { particles: 2 });
  const button = find(mounted.tree, node => node.type === 'button').props;
  button.onPointerDown(env.event()); button.onPointerMove(env.event(220)); button.onPointerUp(env.event(220));
  env.runTimers();
  assert.ok(env.animations.length > 0);
  mounted.unmount();
  assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  assert.ok(env.animations.every(animation => animation.cancelled));
});

test('reduced-motion send permits synchronous consumer unmount without scheduling orphan work', t => {
  const env = install(t, true);
  let calls = 0, mounted;
  mounted = env.mount(Vendor, { particles: 0, onSend: () => { calls++; mounted.unmount(); } });
  const button = find(mounted.tree, node => node.type === 'button').props;
  button.onPointerDown(env.event()); button.onPointerMove(env.event(220)); button.onPointerUp(env.event(220));
  assert.equal(calls, 1); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
});

test('adapter sends once per gesture, exposes readable label and maps both axes to any', t => {
  const env = install(t);
  const points = [];
  const { tree } = env.mount(Adapter, adapterProps(point => points.push(point)));
  const vendor = find(tree, node => node.type === Vendor).props;
  assert.equal(vendor.axis, 'any'); assert.equal(vendor.particles, 0);
  assert.equal(find(tree, node => node.props?.className === 'xy-sling-label').props.children, 'GO AGAIN');
  tree.props.onPointerDownCapture(env.event()); tree.props.onPointerUpCapture(env.event(220));
  vendor.onSend(); vendor.onSend();
  assert.deepEqual(points, [{ clientX: 220, clientY: 100 }]);
});

test('adapter Enter and Space prevent the global shortcut and ignore repeated keydown', t => {
  const env = install(t);
  let calls = 0;
  const { tree } = env.mount(Adapter, adapterProps(() => calls++));
  for (const key of ['Enter', ' ']) {
    const event = env.event(0, 0, { key, repeat: false });
    tree.props.onKeyDownCapture(event);
    assert.equal(event.prevented, true); assert.equal(event.stopped, true);
    tree.props.onKeyDownCapture(env.event(0, 0, { key, repeat: true }));
  }
  assert.equal(calls, 2);
});

test('adapter rejects stale callbacks after external navigation, blur, hidden state and unmount', t => {
  const env = install(t);
  let calls = 0;
  const mounted = env.mount(Adapter, adapterProps(() => calls++));
  const vendor = find(mounted.tree, node => node.type === Vendor).props;
  const begin = () => mounted.tree.props.onPointerDownCapture(env.event());
  begin(); env.window.location.href = 'https://example.test/#b'; env.window.emit('hashchange'); vendor.onSend();
  begin(); env.window.emit('blur'); vendor.onSend();
  begin(); env.document.hidden = true; env.document.emit('visibilitychange'); vendor.onSend();
  mounted.unmount(); vendor.onSend();
  assert.equal(calls, 0);
  assert.ok([...env.window.listeners.values(), ...env.document.listeners.values()].every(set => set.size === 0));
});

test('old queued hashchange does not cancel a gesture that started at the current URL', t => {
  const env = install(t);
  let calls = 0;
  const { tree } = env.mount(Adapter, adapterProps(() => calls++));
  env.window.location.href = 'https://example.test/#b';
  tree.props.onPointerDownCapture(env.event()); env.window.emit('hashchange');
  find(tree, node => node.type === Vendor).props.onSend();
  assert.equal(calls, 1);
});

test('kit ships the original adapter and stylesheet and requires the official component import', () => {
  const files = slingKitFiles();
  assert.deepEqual(Object.keys(files).sort(), ['slingButton.css', 'slingButton.tsx']);
  assert.ok(files['slingButton.tsx'].includes("'./components/SlingButton/SlingButton'"));
  assert.ok(!files['slingButton.tsx'].includes('../vendor/'));
  assert.ok(!files['slingButton.tsx'].includes('Hugeicons'));
});
