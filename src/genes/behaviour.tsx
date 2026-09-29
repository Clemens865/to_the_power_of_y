import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Rng } from '../engine/rng';

// Behaviour gene: how the button moves around its spot. Motion is transform-only on the wrapper
// (the spot around it keeps its translate(-50%,-50%)), so nothing here triggers layout.
// drift/orbit/bob are a tiny rAF loop; dodge reacts to the pointer; gravity lazy-loads matter-js
// only for its drop and stops stepping once the button has settled.

export interface BehaviourGene {
  kind: string;
  amp: number; // vmin for drift/orbit/bob/dodge, vh drop height for gravity
  period: number; // seconds per cycle (drift/orbit/bob), restitution*10 for gravity
  phase: number; // 0..1
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const rollBehaviour = (rng: Rng): BehaviourGene => {
  const roll = rng.next();
  const phase = r2(rng.next());
  if (roll < 0.55) return { kind: 'still', amp: 0, period: 0, phase };
  if (roll < 0.67) return { kind: 'drift', amp: r2(rng.range(3, 6)), period: r2(rng.range(14, 26)), phase };
  if (roll < 0.76) return { kind: 'orbit', amp: r2(rng.range(2, 5)), period: r2(rng.range(10, 20)), phase };
  if (roll < 0.86) return { kind: 'bob', amp: r2(rng.range(0.8, 2)), period: r2(rng.range(3, 6)), phase };
  if (roll < 0.93) return { kind: 'dodge', amp: r2(rng.range(5, 9)), period: 0, phase };
  return { kind: 'gravity', amp: r2(rng.range(30, 60)), period: r2(rng.range(4, 6.5)), phase };
};

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

// Offset (vmin) and rotation (deg) of the looping kinds at time t (seconds).
const loopPose = (g: BehaviourGene, t: number): [number, number, number] => {
  const a = TAU * (t / g.period + g.phase);
  if (g.kind === 'drift') return [g.amp * Math.sin(a), g.amp * 0.8 * Math.sin(a * 1.37 + 1.1), 0];
  if (g.kind === 'orbit') return [g.amp * Math.cos(a), g.amp * Math.sin(a), 0];
  return [0, g.amp * Math.sin(a), g.amp * 0.9 * Math.sin(a * 0.5 + 0.7)]; // bob
};

const startLoop = (el: HTMLElement, g: BehaviourGene) => {
  let raf = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    const [x, y, rot] = loopPose(g, (now - t0) / 1000);
    el.style.transform = `translate(${x.toFixed(3)}vmin, ${y.toFixed(3)}vmin) rotate(${rot.toFixed(2)}deg)`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick); // rAF itself pauses while the tab is hidden
  return () => cancelAnimationFrame(raf);
};

// Dodge: slide away from an approaching mouse once, then stay put to be pressed (more read as "broken").
// Never dodges touch/pen, a pointer already over the button, or keyboard use.
const startDodge = (el: HTMLElement, g: BehaviourGene) => {
  let dodges = 0;
  let x = 0;
  let y = 0;
  let cooldown = 0;
  el.style.transition = 'transform 0.35s cubic-bezier(.2,.9,.3,1.2)';
  const onMove = (e: PointerEvent) => {
    if (dodges >= 1 || e.pointerType !== 'mouse' || performance.now() < cooldown) return;
    const r = el.getBoundingClientRect(); // includes the current offset
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - e.clientX;
    const dy = cy - e.clientY;
    const over = Math.abs(dx) < r.width / 2 && Math.abs(dy) < r.height / 2;
    const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) / 2 + 60;
    if (over || !near) return;
    const len = Math.hypot(dx, dy) || 1;
    const step = (g.amp * Math.min(innerWidth, innerHeight)) / 100;
    // Keep the whole button on screen.
    const nx = Math.min(Math.max((dx / len) * step, 8 - r.left), innerWidth - 8 - r.right);
    const ny = Math.min(Math.max((dy / len) * step, 8 - r.top), innerHeight - 8 - r.bottom);
    x += nx;
    y += ny;
    dodges++;
    cooldown = performance.now() + 450;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  addEventListener('pointermove', onMove, { passive: true });
  return () => removeEventListener('pointermove', onMove);
};

type MatterModule = typeof import('matter-js');

// Gravity: drop from above onto a floor at the spot, bounce, settle, stop.
const startGravity = (el: HTMLElement, g: BehaviourGene) => {
  let raf = 0;
  let gone = false;
  let kick: (() => void) | null = null;
  const drop = (g.amp * innerHeight) / 100;
  el.style.transform = `translateY(${-drop}px)`;
  void import('matter-js')
    .then(mod => {
      if (gone) return;
      const Matter = ((mod as unknown as { default?: MatterModule }).default ?? mod) as MatterModule;
      const { Engine, Bodies, Body, Composite } = Matter;
      const w = Math.max(el.offsetWidth, 10);
      const h = Math.max(el.offsetHeight, 10);
      const engine = Engine.create({ gravity: { x: 0, y: 1.6 } });
      // Rest position: body centre at (0, 0); the floor's top edge sits at the button's bottom.
      const body = Bodies.rectangle(0, -drop, w, h, { restitution: g.period / 10, friction: 0.8, chamfer: { radius: Math.min(w, h) / 4 } });
      const floor = Bodies.rectangle(0, h / 2 + 50, w * 20, 100, { isStatic: true });
      Composite.add(engine.world, [body, floor]);
      Body.setAngularVelocity(body, (g.phase - 0.5) * 0.04);
      let calm = 0;
      const step = () => {
        Engine.update(engine, 1000 / 60);
        const { x, y } = body.position;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${body.angle.toFixed(4)}rad)`;
        calm = body.speed < 0.05 && Math.abs(body.angularSpeed) < 0.002 ? calm + 1 : 0;
        if (calm > 20 || body.position.y > h * 3) {
          raf = 0; // settled: stop stepping and snap exactly home
          el.style.transition = 'transform 0.25s ease-out';
          el.style.transform = '';
          Body.setPosition(body, { x: 0, y: 0 });
          Body.setAngle(body, 0);
          return;
        }
        raf = requestAnimationFrame(step);
      };
      kick = () => {
        el.style.transition = '';
        Body.setVelocity(body, { x: 0, y: -7 });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
        calm = 0;
        if (!raf) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    })
    .catch(() => {
      el.style.transform = '';
    });
  return {
    kick: () => kick?.(),
    stop: () => {
      gone = true;
      cancelAnimationFrame(raf);
    }
  };
};

export const Behaviour = ({ gene, children }: { gene: BehaviourGene; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const kickRef = useRef<() => void>(() => {});
  const still = gene.kind === 'still' || reducedMotion();
  // Layout effect: gravity must lift the button before the first paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    el.style.transform = '';
    el.style.transition = '';
    if (gene.kind === 'dodge') return startDodge(el, gene);
    if (gene.kind === 'gravity') {
      const g = startGravity(el, gene);
      kickRef.current = g.kick;
      return () => {
        g.stop();
        kickRef.current = () => {};
      };
    }
    return startLoop(el, gene);
  }, [gene, still]);
  if (still) return <>{children}</>;
  // preserve-3d keeps the spot's perspective working for 3D press effects (tilt) inside.
  return (
    <div ref={ref} className="xy-behaviour" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }} onClickCapture={() => kickRef.current()}>
      {children}
    </div>
  );
};

// ---- export kit -------------------------------------------------------------------------------
// A standalone Behaviour.tsx with this universe's gene baked in (deps: react; matter-js for gravity).

const KIT_LOOP = (g: BehaviourGene) => `    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const a = ${TAU} * ((now - t0) / 1000 / ${g.period} + ${g.phase});
      ${
        g.kind === 'drift'
          ? `const [x, y, rot] = [${g.amp} * Math.sin(a), ${r2(g.amp * 0.8)} * Math.sin(a * 1.37 + 1.1), 0];`
          : g.kind === 'orbit'
            ? `const [x, y, rot] = [${g.amp} * Math.cos(a), ${g.amp} * Math.sin(a), 0];`
            : `const [x, y, rot] = [0, ${g.amp} * Math.sin(a), ${r2(g.amp * 0.9)} * Math.sin(a * 0.5 + 0.7)];`
      }
      el.style.transform = \`translate(\${x.toFixed(3)}vmin, \${y.toFixed(3)}vmin) rotate(\${rot.toFixed(2)}deg)\`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);`;

const KIT_DODGE = (g: BehaviourGene) => `    // Slides away from an approaching mouse once, then stays put to be pressed.
    let dodges = 0, x = 0, y = 0, cooldown = 0;
    el.style.transition = 'transform 0.35s cubic-bezier(.2,.9,.3,1.2)';
    const onMove = (e: PointerEvent) => {
      if (dodges >= 1 || e.pointerType !== 'mouse' || performance.now() < cooldown) return;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      const over = Math.abs(dx) < r.width / 2 && Math.abs(dy) < r.height / 2;
      if (over || Math.hypot(dx, dy) > Math.max(r.width, r.height) / 2 + 60) return;
      const len = Math.hypot(dx, dy) || 1;
      const step = (${g.amp} * Math.min(innerWidth, innerHeight)) / 100;
      x += Math.min(Math.max((dx / len) * step, 8 - r.left), innerWidth - 8 - r.right);
      y += Math.min(Math.max((dy / len) * step, 8 - r.top), innerHeight - 8 - r.bottom);
      dodges++;
      cooldown = performance.now() + 450;
      el.style.transform = \`translate(\${x.toFixed(1)}px, \${y.toFixed(1)}px)\`;
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);`;

const KIT_GRAVITY = (g: BehaviourGene) => `    // Drops from above onto a floor at its spot, bounces, settles, then stops the simulation.
    const drop = (${g.amp} * innerHeight) / 100;
    const w = Math.max(el.offsetWidth, 10), h = Math.max(el.offsetHeight, 10);
    const engine = Engine.create({ gravity: { x: 0, y: 1.6 } });
    const body = Bodies.rectangle(0, -drop, w, h, { restitution: ${r2(g.period / 10)}, friction: 0.8, chamfer: { radius: Math.min(w, h) / 4 } });
    Composite.add(engine.world, [body, Bodies.rectangle(0, h / 2 + 50, w * 20, 100, { isStatic: true })]);
    Body.setAngularVelocity(body, ${r2((g.phase - 0.5) * 0.04)});
    let raf = 0, calm = 0;
    const step = () => {
      Engine.update(engine, 1000 / 60);
      el.style.transform = \`translate(\${body.position.x.toFixed(2)}px, \${body.position.y.toFixed(2)}px) rotate(\${body.angle.toFixed(4)}rad)\`;
      calm = body.speed < 0.05 && Math.abs(body.angularSpeed) < 0.002 ? calm + 1 : 0;
      if (calm > 20 || body.position.y > h * 3) {
        raf = 0;
        el.style.transition = 'transform 0.25s ease-out';
        el.style.transform = '';
        Body.setPosition(body, { x: 0, y: 0 });
        Body.setAngle(body, 0);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    kick.current = () => {
      el.style.transition = '';
      Body.setVelocity(body, { x: 0, y: -7 });
      calm = 0;
      if (!raf) raf = requestAnimationFrame(step);
    };
    el.style.transform = \`translateY(\${-drop}px)\`;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);`;

export const behaviourKit = (gene: BehaviourGene): { jsx: (inner: string) => string; source: string | null; install: string[] } => {
  if (gene.kind === 'still') return { jsx: inner => inner, source: null, install: [] };
  const gravity = gene.kind === 'gravity';
  const body = gene.kind === 'dodge' ? KIT_DODGE(gene) : gravity ? KIT_GRAVITY(gene) : KIT_LOOP(gene);
  const source = `// xʸ button behaviour: ${gene.kind}. Transform-only motion on a wrapper around the button.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
${gravity ? "import { Engine, Bodies, Body, Composite } from 'matter-js';\n" : ''}
export function Behaviour({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  ${gravity ? 'const kick = useRef<() => void>(() => {});\n  ' : ''}useLayoutEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
${body}
  }, []);
  return (
    <div ref={ref} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}${gravity ? ' onClickCapture={() => kick.current()}' : ''}>
      {children}
    </div>
  );
}
`;
  return {
    jsx: inner => `<Behaviour>\n  ${inner}\n</Behaviour>`,
    source,
    install: gravity ? ['npm i matter-js', 'npm i -D @types/matter-js'] : []
  };
};
