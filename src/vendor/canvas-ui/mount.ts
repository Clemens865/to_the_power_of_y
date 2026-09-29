// xʸ glue for the vendored Canvas UI effects (MIT + Commons Clause, see ./LICENSE.md).
// Site-only: nothing in this folder may be copied into an export kit.
//
// The effects are written to post-process captured HTML ("html-in-canvas", behind an experimental
// Chrome flag). We always run them in their fallback mode (uHasContent = 0), where each one draws
// only its own layer over a transparent canvas. A fake source canvas without a 2D context forces
// that mode even in browsers that ship the flag.
//
// Each effect is its own dynamic import, so nothing here lands in the initial bundle.

export type CanvasUiKind = 'frost' | 'droplets' | 'glyphrain' | 'clouds' | 'blaze' | 'bubble';

interface Elements {
  source: HTMLCanvasElement;
  content: HTMLElement;
  output: HTMLCanvasElement;
}
type Factory = (elements: Elements, options: Record<string, unknown>) => { destroy: () => void } | null;

const LOADERS: Record<CanvasUiKind, () => Promise<Factory>> = {
  frost: () => import('./Frost/FrostVanilla').then(m => m.createFrost as unknown as Factory),
  droplets: () => import('./Droplets/DropletsVanilla').then(m => m.createDroplets as unknown as Factory),
  glyphrain: () => import('./GlyphRain/GlyphRainVanilla').then(m => m.createGlyphRain as unknown as Factory),
  clouds: () => import('./Clouds/CloudsVanilla').then(m => m.createClouds as unknown as Factory),
  blaze: () => import('./Blaze/BlazeVanilla').then(m => m.createBlaze as unknown as Factory),
  bubble: () => import('./Bubble/BubbleVanilla').then(m => m.createBubble as unknown as Factory)
};

export interface MountOptions {
  /** Send a synthetic pointerleave after the pointer has rested this long (ms). 0 = only when it leaves the window. */
  idleLeaveMs?: number;
}

const FILL = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

/**
 * Mount a Canvas UI effect into `host` (which should be positioned and pointer-events:none).
 * The effects listen for pointer events on their own elements, so real window pointer events are
 * re-dispatched into them. Returns a cleanup function; safe to call before the effect has loaded.
 */
export const mountCanvasUi = (host: HTMLElement, kind: CanvasUiKind, options: Record<string, unknown>, { idleLeaveMs = 0 }: MountOptions = {}): (() => void) => {
  let cancelled = false;
  let instance: { destroy: () => void } | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let idleTimer = 0;

  const content = document.createElement('div');
  content.setAttribute('aria-hidden', 'true');
  content.style.cssText = FILL;
  const output = document.createElement('canvas');
  output.setAttribute('aria-hidden', 'true');
  output.style.cssText = FILL + 'display:block;';
  host.append(content, output);
  const source = { getContext: () => null } as unknown as HTMLCanvasElement;

  const leave = () => {
    clearTimeout(idleTimer);
    for (const el of [content, host]) el.dispatchEvent(new PointerEvent('pointerleave'));
  };
  const forward = (e: PointerEvent) => {
    // Our own synthetic events bubble up to window too; only real ones are forwarded.
    if (!e.isTrusted || cancelled) return;
    content.dispatchEvent(new PointerEvent(e.type, { clientX: e.clientX, clientY: e.clientY, bubbles: true }));
    if (idleLeaveMs > 0) {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(leave, idleLeaveMs);
    }
  };
  const out = (e: PointerEvent) => {
    if (e.isTrusted && !e.relatedTarget) leave();
  };

  void LOADERS[kind]()
    .then(create => {
      if (cancelled) return;
      instance = create({ source, content, output }, options);
      if (!instance) return; // no WebGL2: the layer simply stays empty
      gl = output.getContext('webgl2'); // the context the effect created
      addEventListener('pointermove', forward, { passive: true });
      addEventListener('pointerdown', forward, { passive: true });
      addEventListener('pointerout', out, { passive: true });
    })
    .catch(err => console.warn(`[xʸ] canvas-ui "${kind}" failed to load:`, err));

  return () => {
    cancelled = true;
    clearTimeout(idleTimer);
    removeEventListener('pointermove', forward);
    removeEventListener('pointerdown', forward);
    removeEventListener('pointerout', out);
    instance?.destroy();
    instance = null;
    // Free the context right away instead of waiting for GC (browsers cap live contexts at ~16).
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    content.remove();
    output.remove();
  };
};
