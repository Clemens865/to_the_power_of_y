import { Renderer, type Program } from 'ogl';

type RendererOptions = NonNullable<ConstructorParameters<typeof Renderer>[0]>;

/** Own resources as soon as they exist, including during partially completed initialization. */
export class LibraryRuntime {
  private stopped = false;
  private cleanups: Array<() => void> = [];
  private frames = new Set<number>();
  constructor(private readonly host: HTMLElement) {}

  own(cleanup: () => void) {
    if (this.stopped) cleanup();
    else this.cleanups.push(cleanup);
  }
  dispose = () => {
    if (this.stopped) return;
    this.stopped = true;
    this.frames.forEach(id => cancelAnimationFrame(id));
    this.frames.clear();
    for (const cleanup of this.cleanups.splice(0).reverse()) {
      try { cleanup(); } catch { /* Continue releasing independent resources. */ }
    }
  };
  private fail = () => {
    if (this.stopped) return;
    this.dispose();
    this.host.dispatchEvent(new CustomEvent('xy-library-failed', { bubbles: true }));
  };
  guard<T extends unknown[]>(callback: (...args: T) => void) {
    return (...args: T) => {
      if (this.stopped) return;
      try { callback(...args); } catch { this.fail(); }
    };
  }
  run(setup: () => void) { this.guard(setup)(); }
  frame(callback: FrameRequestCallback): number {
    if (this.stopped) return 0;
    const id = requestAnimationFrame(time => {
      this.frames.delete(id);
      this.guard(callback)(time);
    });
    this.frames.add(id);
    return id;
  }
  cancelFrame(id: number) {
    cancelAnimationFrame(id);
    this.frames.delete(id);
  }
  listen<E extends Event>(target: EventTarget, type: string, callback: (event: E) => void, options?: AddEventListenerOptions) {
    const guarded = this.guard(callback) as EventListener;
    this.own(() => target.removeEventListener(type, guarded, options));
    target.addEventListener(type, guarded, options);
  }
  resize(callback: ResizeObserverCallback, target: Element) {
    const observer = new ResizeObserver(this.guard(callback));
    this.own(() => observer.disconnect());
    observer.observe(target);
  }
  intersect(callback: IntersectionObserverCallback, target: Element) {
    const observer = new IntersectionObserver(this.guard(callback), { threshold: 0 });
    this.own(() => observer.disconnect());
    observer.observe(target);
  }
  renderer(options: RendererOptions): Renderer {
    const canvas = document.createElement('canvas');
    this.own(() => canvas.remove());
    const attributes: WebGLContextAttributes = {
      alpha: options.alpha ?? false, depth: options.depth ?? true, stencil: options.stencil ?? false,
      antialias: options.antialias ?? false, premultipliedAlpha: options.premultipliedAlpha ?? false,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false
    };
    // Acquire first, so constructor failures after OGL receives the context can still release it.
    const gl = canvas.getContext('webgl2', attributes)
      ?? (options.webgl === 2 ? null : canvas.getContext('webgl', attributes));
    if (!gl) throw new Error('WebGL unavailable');
    this.own(() => gl.getExtension('WEBGL_lose_context')?.loseContext());
    this.listen(canvas, 'webglcontextlost', this.fail);
    return new Renderer({ ...options, canvas });
  }
  program(program: Program) {
    this.own(() => program.remove());
    if (!program.gl.getProgramParameter(program.program, program.gl.LINK_STATUS)) {
      throw new Error('Background shader did not link');
    }
  }
}
