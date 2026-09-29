# xʸ: more variation (research, 2026-09-28)

This merges three audits: React Bits and ThreeUI in the library, the library's other sources (Paper Shaders, Vanta, tsParticles, Canvas UI, Transitions.dev, Drei), and web research into new sources and new dimensions. The project is **non-commercial**, so non-commercial-licensed sources are allowed, with attribution.

## Pool size per gene: today → possible

| Gene | Today | Possible | Where the new options come from |
| --- | --- | --- | --- |
| Background | 23 | **~95** | +20 React Bits (ColorBends, Lightfall, Ferrofluid, GradientWaves, LightTunnel, GhostFibers, LiquidEther, Radar, EvilEye, PrismaticBurst, LightPillar, FloatingLines, CRTWarp, WebThreads, MoltenMetal, PixelSnow, DotField, ShapeGrid, Ballpit), +24 Paper Shaders (mesh/grain gradients, warp, swirl, god-rays, metaballs, voronoi, liquid-metal, dithering, …), +11 Vanta, +14 tsParticles presets, plus a curated Shadertoy set (NC, attribution required) |
| Palette | 7 moods × hue × 5 harmonies | effectively unlimited | OKLCH generation + poline (MIT), a culori (MIT) contrast guard so text always stays readable, and the nice-color-palettes data (human-made palettes; CC BY-NC-SA, now allowed) |
| Font | 32 | **~100** | Fontsource API: ~70 variable display fonts (OFL), plus randomised or animated axes (Fraunces SOFT/WONK, Recursive CASL/MONO, Anybody wdth, …) |
| Button material | 8 shapes × 9 skins | +6 materials, +hover/press behaviours | SpecularButton, BorderGlow, PixelCard, GlassSurface, SpotlightCard (React Bits), FlameWrap (Canvas UI); Transitions.dev 3d-tilt, like-pop, shake, success-draw |
| Label effect | 8 | **~22** | SplitFlapText, ScrambledText, DepthText, EchoText, StrokeText, WarpText, ParticleText, TextPressure, TechText, FoldText, TrueFocus, SplitText; Transitions.dev text swap |
| Cursor | 20 effects | ~23 | Canvas UI Liquid and Bubble, tsParticles firefly (React Bits has no cursors left) |
| Transition | 10 | effectively unlimited | Seeded clip-path/mask shapes generated from the RNG, +3 Transitions.dev recipes, PixelTransition/PixelSwap dissolves |
| Sound | 7 voices + 3 ambients | effectively unlimited | ZzFX (MIT, <1 KB): a sound is 20 numbers, so it can come straight from the seed. jsfxr presets (Unlicense), Kenney UI sounds (CC0) |
| Layout | 7 | ~13 | MagnetLines, Cubes, LaserFlow, MagicRings, CurvedLoop/TextLoop rings |

## New genes

1. **Overlay:** a texture layer over any background. Paper dithering, paper-texture and dot-grid with a transparent back; React Bits Noise; Canvas UI Frost, Droplets, GlyphRain, Clouds.
2. **Press burst:** something explodes from the button on press. tsParticles confetti, confettiExplosions, party, confettiCannon; Canvas UI Ripple and ForceField.
3. **Rarity:** 1-in-100 and 1-in-1,000 "legendary" universes with exclusive genes and a badge. Seeds become trophies.
4. **Voice:** the copy's tone (deadpan, poetic, shouty, bureaucratic, cosmic) for the label, frame text and marquee. Hand-written lists plus a small grammar.
5. **Button behaviour:** it runs away, falls, wobbles, or its letters drop (matter-js, MIT; React Bits FallingText). It must stay clickable and keyboard-accessible.
6. **Universe name:** a generated title, e.g. "Tangerine Dream no. 4127" (color-name-list, MIT), shown in the caption and the export.
7. **Time and place:** the palette follows the local sun (SunCalc, BSD-2); weather via Open-Meteo (free for non-commercial use).
8. **Device:** tilt parallax (needs iOS permission on first press), vibration on Android. A bonus.

## Engineering guardrails

- **GPU budget:** at most 2 WebGL layers per universe (background plus one of overlay, cursor or label). Browsers cap WebGL contexts (~16) and phones struggle long before that. Enforce this in `grow()`.
- **Readability guard:** a contrast floor for label and chrome against every palette.
- **Motion safety:** no flashing above 3 Hz (WCAG 2.3.1), and a reduced-motion version of every new gene.
- **Seed contract:** new genes are appended at the end of `grow()`. Bigger pools change what old seeds show for that gene, so do it once per release and accept that the change is visible.
- **Licences:**
  - Keep Canvas UI and Transitions.dev code out of export kits, as with React Bits.
  - Shadertoy ports go in their own folder under CC BY-NC-SA, with author credits on a credits page.
  - tsParticles fireworks: switch its remote sounds off.
  - Vanta targets three r134: net, globe and birds need a visual check on r186; topology and trunk need p5 (skip).

## Suggested order

**Phase 1: current dependencies, fastest variety gain**
+20 backgrounds, +12 label effects, +5 button materials (React Bits); Noise overlay; rarity tiers; voice gene; universe name.

**Phase 2: small new dependencies (Paper Shaders, ZzFX, poline/culori, Fontsource)**
+24 Paper backgrounds and 3 Paper overlays; seeded ZzFX sounds; OKLCH palettes with contrast guard; variable fonts with axes; seeded procedural transitions + Transitions.dev ones; tsParticles press bursts.

**Phase 3: heavier or riskier**
Vanta (visual check on r186), curated Shadertoy set (NC), matter-js button behaviour, Canvas UI overlays and cursors, time/weather, tilt/haptics, 3D objects.

Not worth it: most ThreeUI items (colours baked in, always dark, several are iframes); Drei (needs a full R3F scene); Canvas UI's "live HTML" effects (need an experimental Chrome flag); image-driven effects (they would need the button rasterised).
