// Original xʸ adapter. The paper effect is installed separately from React Bits in exported kits.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import TearTicket from '../vendor/react-bits/TearTicket/TearTicket';
import './ticketButton.css';

export interface TicketButtonProps {
  color: string;
  background: string;
  accent: string;
  size: number;
  onPress: (point: { clientX: number; clientY: number }) => void;
  onHover?: () => void;
  children: ReactNode;
}

/** One action per click, key or completed tear; cancelled drags never become clicks. */
export default function TicketButton({ color, background, accent, size, onPress, onHover, children }: TicketButtonProps) {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [cycle, setCycle] = useState(0);
  const [activating, setActivating] = useState(false);
  const [labelScale, setLabelScale] = useState(1);
  const done = useRef(false);
  const tearReady = useRef(false);
  const cancelled = useRef(false);
  const suppressClick = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const point = useRef({ clientX: 0, clientY: 0 });
  const actionUrl = useRef(window.location.href);
  const timers = useRef<number[]>([]);
  const callback = useRef(onPress);
  callback.current = onPress;

  useEffect(() => {
    const cancelPending = () => {
      if (actionUrl.current === window.location.href) return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      cancelled.current = true;
      tearReady.current = false;
      gesture.current = null;
      suppressClick.current = false;
      done.current = false;
      setActivating(false);
      // A destination font may still be loading; retire the old ticket immediately.
      setCycle(value => value + 1);
    };
    window.addEventListener('hashchange', cancelPending);
    return () => {
      cancelled.current = true;
      timers.current.forEach(clearTimeout);
      window.removeEventListener('hashchange', cancelPending);
    };
  }, []);
  useEffect(() => {
    const el = label.current;
    if (!el) return;
    // Typography effects can draw wider than their container. Fit the measured natural width.
    const measure = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const styles = getComputedStyle(parent);
      const available = parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      setLabelScale(Math.min(1, Math.max(1, available) / Math.max(1, el.scrollWidth)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, cycle]);

  const center = () => {
    const box = root.current?.getBoundingClientRect();
    return { clientX: box ? box.left + box.width / 2 : 0, clientY: box ? box.top + box.height / 2 : 0 };
  };
  const finish = () => {
    if (done.current || cancelled.current || actionUrl.current !== window.location.href) return;
    done.current = true;
    // A kit may keep the same universe mounted. Renew its ticket after the completed action.
    timers.current.push(window.setTimeout(() => {
      done.current = false;
      suppressClick.current = false;
      setActivating(false);
      setCycle(value => value + 1);
    }, 240));
    // Register cleanup before consumers can synchronously unmount this component.
    callback.current(point.current);
  };
  const activate = () => {
    if (done.current || activating) return;
    cancelled.current = false;
    actionUrl.current = window.location.href;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else {
      setActivating(true);
      timers.current.push(window.setTimeout(finish, 180));
    }
  };
  const update = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || event.pointerId !== start.id) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.moved = true;
    point.current = { clientX: event.clientX, clientY: event.clientY };
  };
  const cancel = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    // Upstream treats cancellation like release. Reset before that handler can drop a free stub.
    event.stopPropagation();
    cancelled.current = true;
    tearReady.current = false;
    suppressClick.current = true;
    gesture.current = null;
    setCycle(value => value + 1);
  };

  return (
    <div
      ref={root}
      className={`xy-ticket${activating ? ' is-activating' : ''}`}
      style={{ '--ticket-color': color, '--ticket-accent': accent, '--ticket-font-size': `${Math.min(2.4, size)}rem` } as CSSProperties}
      onMouseEnter={onHover}
      onPointerDownCapture={event => {
        if (event.button !== 0 || gesture.current || done.current || activating) return;
        cancelled.current = false;
        actionUrl.current = window.location.href;
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        point.current = { clientX: event.clientX, clientY: event.clientY };
        // The stub owns its own capture. Capture the label so an outside release clears it too.
        if (!(event.target as Element).closest('.tear-ticket__piece--stub')) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMoveCapture={update}
      onPointerUpCapture={event => {
        update(event);
        if (gesture.current?.id !== event.pointerId) return;
        suppressClick.current = gesture.current.moved;
        gesture.current = null;
        if (tearReady.current) {
          tearReady.current = false;
          finish();
        }
      }}
      onPointerCancelCapture={cancel}
      onLostPointerCaptureCapture={cancel}
      onClickCapture={event => {
        event.preventDefault();
        event.stopPropagation();
        if ((suppressClick.current && event.detail !== 0) || event.button !== 0) return;
        point.current = event.detail === 0 ? center() : { clientX: event.clientX, clientY: event.clientY };
        activate();
      }}
      onKeyDownCapture={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        point.current = center();
        activate();
      }}
    >
      <TearTicket
        key={cycle}
        width={330}
        height={126}
        stubSize={72}
        holes={7}
        holeSize={7}
        notch={6}
        radius={10}
        roughness={1.1}
        rotate={0}
        tilt={false}
        parallax={0}
        recenter={false}
        background={background}
        stubBackground={background}
        color={color}
        borderColor={color}
        borderWidth={1.2}
        disabled={activating}
        onTear={() => {
          // Upstream reduced-motion tears finish during movement; commit only after release.
          if (gesture.current) tearReady.current = true;
          else finish();
        }}
        ariaLabel="Tear or press to change everything"
        stub={<span className="xy-ticket-stub" aria-hidden="true"><span>TEAR</span><span className="xy-ticket-arrow">↗</span><span>NEXT</span></span>}
      >
        <button type="button" className="xy-ticket-label" aria-label="Change everything" disabled={activating}>
          <span className="xy-ticket-caption" aria-hidden="true">ADMIT ONE · NEW UNIVERSE</span>
          <span ref={label} className="xbtn-label" style={{ transform: `scale(${labelScale})` }}>{children}</span>
          <span className="xy-ticket-caption" aria-hidden="true">PRESS OR TEAR TO CONTINUE</span>
        </button>
      </TearTicket>
    </div>
  );
}
