// Original xʸ adapter. Exported kits install the React Bits effect separately.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import SlingButton from '../vendor/react-bits/SlingButton/SlingButton';
import './slingButton.css';

export interface SlingButtonProps {
  color: string;
  background: string;
  accent: string;
  size: number;
  axis?: 'both' | 'horizontal' | 'vertical';
  onPress: (point: { clientX: number; clientY: number }) => void;
  onHover?: () => void;
  children: ReactNode;
}

export default function UniverseSlingButton({ color, background, accent, size, axis = 'both', onPress, onHover, children }: SlingButtonProps) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef(true);
  const done = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const actionURL = useRef(window.location.href);
  const point = useRef({ clientX: 0, clientY: 0 });
  const callback = useRef(onPress);
  callback.current = onPress;
  const [cycle, setCycle] = useState(0);
  const cancel = () => {
    done.current = true;
    pointer.current = null;
    if (live.current) setCycle(value => value + 1);
  };
  useEffect(() => {
    live.current = true;
    const onHash = () => { if (actionURL.current !== window.location.href) cancel(); };
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live.current = false;
      done.current = true;
      window.removeEventListener('blur', cancel);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  const begin = () => {
    done.current = false;
    actionURL.current = window.location.href;
  };
  const center = () => {
    const box = root.current?.getBoundingClientRect();
    point.current = { clientX: box ? box.left + box.width / 2 : 0, clientY: box ? box.top + box.height / 2 : 0 };
  };
  const send = () => {
    if (!live.current || done.current || actionURL.current !== window.location.href) return;
    done.current = true;
    callback.current(point.current);
  };
  const label = typeof children === 'string' ? children : 'Change everything';

  return (
    <div
      ref={root}
      className="xy-sling"
      style={{ '--sling-ink': color, '--sling-paper': background, '--sling-label-size': `${Math.min(2.4, size)}rem` } as CSSProperties}
      onMouseEnter={onHover}
      onPointerDownCapture={event => {
        if (event.button !== 0 || pointer.current !== null || !(event.target as Element).closest('.sling-button__pad')) return;
        begin();
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        point.current = { clientX: event.clientX, clientY: event.clientY };
      }}
      onPointerMoveCapture={event => {
        const start = pointer.current;
        if (event.pointerId !== start?.id) return;
        start.moved ||= Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6;
        point.current = { clientX: event.clientX, clientY: event.clientY };
      }}
      onPointerUpCapture={event => {
        const start = pointer.current;
        if (event.pointerId !== start?.id) return;
        point.current = { clientX: event.clientX, clientY: event.clientY };
        // Pulling back to the starting point cancels, including with an unpatched official install.
        if (start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
          event.stopPropagation(); cancel(); return;
        }
        pointer.current = null;
      }}
      onPointerCancelCapture={event => { event.stopPropagation(); cancel(); }}
      onLostPointerCaptureCapture={event => {
        if (pointer.current?.id === event.pointerId) { event.stopPropagation(); cancel(); }
      }}
      onClickCapture={event => {
        // Assistive/programmatic clicks have no preceding pointer release.
        if (event.detail !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        begin(); center(); send();
      }}
      onClick={event => event.stopPropagation()}
      onKeyDownCapture={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); return; }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        // A keyboard activation replaces any in-progress pull and bypasses stale vendor click suppression.
        cancel(); begin(); center(); send();
      }}
    >
      <SlingButton key={cycle} onSend={send} padColor={background} iconColor={color} accentColor={accent}
        wellColor={`color-mix(in srgb, ${background} 24%, transparent)`} bandColor={accent}
        size={Math.max(64, Math.min(88, size * 36))} armAt={42} maxPull={112} particles={0}
        axis={axis === 'both' ? 'any' : axis} tapSends ariaLabel={`${label}: press, or pull and release`}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20V4m-7 7 7-7 7 7" />
        </svg>
      </SlingButton>
      <span className="xy-sling-label" aria-hidden="true">{children}</span>
      <span className="xy-sling-hint" aria-hidden="true">PULL & RELEASE · OR PRESS</span>
    </div>
  );
}
