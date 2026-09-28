import { useEffect, useRef } from 'react';

// Ten home-made cursor effects on one 2D canvas. Small and dependency-free, so the export kit ships this file as-is.
export type TrailMode = 'comet' | 'confetti' | 'ink' | 'snake' | 'ripples' | 'letters' | 'pixels' | 'spotlight' | 'elastic' | 'lens';

export interface TrailProps {
  mode: TrailMode;
  colors: string[];
  size: number;
  text?: string;
  dark?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  ch?: string;
}

export const Trails = ({ mode, colors, size, text = 'xy', dark = '#000' }: TrailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio, 2);
    const fontFamily = getComputedStyle(canvas).getPropertyValue('--font') || 'serif';
    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const mouse = { x: innerWidth / 2, y: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2, moved: false };
    const follower = { x: mouse.x, y: mouse.y, vx: 0, vy: 0 };
    const chain = Array.from({ length: 24 }, () => ({ x: mouse.x, y: mouse.y }));
    const ink: { x: number; y: number; t: number }[] = [];
    const cells = new Map<string, number>();
    let parts: Particle[] = [];
    let charIndex = 0;
    let raf = 0;
    const pick = () => colors[Math.floor(Math.random() * colors.length)];

    const onMove = (e: PointerEvent) => {
      if (!e.isTrusted) return; // ignore events re-dispatched by the cursor layer
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.moved = true;
      const speed = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
      const spawn = (n: number, fn: () => Partial<Particle>) => {
        for (let i = 0; i < n; i++) parts.push({ x: mouse.x, y: mouse.y, vx: 0, vy: 0, life: 0, max: 40, size, color: pick(), rot: Math.random() * 6, ...fn() });
      };
      if (mode === 'comet') spawn(3, () => ({ vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, max: 30 + Math.random() * 20, size: size * (0.4 + Math.random() * 0.6) }));
      if (mode === 'confetti') spawn(2, () => ({ vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, max: 70, size: size * 0.6 }));
      if (mode === 'ripples' && speed > 4 && Math.random() < 0.35) spawn(1, () => ({ max: 50, size: 4 }));
      if (mode === 'letters' && speed > 6 && Math.random() < 0.5) {
        const chars = text.replace(/\s/g, '') || 'xy';
        spawn(1, () => ({ ch: chars[charIndex++ % chars.length], vy: -1 - Math.random() * 2, vx: (Math.random() - 0.5) * 2, max: 80, size: size * 1.6 }));
      }
      if (mode === 'ink') ink.push({ x: mouse.x, y: mouse.y, t: performance.now() });
      if (mode === 'pixels') {
        const g = Math.max(12, size * 1.5);
        cells.set(`${Math.floor(mouse.x / g)},${Math.floor(mouse.y / g)}`, 1);
      }
    };

    const frame = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const now = performance.now();

      if (mode === 'spotlight') {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, size * 4, mouse.x, mouse.y, size * 20);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, dark);
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, innerWidth, innerHeight);
        ctx.globalAlpha = 1;
      }

      if (mode === 'snake') {
        chain[0].x += (mouse.x - chain[0].x) * 0.35;
        chain[0].y += (mouse.y - chain[0].y) * 0.35;
        for (let i = 1; i < chain.length; i++) {
          chain[i].x += (chain[i - 1].x - chain[i].x) * 0.35;
          chain[i].y += (chain[i - 1].y - chain[i].y) * 0.35;
        }
        chain.forEach((c, i) => {
          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.arc(c.x, c.y, size * (1 - i / chain.length) * 0.9 + 1, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (mode === 'elastic' || mode === 'lens') {
        follower.vx = (follower.vx + (mouse.x - follower.x) * 0.12) * 0.72;
        follower.vy = (follower.vy + (mouse.y - follower.y) * 0.12) * 0.72;
        follower.x += follower.vx;
        follower.y += follower.vy;
        const v = Math.hypot(follower.vx, follower.vy);
        ctx.save();
        ctx.translate(follower.x, follower.y);
        ctx.rotate(Math.atan2(follower.vy, follower.vx));
        ctx.scale(1 + Math.min(v / 30, 0.8), 1 - Math.min(v / 60, 0.4));
        ctx.beginPath();
        ctx.arc(0, 0, mode === 'lens' ? size * 3 : size * 1.6, 0, Math.PI * 2);
        if (mode === 'lens') {
          ctx.lineWidth = 2;
          ctx.strokeStyle = colors[0];
          ctx.stroke();
        } else {
          ctx.fillStyle = colors[0];
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = colors[1] ?? colors[0];
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (mode === 'ink') {
        while (ink.length && now - ink[0].t > 900) ink.shift();
        for (let i = 1; i < ink.length; i++) {
          const a = ink[i - 1];
          const b = ink[i];
          const age = (now - b.t) / 900;
          ctx.strokeStyle = colors[0];
          ctx.globalAlpha = 1 - age;
          ctx.lineCap = 'round';
          ctx.lineWidth = size * (1 - age) * 1.4 + 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (mode === 'pixels') {
        const g = Math.max(12, size * 1.5);
        cells.forEach((a, key) => {
          const [cx, cy] = key.split(',').map(Number);
          ctx.globalAlpha = a;
          ctx.fillStyle = colors[(cx + cy) % colors.length];
          ctx.fillRect(cx * g, cy * g, g - 1, g - 1);
          a -= 0.025;
          if (a <= 0) cells.delete(key);
          else cells.set(key, a);
        });
        ctx.globalAlpha = 1;
      }

      parts = parts.filter(p => ++p.life < p.max);
      for (const p of parts) {
        const k = 1 - p.life / p.max;
        p.x += p.vx;
        p.y += p.vy;
        if (mode === 'confetti' || mode === 'letters') p.vy += 0.15;
        p.rot += 0.1;
        ctx.globalAlpha = k;
        ctx.fillStyle = ctx.strokeStyle = p.color;
        if (mode === 'ripples') {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (1 - k) * size * 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (mode === 'letters' && p.ch) {
          ctx.font = `700 ${p.size}px ${fontFamily}`;
          ctx.fillText(p.ch, p.x, p.y);
        } else if (mode === 'confetti') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    addEventListener('pointermove', onMove);
    addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', resize);
    };
  }, [mode, colors, size, text, dark]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40, mixBlendMode: mode === 'lens' ? 'difference' : 'normal' }} />;
};
