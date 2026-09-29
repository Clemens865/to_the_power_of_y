import { Component, useEffect, useRef, useState, type ReactNode } from 'react';

export interface LibrarySurfaceProps {
  backgroundColor: string;
  color1: string;
  color2: string;
  children?: ReactNode;
}

class SurfaceBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Decorative full-page layer. Pauses by releasing the renderer and all of its resources. */
export function LibrarySurface({ backgroundColor, color1, color2, children }: LibrarySurfaceProps) {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const fail = () => setFailed(true);
    el.addEventListener('xy-library-failed', fail);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    const sync = () => setActive(inView && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      sync();
    });
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    sync();
    return () => {
      el.removeEventListener('xy-library-failed', fail);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!active || failed) return;
    // Backgrounds sit behind the button and cannot receive its pointer events directly.
    // Dispatch onto the canvas so canvas listeners and their parent listeners both receive them.
    const forward = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      const el = host.current;
      const target = el?.querySelector('canvas');
      if (!el || !target || (event.target instanceof Node && el.contains(event.target))) return;
      const r = el.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
      const init = { clientX: event.clientX, clientY: event.clientY, button: event.button, buttons: event.buttons, bubbles: true };
      target.dispatchEvent(new PointerEvent(event.type, { ...init, pointerType: event.pointerType }));
      const mouseType = event.type === 'pointerdown' ? 'mousedown' : 'mousemove';
      target.dispatchEvent(new MouseEvent(mouseType, init));
    };
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      const target = host.current?.querySelector('canvas');
      target?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      target?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    };
    window.addEventListener('pointermove', forward, { passive: true });
    window.addEventListener('pointerdown', forward, { passive: true });
    window.addEventListener('pointerout', leave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', forward);
      window.removeEventListener('pointerdown', forward);
      window.removeEventListener('pointerout', leave);
    };
  }, [active, failed]);

  const fallback = <div data-library-static style={{ position: 'absolute', inset: 0, opacity: 0.38,
    background: `radial-gradient(ellipse at 25% 25%, ${color1}, transparent 65%), radial-gradient(ellipse at 80% 80%, ${color2}, transparent 60%)` }} />;
  return <div ref={host} data-library-surface data-library-failed={failed || undefined} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: backgroundColor }}>
    {active && !failed ? <SurfaceBoundary fallback={fallback}>{children}</SurfaceBoundary> : fallback}
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, ${backgroundColor}99 0%, ${backgroundColor}26 36%, transparent 70%)` }} />
  </div>;
}
