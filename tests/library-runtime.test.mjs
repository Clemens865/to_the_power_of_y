import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Run with: node --test tests/library-runtime.test.mjs
// These injected failures exercise disposal without requiring a GPU or browser.
test('library renderer lifecycle survives initialization and animation failures', async t => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, ws: false },
    appType: 'custom'
  });
  const globalNames = ['requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'document'];
  const original = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    const { LibraryRuntime } = await server.ssrLoadModule('/src/genes/bg/libraryRuntime.ts');
    let nextFrame = 1;
    const frames = new Map();
    let disconnected = 0;
    globalThis.requestAnimationFrame = callback => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() { disconnected++; }
    };
    globalThis.IntersectionObserver = class {
      observe() {}
      disconnect() { disconnected++; }
    };
    const check = (name, run) => { run(); t.diagnostic(name); };
    const trackedHost = () => {
      const host = new EventTarget();
      let failures = 0;
      host.addEventListener('xy-library-failed', () => failures++);
      return { host, failures: () => failures };
    };

    check('partial setup releases observers, listeners, resources, and pending frames once', () => {
      const { host, failures } = trackedHost();
      const target = new EventTarget();
      const runtime = new LibraryRuntime(host);
      let resources = 0;
      let events = 0;
      const beforeDisconnected = disconnected;
      runtime.run(() => {
        runtime.own(() => resources++);
        runtime.own(() => { throw new Error('One disposer must not prevent the others'); });
        runtime.resize(() => {}, host);
        runtime.intersect(() => {}, host);
        runtime.listen(target, 'test', () => events++);
        runtime.frame(() => {});
        throw new Error('Initialization failed after allocation');
      });
      assert.equal(resources, 1);
      assert.equal(disconnected - beforeDisconnected, 2);
      assert.equal(frames.size, 0);
      assert.equal(failures(), 1);
      target.dispatchEvent(new Event('test'));
      assert.equal(events, 0);
      runtime.dispose();
      assert.equal(resources, 1, 'unmount disposal must be idempotent');
    });

    check('render failure cancels a queued successor and prevents restarting', () => {
      const { host, failures } = trackedHost();
      const runtime = new LibraryRuntime(host);
      let attempts = 0;
      runtime.run(() => runtime.frame(() => {
        attempts++;
        runtime.frame(() => attempts++);
        throw new Error('Rendering failed');
      }));
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback(16);
      assert.equal(attempts, 1);
      assert.equal(frames.size, 0);
      assert.equal(failures(), 1);
      assert.equal(runtime.frame(() => attempts++), 0);
      runtime.guard(() => attempts++)();
      assert.equal(attempts, 1, 'late callbacks must not touch disposed resources');
    });

    check('OGL constructor failure releases its previously acquired context and canvas', () => {
      const { host, failures } = trackedHost();
      let lost = 0;
      let removed = 0;
      class Canvas extends EventTarget {
        style = {};
        remove() { removed++; }
        getContext() { return this.gl; }
        gl = {
          canvas: this,
          getExtension: name => name === 'WEBGL_lose_context' ? { loseContext() { lost++; } } : null,
          getParameter() { throw new Error('OGL constructor failed after receiving the context'); }
        };
      }
      globalThis.document = { createElement: () => new Canvas() };
      const runtime = new LibraryRuntime(host);
      runtime.run(() => runtime.renderer({ webgl: 2 }));
      assert.equal(lost, 1);
      assert.equal(removed, 1);
      assert.equal(failures(), 1);
    });

    check('an unlinked shader program is released and signals the static fallback', () => {
      const { host, failures } = trackedHost();
      const runtime = new LibraryRuntime(host);
      let removed = 0;
      runtime.run(() => runtime.program({
        remove() { removed++; },
        program: {},
        gl: { getProgramParameter: () => false, LINK_STATUS: 1 }
      }));
      assert.equal(removed, 1);
      assert.equal(failures(), 1);
    });
  } finally {
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    await server.close();
  }
});
