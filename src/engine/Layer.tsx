import { Component, useEffect, useRef, type ReactNode } from 'react';

// Every visual layer renders inside a Layer:
// - an error boundary, so one broken effect disappears instead of blanking the whole page;
// - on unmount, it force-releases any WebGL contexts its canvases created. Several third-party
//   effects never do this, and browsers only allow ~16 live contexts, so after enough presses
//   new effects would fail to start.
class Boundary extends Component<{ name: string; fallback?: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`[xʸ] layer "${this.props.name}" failed and was skipped:`, error);
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

const releaseWebGL = (root: HTMLElement) => {
  root.querySelectorAll('canvas').forEach(canvas => {
    // getContext returns the existing context of the same type (or null for the other type).
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
};

export const Layer = ({ name, className, fallback, children }: { name: string; className?: string; fallback?: ReactNode; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    return () => {
      // Only release once the layer has really left the page. React's StrictMode (dev) runs a
      // simulated unmount/remount first, and the remounted effect may reuse the same canvas.
      setTimeout(() => {
        if (node && !node.isConnected) releaseWebGL(node);
      }, 0);
    };
  }, []);
  return (
    <div ref={ref} className={className} style={className ? undefined : { display: 'contents' }}>
      <Boundary name={name} fallback={fallback}>
        {children}
      </Boundary>
    </div>
  );
};
