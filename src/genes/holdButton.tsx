// Original xʸ interaction adapter. React Bits HoldButton is installed separately in exported kits.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import HoldButton from '../vendor/react-bits/HoldButton/HoldButton';
import './holdButton.css';

type Point = { clientX: number; clientY: number };
type Bounds = { left: number; right: number; top: number; bottom: number };
type Input = { kind: 'pointer'; id: number; bounds: Bounds } | { kind: 'key'; key: string };
type HoldActionOptions = {
  now: () => number; url: () => string; canAct: () => boolean;
  holdTime: () => number; onPress: (point: Point) => void;
};

/** Shared by pointer, keyboard and accessibility activation; no timers or DOM dependencies. */
export function createHoldAction(options: HoldActionOptions) {
  let active: { input: Input; point: Point; url: string; started: number; outcome: 'tap' | 'hold' | null } | null = null;
  let ignoreClickUntil = 0;
  const cancel = () => { active = null; ignoreClickUntil = options.now() + 80; };
  return {
    current: () => active,
    start(input: Input, point: Point) {
      if (active || !options.canAct()) return false;
      active = { input, point: { clientX: point.clientX, clientY: point.clientY }, url: options.url(), started: options.now(), outcome: null };
      return true;
    },
    move(id: number, point: Point) {
      if (active?.input.kind !== 'pointer' || active.input.id !== id) return false;
      active.point = { clientX: point.clientX, clientY: point.clientY };
      const r = active.input.bounds;
      if (point.clientX < r.left || point.clientX > r.right || point.clientY < r.top || point.clientY > r.bottom) {
        cancel();
        return true;
      }
      return false;
    },
    complete(outcome: 'tap' | 'hold') {
      if (!active || active.outcome || active.url !== options.url() || !options.canAct()) return false;
      const elapsed = options.now() - active.started;
      if (outcome === 'tap' ? elapsed >= 250 : elapsed < options.holdTime()) return false;
      active.outcome = outcome; // Guard before consumers can synchronously re-enter or unmount.
      options.onPress({ ...active.point });
      return true;
    },
    end() {
      const outcome = active?.outcome ?? null;
      cancel(); // Suppress the click browsers may synthesize immediately after release.
      return outcome;
    },
    click(point: Point) {
      if (active || options.now() < ignoreClickUntil || !options.canAct()) return false;
      ignoreClickUntil = options.now() + 80;
      options.onPress(point);
      return true;
    },
    cancel
  };
}

export const holdFillTextColor = (color: string) => {
  const n = parseInt(color.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
};

export interface HoldActionButtonProps {
  color: string;
  background: string;
  accent: string;
  size: number;
  direction?: 'right' | 'up';
  holdTime?: number;
  onPress: (point: Point) => void;
  onHover?: () => void;
  children: ReactNode;
}

/** Pass a plain label: upstream draws three copies to keep the liquid's text legible. */
export default function HoldActionButton({ color, background, accent, size, direction = 'up', holdTime = 800, onPress, onHover, children }: HoldActionButtonProps) {
  const duration = Number.isFinite(holdTime) ? Math.max(250, Math.min(3000, holdTime)) : 800;
  const root = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);
  const focusAfterReset = useRef(false);
  const releasingPointer = useRef<number | null>(null);
  const props = useRef({ onPress, duration });
  props.current = { onPress, duration };
  const action = useRef<ReturnType<typeof createHoldAction> | null>(null);
  if (!action.current) action.current = createHoldAction({
    now: () => performance.now(), url: () => window.location.href,
    canAct: () => !document.hidden, holdTime: () => props.current.duration,
    onPress: point => props.current.onPress(point)
  });
  const guard = action.current;
  const reset = (preserveFocus = false) => {
    focusAfterReset.current = preserveFocus && !!root.current?.contains(document.activeElement);
    setCycle(value => value + 1);
  };
  const cancel = () => { guard.cancel(); releasingPointer.current = null; reset(); };
  const end = () => { if (guard.end() === 'hold') reset(true); };
  const center = (): Point => {
    const rect = root.current?.getBoundingClientRect();
    return { clientX: rect ? rect.left + rect.width / 2 : 0, clientY: rect ? rect.top + rect.height / 2 : 0 };
  };
  const ownsPointer = (id: number) => {
    const input = guard.current()?.input;
    return input?.kind === 'pointer' && input.id === id;
  };
  const ownsKey = (key: string) => {
    const input = guard.current()?.input;
    return input?.kind === 'key' && input.key === key;
  };

  useLayoutEffect(() => {
    if (focusAfterReset.current) root.current?.querySelector('button')?.focus({ preventScroll: true });
    focusAfterReset.current = false;
  }, [cycle]);
  useEffect(() => {
    const onBlur = () => cancel();
    const onVisibility = () => { if (document.hidden) cancel(); };
    const onNavigation = () => { if (guard.current()?.url !== window.location.href) cancel(); };
    window.addEventListener('blur', onBlur);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('popstate', onNavigation);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      guard.cancel();
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('hashchange', onNavigation);
      window.removeEventListener('popstate', onNavigation);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [guard]);

  return <div
    ref={root}
    className="xy-hold"
    style={{ '--hold-size': `${Math.max(1, Math.min(2.4, size))}rem` } as CSSProperties}
    onMouseEnter={onHover}
    onPointerDownCapture={event => {
      if (event.button !== 0 || !event.isPrimary) return;
      const rect = root.current?.querySelector('button')?.getBoundingClientRect();
      if (!rect) return;
      if (!guard.start({ kind: 'pointer', id: event.pointerId, bounds: rect }, event)) {
        event.preventDefault(); event.stopPropagation();
      }
    }}
    onPointerMoveCapture={event => {
      if (guard.move(event.pointerId, event)) { event.stopPropagation(); reset(); }
    }}
    onPointerUpCapture={event => {
      if (ownsPointer(event.pointerId)) releasingPointer.current = event.pointerId;
      if (guard.move(event.pointerId, event)) { event.stopPropagation(); reset(); }
    }}
    onPointerUp={event => { if (ownsPointer(event.pointerId)) end(); releasingPointer.current = null; }}
    onPointerCancelCapture={event => {
      if (ownsPointer(event.pointerId)) { event.stopPropagation(); cancel(); }
    }}
    onLostPointerCaptureCapture={event => {
      if (ownsPointer(event.pointerId) && releasingPointer.current !== event.pointerId) { event.stopPropagation(); cancel(); }
    }}
    onBlurCapture={event => {
      if (guard.current() && !event.currentTarget.contains(event.relatedTarget)) cancel();
    }}
    onKeyDownCapture={event => {
      if (event.key === 'Escape' && guard.current()) {
        event.preventDefault(); event.stopPropagation(); cancel(); return;
      }
      if (event.key !== ' ' && event.key !== 'Enter') return;
      if (event.repeat || !guard.start({ kind: 'key', key: event.key }, center())) {
        event.preventDefault(); event.stopPropagation();
      }
    }}
    onKeyDown={event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); }
    }}
    onKeyUpCapture={event => {
      if ((event.key === ' ' || event.key === 'Enter') && !ownsKey(event.key)) {
        event.preventDefault(); event.stopPropagation();
      }
    }}
    onKeyUp={event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (ownsKey(event.key)) end(); }
    }}
    onClickCapture={event => {
      event.preventDefault(); event.stopPropagation();
      // Pointer/key actions were committed by onTap or onHold, before their trailing click.
      if (event.detail === 0) guard.click(center());
    }}
  >
    <HoldButton key={cycle}
      backgroundColor={background} fillColor={accent} textColor={color} fillTextColor={holdFillTextColor(accent)}
      size="lg" radius={20} fillDirection={direction} holdTime={duration} releaseTime={160}
      pressScale={0.98} waveAmplitude={8} glow={false} resetAfter={0}
      doneLabel="✓" onHold={() => guard.complete('hold')} onTap={() => guard.complete('tap')}
    >{children}</HoldButton>
    <span className="xy-hold-hint" aria-hidden="true">PRESS · OR HOLD TO FILL</span>
  </div>;
}
