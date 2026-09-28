# xʸ — x to the power of y

**One button. Every press, a different universe.**

xʸ is an experimental random-machine website. The page holds a single button (the **x**). Press it and everything around it changes: background, colours, typography, the button itself, its label animation, the cursor, the sound, the layout and the transition between states. Even a plain page load never looks the same twice.

The **y** is a seed, an 8-character code that grows a full "genome" of design decisions. The same y always grows the same universe, so every page you land on can be shared, revisited and exported.

> Well over 10¹⁹ discrete combinations, before counting any of the continuous parameters (speeds, sizes, intensities).

---

## How to play

| Do this | What happens |
| --- | --- |
| **Press the button** (or hit <kbd>Space</kbd>) | A new y, and a new universe, arrives through a random transition |
| **Move the mouse** | Many backgrounds and most cursors react to it |
| **Copy the URL** | The seed lives in the hash (`/#3bfd78c8`). Send it to someone and they see exactly your universe |
| **Browser back / forward** | Step through the universes you've already visited |
| **keep ↓** (top right, or <kbd>e</kbd>) | Open the export panel for the current universe |
| **sound on / off** (top right, or <kbd>m</kbd>) | Toggle audio. It stays off until your first press, and the setting is remembered |

The caption in the bottom corner tells you what you're looking at: seed, background, font, palette mood, layout, cursor, sound voice and how many universes you've been through.

### Keep a universe you like

The **keep** panel shows the palette (click a swatch to copy its hex) and the font, and gives you:

- **Download kit (.zip):** everything needed to rebuild that exact page in your own React project:
  - `Universe.tsx`, a single component with every value baked in
  - `universe.css` with palette tokens, font import, button and layout styles
  - `sound.ts`, the synth for that universe's sounds
  - `trails.tsx`, only when the universe uses one of the custom cursor trails
  - `recipe.json`, the full genome
  - `README.md` with install steps, including the exact `npx shadcn@latest add @react-bits/…` command for every React Bits component used
- **Copy link / Copy component / Copy CSS** for quick grabs.

---

## What changes (the genes)

| Gene | Pool |
| --- | --- |
| **Palette** | 7 moods (void, neon, paper, pastel, acid, noir, sunset) × 360 hues × 5 colour harmonies |
| **Font** | 32 Google Fonts, plus case, tracking and italics |
| **Background** | 23 animated WebGL / canvas backgrounds from [React Bits](https://reactbits.dev) (Aurora, Galaxy, Liquid Chrome, Balatro, Faulty Terminal, Dot Grid, Lightning, …) |
| **Button** | 8 shapes × 9 skins (glass, neon, brutalist, emboss, gradient, …) × idle motions, with optional electric border, glare, magnetic pull and click sparks |
| **Label** | 19 words × 8 treatments (plain, shiny, gradient, decrypt, fuzzy, typewriter, rotating, blur) |
| **Cursor** | 8 palette-coloured CSS cursors, plus 20 cursor effects: 10 from React Bits (blob, splash, target, swarm, ghost, glow, ribbons, grid, …) and 10 custom canvas trails (comet, confetti, ink, snake, ripples, letters, pixels, spotlight, elastic, lens) |
| **Layout** | bare, frame, poster, marquee, swiss grid, split, orbit, plus where the button sits |
| **Sound** | 7 synthesised press voices, a hover tick, and sometimes an ambient bed (drone, pulse, shimmer), keyed to the palette hue. Pure Web Audio, no audio files |
| **Transition** | 10 View Transition animations: circle-from-click, wipes, blinds, zoom, spin, flip, dissolve, diamond, split |

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

Transitions use the [View Transitions API](https://developer.mozilla.org/docs/Web/API/View_Transitions_API) (Chromium, Safari 18+). Other browsers still get new universes, just without the animated change-over. With *prefers-reduced-motion* turned on, transitions and idle animations are switched off.

---

## How it works

```
src/
  engine/
    rng.ts         seeded PRNG: the seed string → deterministic random stream
    genome.ts      grows a Genome from a seed, gene by gene
    palette.ts     moods × harmonies → bg / fg / 3 accents
    fonts.ts       font pool + on-demand Google Fonts loading
    sound.ts       Web Audio synth (also shipped as-is in export kits)
  genes/
    backgrounds.tsx  background registry: component + (rng, palette) → props
    button.tsx       button gene + wrappers
    buttonCss.ts     button CSS as strings, shared by the live page and the export
    label.tsx        label words + text effects
    cursor.tsx       CSS cursors, React Bits cursor effects, pointer forwarding
    trails.tsx       the 10 custom canvas cursor trails
    layout.tsx       layouts described as data + their CSS
    transition.ts    transition names (keyframes live in styles.css)
  export/
    kit.ts           code generator for the downloadable kit
    ExportPanel.tsx  the "keep" dialog
  vendor/react-bits/ the React Bits components used, with their licence
```

Each press writes a new seed into the URL hash. A `hashchange` listener grows the genome, preloads its font, then swaps the universe inside `document.startViewTransition`.

### Add your own gene

1. Create `src/genes/yourGene.tsx` with a `rollYourGene(rng, palette)` function and a component that renders it.
2. **Append** the roll to the end of `grow()` in `src/engine/genome.ts`. The order of rolls is part of the seed contract: adding to the end keeps existing seeds looking the same for every gene that came before.
3. Render it in `App.tsx`, and teach `src/export/kit.ts` how to write it out if it should be exportable.

Adding a new background is a single entry in `src/genes/backgrounds.tsx`.

---

## Credits & licences

- Backgrounds, text effects, cursor effects and button wrappers are from **[React Bits](https://reactbits.dev)** by David Haz, licensed MIT + Commons Clause (see [`src/vendor/react-bits/LICENSE.md`](src/vendor/react-bits/LICENSE.md)). You may use them in your own sites and apps, but not resell the components themselves. Export kits therefore reference the official React Bits registry rather than bundling their source.
- Fonts are served by [Google Fonts](https://fonts.google.com) under their respective open licences.
- Built with React, Vite, TypeScript, [OGL](https://github.com/oframe/ogl), [three.js](https://threejs.org), [GSAP](https://gsap.com), [Motion](https://motion.dev) and [fflate](https://github.com/101arrowz/fflate).
