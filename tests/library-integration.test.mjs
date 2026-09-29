import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = ['typographyVortex', 'elasticMesh', 'scanner', 'slicedWaves', 'acidSquares'];
let server;
let grow;
let buildKit;
let gpu;
let samples;

before(async () => {
  server = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false }, logLevel: 'error' });
  ({ grow } = await server.ssrLoadModule('/src/engine/genome.ts'));
  ({ buildKit } = await server.ssrLoadModule('/src/export/kit.ts'));
  gpu = await Promise.all([
    ['backgrounds', 'backgroundUsesWebGL'], ['overlay', 'overlayUsesWebGL'],
    ['cursor', 'cursorUsesWebGL'], ['layout', 'layoutUsesWebGL'],
    ['button', 'buttonUsesWebGL'], ['label', 'labelUsesWebGL']
  ].map(async ([file, fn]) => (await server.ssrLoadModule(`/src/genes/${file}.tsx`))[fn]));
  samples = Array.from({ length: 1200 }, (_, i) => grow(i.toString(16).padStart(12, '0')));
});

after(async () => { await server?.close(); });

test('library rolls leave unrelated seed streams unchanged', async () => {
  const baseline = JSON.parse(await readFile(join(root, 'tests/fixtures/library-seed-baseline.json'), 'utf8'));
  for (const expected of baseline.fixtures) {
    const g = grow(expected.seed);
    const stable = Object.fromEntries(baseline.fields.map(field => [field, g[field]]));
    assert.equal(createHash('sha256').update(JSON.stringify(stable)).digest('hex'), expected.sha256, expected.seed);
  }
});

test('new effects are reachable, deterministic, and stay within the GPU budget', () => {
  const found = new Set();
  let tickets = 0;
  let pixels = 0;
  const gestures = { hold: 0, sling: 0 };
  for (const g of samples) {
    assert.deepEqual(grow(g.seed), g, `deterministic genome ${g.seed}`);
    found.add(g.background.id);
    const layers = [gpu[0](g.background.id), gpu[1](g.overlay), gpu[2](g.cursor), gpu[3](g.layout.kind), gpu[4](g.button), gpu[5](g.label.effect)];
    assert.ok(layers.filter(Boolean).length <= 2, `GPU budget for ${g.seed}`);
    if (g.button.interaction === 'tear') {
      tickets++;
      assert.equal(g.behaviour.kind, 'still', 'drag target must stay still');
    }
    if (g.button.interaction in gestures) {
      gestures[g.button.interaction]++;
      assert.equal(g.behaviour.kind, 'still');
      assert.equal(g.behaviour.amp, 0);
      assert.equal(g.layout.x, 50);
      assert.equal(g.layout.y, 50);
      assert.equal(g.label.effect, 'plain');
      assert.equal(g.button.wrap, 'none');
      assert.equal(g.button.idle, 'none');
      assert.equal(g.button.magnet, false);
      assert.equal(g.button.spark, false);
      assert.ok(g.button.size <= 2.4);
      assert.equal(gpu[4](g.button), false);
    }
    if (g.transition.kind === 'pixels') pixels++;
  }
  for (const id of ids) assert.ok(found.has(id), `missing ${id}`);
  assert.ok(tickets > 20 && tickets < 160, `ticket coverage: ${tickets}`);
  assert.equal(grow('00000000000f').button.interaction, 'tear', 'existing ticket seed stays a ticket');
  for (const [kind, count] of Object.entries(gestures)) assert.ok(count > 20 && count < 90, `${kind} coverage: ${count}`);
  assert.ok(pixels > 80 && pixels < 300, `pixel transition coverage: ${pixels}`);
  assert.equal(gpu[0]('typographyVortex'), false);
  for (const id of ids.slice(1)) assert.equal(gpu[0](id), true);
});

// Keep this test focused on the new adapters, with unrelated layers simplified.
const minimal = g => ({
  ...g,
  name: 'Export validation',
  rarity: 'common',
  label: { ...g.label, effect: 'plain' },
  button: { ...g.button, interaction: 'press', wrap: 'none', magnet: false, spark: false },
  overlay: { ...g.overlay, kind: 'none', props: {} },
  layout: { ...g.layout, kind: 'bare' },
  cursor: { ...g.cursor, effect: 'none' },
  behaviour: { ...g.behaviour, kind: 'still' },
  burst: { ...g.burst, kind: 'none' }
});

test('each new background and all three interaction buttons produce compilable, complete export kits', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'xy-kit-check-'));
  try {
    await symlink(join(root, 'node_modules'), join(folder, 'node_modules'), 'dir');
    // Our cached vendor variants add a lifecycle guard. Official registry variants do not import it.
    await mkdir(join(folder, 'genes/bg'), { recursive: true });
    await cp(join(root, 'src/genes/bg/libraryRuntime.ts'), join(folder, 'genes/bg/libraryRuntime.ts'));
    const cases = ids.map(id => minimal(samples.find(g => g.background.id === id)));
    for (const interaction of ['tear', 'hold', 'sling']) {
      const selected = samples.find(g => g.button.interaction === interaction);
      cases.push({ ...minimal(selected), button: selected.button });
    }
    for (const [index, genome] of cases.entries()) {
      const files = buildKit(genome, `https://example.test/#${genome.seed}`);
      assert.deepEqual(JSON.parse(files['recipe.json']), genome);
      assert.ok(files['Universe.tsx'].includes('onPress'));
      assert.ok(!files['Universe.tsx'].includes('not exportable'));
      const target = join(folder, `case-${index}`);
      await mkdir(target);
      for (const [name, content] of Object.entries(files)) {
        assert.ok(!name.includes('..') && !name.startsWith('/'), 'safe kit path');
        await mkdir(dirname(join(target, name)), { recursive: true });
        await writeFile(join(target, name), content);
      }
      const components = new Set(Object.values(files).flatMap(source => [...source.matchAll(/['"]\.\/components\/([A-Za-z]+)\//g)].map(m => m[1])));
      for (const component of components) {
        if (component === 'TypographyVortex') continue; // MIT implementation and license are included.
        assert.ok(files['README.md'].includes(`@react-bits/${component}-TS-CSS`), `install instructions for ${component}`);
        assert.ok(!Object.keys(files).some(path => path.startsWith(`components/${component}/`)), 'restricted vendor source stays out of kit');
        await cp(join(root, 'src/vendor/react-bits', component), join(target, 'components', component), { recursive: true });
      }
      if (genome.background.id === 'typographyVortex') {
        assert.ok(Object.entries(files).some(([name, content]) => /licen[cs]e/i.test(name) && content.includes('Meng To')), 'MIT notice accompanies Vortex source');
      }
    }
    await writeFile(join(folder, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext',
      moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true,
      skipLibCheck: true, isolatedModules: true, types: ['vite/client']
    }, include: ['case-*/**/*.ts', 'case-*/**/*.tsx'] }));
    try {
      execFileSync(join(root, 'node_modules/.bin/tsc'), ['--project', join(folder, 'tsconfig.json'), '--incremental', 'false'], { encoding: 'utf8' });
    } catch (error) {
      assert.fail(`Generated kit typecheck failed:\n${error.stdout ?? ''}\n${error.stderr ?? ''}`);
    }
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
