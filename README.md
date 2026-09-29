# xʸ — x to the power of y

**One button. Every press, a different universe.**

xʸ is an experimental random-machine website. The page holds a single button (the **x**). Press it and everything around it changes: background, texture, colours, typography, the button itself, how it reacts to a press, its label animation, the words it uses, the cursor, the sound, the layout, what bursts out of it and the transition between states. Even a plain page load never looks the same twice. And every so often you land on a rare one.

The **y** is a seed, a 12-character code that grows a full "genome" of design decisions. The same y always grows the same universe, so every page you land on can be shared, revisited and exported.

> **About 10³³ combinations**, counting only the listed choices of each layer (14,584 palettes × 3,210 font styles × 107 backgrounds × 13 textures × 83 million button looks × 6 behaviours × 1,520 labels × …). Continuous values such as speeds, sizes, generated palettes and font axes aren't counted and push it far higher. A 12-character seed can reach about 281 trillion of them: pressing once a second, you'd need nearly 9 million years to see them all.

---

## How to play

| Do this | What happens |
| --- | --- |
| **Press the button** (or hit <kbd>Space</kbd>) | A new y, and a new universe, arrives through a random transition |
| **Move the mouse** | Many backgrounds and most cursors react to it |
| **Copy the URL** | The seed lives in the hash (`/#3bfd78c8a41e`). Send it to someone and they see exactly your universe |
| **Browser back / forward** | Step through the universes you've already visited |
| **keep ↓** (top right, or <kbd>e</kbd>) | Open the export panel for the current universe |
| **sound on / off** (top right, or <kbd>m</kbd>) | Toggle audio. It stays off until your first press, and the setting is remembered |

The caption in the bottom corner tells you what you're looking at: the seed, the universe's name (e.g. *Viola no. 0372*), background, font, palette, layout, cursor, texture, tone of voice, sound and how many universes you've been through.

### Rare universes

| Rarity | Odds | What's different |
| --- | --- | --- |
| ◆ rare | 1 in 40 | a holographic glow around the button and a badge |
| ★ legendary | 1 in 250 | black-and-gold palette, holo glow, always a burst |
| ✺ mythic | 1 in 2,000 | the whole universe slowly drifts through every hue |

Found one? Copy the URL. The seed is the trophy.

### Keep a universe you like

The **keep** panel shows the palette (click a swatch to copy its hex) and the font, and gives you:

- **Download kit (.zip):** everything needed to rebuild that exact page in your own React project:
  - `Universe.tsx`, a single component with every value baked in
  - `universe.css` with palette tokens, font import, button and layout styles
  - `sound.ts`, the synth for that universe's sounds (plus `zzfx.d.ts`)
  - `trails.tsx`, only when the universe uses one of the custom cursor trails
  - `recipe.json`, the full genome
  - `README.md` with install steps, including the exact `npx shadcn@latest add @react-bits/…` command for every React Bits component used
- **Copy link / Copy component / Copy CSS** for quick grabs.

---

## What changes (the genes)

| Gene | Pool |
| --- | --- |
| **Palette** | Four sources: 7 hand-made moods, ~1,000 human-made palettes, OKLCH generation around a seeded hue, and [poline](https://github.com/meodai/poline) curves between seeded anchors. Every palette passes a readability guard (text ≥ 4.5:1 WCAG contrast) |
| **Font** | 107 Google Fonts, including every variable display face. Variable axes are randomised (Fraunces SOFT/WONK, Recursive CASL, Kablammo MORF, Tilt XROT/YROT, …), and a third of universes let one axis slowly "breathe" |
| **Background** | 107 animated backgrounds: 41 from [React Bits](https://reactbits.dev) (Aurora, Galaxy, Liquid Chrome, Light Tunnel, Radar, Ferrofluid, …), 29 [Paper Shaders](https://shaders.paper.design) (mesh gradients, god rays, metaballs, liquid metal, halftone, fluted glass, …), 14 [tsParticles](https://particles.js.org) scenes (links, hyperspace, matrix, meteors, fire, …), 9 [Vanta](https://www.vantajs.com) effects (fog, cells, clouds, net, globe, …) and **14 original shaders** written for xʸ (marble, topographic lines, truchet tiles, kaleidoscope, moiré, hex pulse, stained glass, aurora, op-art rings, …) |
| **Texture** | A layer over the background: dither, paper, halftone, film grain, scanlines, vignette, fibre, frost, droplets, glyph rain, clouds or blaze (or none) |
| **Button** | 8 shapes × 9 skins, with materials (electric border, glare, specular, border glow, pixel card, glass surface, spotlight), magnetic pull and click sparks |
| **Button motion** | 16 idle loops (breathe, heartbeat, swing, rubber, 3D tilt, comet, shimmer, ring pulse, hue drift, …), 8 hover responses (grow, lift, tilt, squish, glow, …), 8 entrances (pop, drop, rise, spin, blur, stretch, flip, zoom) and 6 press reactions (pop, shake, jelly, sink, ripple, 3D tilt) — all pure CSS |
| **Behaviour** | Where the button goes: still, drift, orbit, bob, dodge (slips away from the pointer up to three times, then lets you press it) or gravity (drops in and bounces, with real physics) |
| **Label** | 20 text treatments (shiny, gradient, decrypt, fuzzy, typewriter, rotating, blur, split-flap, scramble, 3D depth, echo, stroke, warp, particles, pressure, tech, fold, focus, split) |
| **Voice** | The tone of the words: classic, deadpan, poetic, shouty, bureaucratic, cosmic, tender or machine — for the label and the text around it |
| **Cursor** | 8 palette-coloured CSS cursors, plus 22 cursor effects: 10 from React Bits (blob, splash, target, swarm, ghost, glow, ribbons, grid, …), 10 custom canvas trails (comet, confetti, ink, snake, ripples, letters, pixels, spotlight, elastic, lens), Canvas UI bubbles and tsParticles fireflies |
| **Layout** | 12 kinds: frame, poster, marquee, swiss grid, split, orbit, magnet lines, 3D cubes, laser, magic rings, looping text ring, or bare; plus where the button sits |
| **Burst** | What flies out on press: confetti, stars, hearts, card suits, fireworks, snow, emoji or a shockwave |
| **Sound** | 7 synthesised press voices or a seeded [ZzFX](https://github.com/KilledByAPixel/ZzFX) sound (coin, laser, jump, power-up, hit, bubble, robot, crunch), a hover tick, and sometimes an ambient bed, keyed to the palette hue. No audio files |
| **Transition** | 12 named View Transitions plus 5 generated ones (polygon iris, conic sweep, soft wipe, stripes, checkerboard) whose shape, angle, count, timing and easing come from the seed |
| **Name** | The nearest named colour to the accent plus a number, e.g. *Tangerine Dream no. 4127* |

---

## Run it locally

Requires Node 20+.

```sh
git clone https://github.com/Clemens865/to_the_power_of_y.git
cd to_the_power_of_y
npm install
npm run dev        # http://localhost:5178
```

```sh
npm run typecheck  # TypeScript
npm run build      # production build into dist/
npm run preview    # serve the production build
```

Transitions use the [View Transitions API](https://developer.mozilla.org/docs/Web/API/View_Transitions_API) (Chromium, Safari 18+). Other browsers still get new universes, just without the animated change-over. With *prefers-reduced-motion* turned on, transitions, bursts and idle animations are switched off.

**Guardrails.** A universe never runs more than two WebGL layers at once (extras are swapped for 2D versions), every layer sits in an error boundary so one broken effect can't blank the page, and WebGL contexts are released when a universe is replaced.

**Lightweight by design.** The first load is ~146 KB gzipped (mostly React); every background, texture, cursor, label effect, button material, decoration, the colour-name list and the export panel is its own chunk, loaded only when a universe uses it. Shaders render below full resolution with capped pixel density. Measured in a headless Chromium: median 120 fps across random universes (slowest seen: ~84), and the JS heap levels off at ~17 MB after 80 presses.

---

## How it works

```
src/
  engine/
    rng.ts         seeded PRNG: the seed string → deterministic random stream
    genome.ts      grows a Genome from a seed, gene by gene, and enforces the GPU budget
    palette.ts     four palette sources + the readability guard
    fonts.ts       font pool, variable axes and on-demand Google Fonts loading
    sound.ts       Web Audio synth + seeded ZzFX (also shipped as-is in export kits)
    Layer.tsx      error boundary + WebGL clean-up around every visual layer
  data/
    fonts.json     frozen font snapshot (so seeds stay stable)
  genes/
    backgrounds.tsx  background registry: component + (rng, palette) → props
    button.tsx       button gene + wrappers
    buttonCss.ts     button CSS as strings, shared by the live page and the export
    label.tsx        label words + text effects
    cursor.tsx       CSS cursors, React Bits cursor effects, pointer forwarding
    trails.tsx       the 10 custom canvas cursor trails
    layout.tsx       layouts described as data + their CSS
    overlay.tsx      texture layer
    transition.ts    named + generated transitions
    rarity.ts / voice.ts / burst.ts / name.ts
  export/
    kit.ts           code generator for the downloadable kit
    ExportPanel.tsx  the "keep" dialog
  genes/shaders/    the 14 original GLSL backgrounds (ours — shipped in export kits)
  genes/bg/         tsParticles, Vanta and Paper-image adapters
  genes/behaviour.tsx  button behaviour (drift, orbit, dodge, gravity, …)
  vendor/react-bits/ the React Bits components used, with their licence
  vendor/canvas-ui/  the Canvas UI effects used, with their licence
```

Each press writes a new seed into the URL hash. A `hashchange` listener grows the genome, preloads its font, then swaps the universe inside `document.startViewTransition`.

### Add your own gene

1. Create `src/genes/yourGene.tsx` with a `rollYourGene(rng, palette)` function and a component that renders it.
2. Roll it in `grow()` (`src/engine/genome.ts`) on its **own stream**: `rollYourGene(sub('your-gene'), palette)`. A sub-stream is derived from the seed plus the gene's name, so adding a gene never changes what existing seeds show for the others.
3. Render it in `App.tsx`, and teach `src/export/kit.ts` how to write it out if it should be exportable.

Adding a new background is a single entry in `src/genes/backgrounds.tsx`.

---

## Credits & licences

- Backgrounds, text effects, cursor effects and button wrappers are from **[React Bits](https://reactbits.dev)** by David Haz, licensed MIT + Commons Clause (see [`src/vendor/react-bits/LICENSE.md`](src/vendor/react-bits/LICENSE.md)). You may use them in your own sites and apps, but not resell the components themselves. Export kits therefore reference the official React Bits registry rather than bundling their source.
- [Paper Shaders](https://github.com/paper-design/shaders) (Apache-2.0).
- [Canvas UI](https://github.com/DavidHDev/canvas-ui) effects (frost, droplets, glyph rain, clouds, blaze, bubbles), MIT + Commons Clause like React Bits — used on the site, not shipped in export kits.
- [Vanta](https://github.com/tengbao/vanta), [tsParticles](https://github.com/tsparticles/tsparticles) and [matter-js](https://github.com/liabru/matter-js) (all MIT). Vanta runs on today's three.js with a small compatibility shim (`src/genes/bg/VantaBg.tsx`).
- Human-made palettes from [nice-color-palettes](https://github.com/Jam3/nice-color-palettes), sourced from COLOURlovers, **CC BY-NC-SA 3.0**. This is why the project is non-commercial.
- [poline](https://github.com/meodai/poline), [culori](https://github.com/Evercoder/culori), [color-name-list](https://github.com/meodai/color-names), [ZzFX](https://github.com/KilledByAPixel/ZzFX) and [tsParticles confetti](https://github.com/tsparticles/tsparticles) (all MIT).
- Fonts are served by [Google Fonts](https://fonts.google.com) under their respective open licences; the list was taken from the [Fontsource](https://fontsource.org) API.
- Built with React, Vite, TypeScript, [OGL](https://github.com/oframe/ogl), [three.js](https://threejs.org), [GSAP](https://gsap.com), [Motion](https://motion.dev) and [fflate](https://github.com/101arrowz/fflate).

A few vendored components carry small, marked patches (search for `xʸ patch`): FloatingLines (resize after unmount), SplitText (mount trigger instead of `@gsap/react`), Waves (invalid CSS), and the Canvas UI effects (pixel-density cap, pause when hidden).
