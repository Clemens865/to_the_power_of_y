# Library motion pack

The first pack adds Typography Vortex, Elastic Mesh, Scanner, Sliced Waves,
Acid Squares, tear tickets, and a pixel mosaic transition to the normal seed pool.
The second pack adds liquid-fill hold buttons and slingshot buttons.

## Preview seeds

Run `npm run dev` and append these hashes to the app URL:

| Effect | Hash |
| --- | --- |
| Typography Vortex | `#000000000005` |
| Elastic Mesh, light palette | `#000000000010` |
| Scanner | `#00000000000e` |
| Sliced Waves | `#00000000009d` |
| Acid Squares, light palette | `#00000000008e` |
| Tear ticket | `#00000000000f` |
| Liquid-fill hold button | `#000000000027` |
| Slingshot button | `#000000000007` |
| Pixel transition | `#000000000003` (navigate from another seed) |

## Integration

- Independent `library-backgrounds`, `ticket`, `gesture-button`, and `pixel-transition` random streams
  preserve the existing palette, font, rarity, voice, sound and burst rolls.
- The library supplies 25% of backgrounds, split equally across its five effects.
  Tickets appear in 7% of universes; pixel transitions in 15%. Hold and sling
  buttons each appear in about 3.7% of universes, without replacing ticket seeds.
- Tickets stay still and centred horizontally. A completed tear, click, Enter or
  Space triggers one action. Cancellation and navigation retire pending actions.
  A drag away from the main label never becomes a press.
- Hold buttons fill over 800 ms; a quick tap also advances. Sling buttons launch
  after a sufficient pull and release, or a normal tap. Both support Enter/Space,
  cancel pending actions on navigation or focus loss, and stay centred and still.
  Their labels remain plain to avoid competing motion and duplicated renderers.
- Existing still-life composition uses the final button position.
- Backgrounds and all three interaction renderers load on demand. The two new
  controls use DOM/SVG and add no WebGL contexts or runtime dependencies. Typography Vortex uses
  Canvas 2D; the four OGL effects participate in the existing two-context budget.
- Pixel mosaics use at most 324 DOM tiles and one animation loop. Font loading,
  transition cancellation, browser history and rapid presses use the latest intent.
- The new backgrounds use static palette gradients under reduced motion and release
  their renderers when hidden or offscreen. Rendering failure disposes resources and
  leaves the static fallback. Pixel changes are immediate under reduced motion.

## Sources and exports

Sources came from the supplied local animation library. React Bits TS-CSS variants
are recorded at revision `5d0c00e7594c898e989b250d022806961f4c8478`; each vendor
folder has its licence and source notice. Typography Vortex is adapted from
ThreeUI Community under MIT. Pixel-transition orchestration and the app adapters
are original implementations.

Export kits include the adapters and MIT Vortex code. React Bits source remains
excluded; kits provide the official registry install commands. The live app's
DPR cap and guarded OGL lifecycle are local patches. Kits document the DPR
adjustment; their registry version can differ from our cached source.

## Verification

`npm test` runs 38 checks covering seed stability, deterministic reachability, GPU limits, pixel
bounds and cancellation, queued navigation races, renderer failure cleanup, and
compilation of eight generated kits against the cached component variants.
`npm run typecheck` and `npm run build` validate the integrated app.

Chrome checks cover all five new backgrounds, light and dark palettes, ticket
click/keyboard interactions, an outside-label drag, and navigation between seeds. Both new controls were visually checked; Hold
click/Space and Sling Enter each advanced once. Browser console inspection found
no runtime errors during the Sling check.
Physical tear/pull gestures and sustained holds still need a device check: the
native automation drag command initially failed with `noWindowsAvailable` in
both Chrome and Safari. After reconnecting it moved the Sling pad, but completion
was only observed after another pointer action, making that gesture check
inconclusive. Automated interaction tests cover completion, cancellation,
duplicate activation, and cleanup; they do not replace a device gesture check. This is a desktop
smoke check, not a device matrix or an FPS benchmark.

The second pack adds 421 bytes to initial JavaScript (151,378 → 151,799 bytes,
gzip of the entry and static imports from Vite manifests). Hold and Sling stay
in separate lazy chunks. Both builds use the same dependency installation and
Node version; this measures transfer size, not rendering performance.
