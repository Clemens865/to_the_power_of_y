// Adapted from ThreeUI Community TypographyVortexCanvas. MIT; see LICENSE.
import { useEffect, useRef } from 'react';
import { createTypographyVortexRenderer } from './typographyVortexRenderer';
import type { TypographyVortexOptions } from './types';

export default function TypographyVortex(props: TypographyVortexOptions) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const options = useRef(props);
  options.current = props;
  useEffect(() => {
    if (!host.current || !canvas.current) return;
    return createTypographyVortexRenderer(host.current, canvas.current, () => options.current);
  }, []);
  return <div ref={host} aria-hidden style={{ width: '100%', height: '100%' }}>
    <canvas ref={canvas} style={{ display: 'block', width: '100%', height: '100%' }} />
  </div>;
}
