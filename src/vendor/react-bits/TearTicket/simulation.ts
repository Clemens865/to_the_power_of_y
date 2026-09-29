// Adapted from React Bits TearTicket (David Haz), revision 5d0c00e7594c898e989b250d022806961f4c8478.
// MIT + Commons Clause; see LICENSE.md. Split into modules without changing the paper simulation.
import { clamp, f, type Geometry, type Point } from './geometry';

type Phase = 'idle' | 'held' | 'free' | 'drop' | 'return';

export interface Sim {
  raf: number;
  last: number;
  phase: Phase;
  id: number | null;
  sign: number;
  hinge: Point;
  hingeV: number;
  grab: Point;
  start: Point;
  point: Point;
  a0: number;
  theta: number;
  thetaV: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  spin: number;
  pvx: number;
  pvy: number;
  pt: number;
  fade: number;
  age: number;
  bx: number;
  bv: number;
  snapped: boolean[];
  snapAt: number[];
  span: number[];
}

export interface Cfg {
  geo: Geometry;
  tearAngle: number;
  stretch: number;
  resistance: number;
  height: number;
  notch: number;
  reduce: boolean | null;
  onTear?: () => void;
  controlled: boolean;
}

const RETRACT = 0.17;

export const paintTicket = (s: Sim, c: Cfg, stubEl: HTMLDivElement | null, bodyEl: HTMLDivElement | null, fibres: (SVGPathElement | null)[], now: number): boolean => {
    if (stubEl) {
      stubEl.style.transform = `translate(${s.sx.toFixed(2)}px, ${s.sy.toFixed(2)}px) rotate(${((s.theta * s.sign * 180) / Math.PI).toFixed(3)}deg)`;
      stubEl.style.opacity = s.fade.toFixed(3);
    }
    const up = c.geo.vertical;
    if (bodyEl) bodyEl.style.transform = `translate${up ? 'Y' : 'X'}(${s.bx.toFixed(2)}px)`;
    const cos = Math.cos(s.theta * s.sign);
    const sin = Math.sin(s.theta * s.sign);
    const lx = up ? 1.6 : 0;
    const ly = up ? 0 : 1.6;
    let busy = false;
    c.geo.bridges.forEach((b, i) => {
      const dx = b.x - s.hinge.x;
      const dy = b.y - s.hinge.y;
      const tx = s.hinge.x + dx * cos - dy * sin + s.sx;
      const ty = s.hinge.y + dx * sin + dy * cos + s.sy;
      const ox = b.x + (up ? 0 : s.bx);
      const oy = b.y + (up ? s.bx : 0);
      const gx = tx - ox;
      const gy = ty - oy;
      const gap = Math.hypot(gx, gy);
      const near = fibres[i * 2];
      const far = fibres[i * 2 + 1];
      if (!near || !far) return;
      const live = s.phase !== 'idle' && !c.reduce;
      if (!s.snapped[i]) {
        if (!live || gap < 0.35) {
          near.style.opacity = '0';
          far.style.opacity = '0';
          return;
        }
        const k = clamp(gap / c.stretch, 0, 1);
        const sag = gap * 0.18;
        const w = (1.7 - 1.15 * k).toFixed(2);
        const sx = (up ? sag : 0) + gx / 2;
        const sy = (up ? 0 : sag) + gy / 2;
        near.setAttribute(
          'd',
          `M${f(ox - lx)},${f(oy - ly)}Q${f(ox - lx + sx)},${f(oy - ly + sy)} ${f(tx - lx)},${f(ty - ly)}`
        );
        far.setAttribute(
          'd',
          `M${f(ox + lx)},${f(oy + ly)}Q${f(ox + lx + gx - sx)},${f(oy + ly + gy - sy)} ${f(tx + lx)},${f(ty + ly)}`
        );
        near.style.strokeWidth = w;
        far.style.strokeWidth = w;
        near.style.opacity = '1';
        far.style.opacity = '1';
        s.span[i] = gap;
        return;
      }
      const t = (now - s.snapAt[i]) / 1000 / RETRACT;
      if (!live || t >= 1 || !s.snapAt[i]) {
        near.style.opacity = '0';
        far.style.opacity = '0';
        return;
      }
      busy = true;
      const left = (1 - t) * (1 - t);
      const len = (s.span[i] || c.stretch) * 0.5 * left;
      const ux = gap > 0.01 ? gx / gap : 1;
      const uy = gap > 0.01 ? gy / gap : 0;
      near.setAttribute('d', `M${f(ox)},${f(oy)}L${f(ox + ux * len)},${f(oy + uy * len)}`);
      far.setAttribute('d', `M${f(tx)},${f(ty)}L${f(tx - ux * len)},${f(ty - uy * len)}`);
      near.style.strokeWidth = '0.9';
      far.style.strokeWidth = '0.9';
      near.style.opacity = left.toFixed(2);
      far.style.opacity = left.toFixed(2);
    });
    return busy;
  };

