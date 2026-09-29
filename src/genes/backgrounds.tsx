import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Rng } from '../engine/rng';
import { hexToRgb01, type Palette } from '../engine/palette';

// Each background is an effect component plus a mapping from (rng, palette) to its props.
// Sources: React Bits (vendored under src/vendor/react-bits) and Paper Shaders (@paper-design/shaders-react).
type Props = Record<string, unknown>;
interface BackgroundDef {
  Component: LazyExoticComponent<ComponentType<any>>;
  props: (rng: Rng, p: Palette) => Props;
  /** Component name for the export kit (defaults to the capitalised id). */
  name?: string;
  /** 'rb' = React Bits (default), 'paper' = @paper-design/shaders-react. */
  source?: 'rb' | 'paper';
  /** false for canvas-2D / DOM renderers. Defaults to true (except the legacy 2D ids below). */
  webgl?: boolean;
  /** Only eligible for palettes that pass this test. */
  when?: (p: Palette) => boolean;
}

const hueOf = (p: Palette) => p.hue;

const toRgb = (hex: string) => hexToRgb01(hex).map(c => Math.round(c * 255)) as [number, number, number];
const mix = (a: string, b: string, t: number) => {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return '#' + ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, '0')).join('');
};
const rgba = (hex: string, a: number) => `rgba(${toRgb(hex).join(', ')}, ${Math.round(a * 1000) / 1000})`;

// v0.1 pool — ids and mappers must stay unchanged so saved seeds keep their look.
const LEGACY: Record<string, BackgroundDef> = {
  aurora: {
    Component: lazy(() => import('../vendor/react-bits/Aurora/Aurora')),
    props: (r, p) => ({ colorStops: [p.accent, p.accent2, p.accent3], amplitude: r.range(0.6, 1.6), blend: r.range(0.3, 0.8), speed: r.range(0.5, 1.5) })
  },
  threads: {
    Component: lazy(() => import('../vendor/react-bits/Threads/Threads')),
    props: (r, p) => ({ color: hexToRgb01(p.accent), amplitude: r.range(0.6, 2), distance: r.range(0, 0.6), enableMouseInteraction: true })
  },
  iridescence: {
    Component: lazy(() => import('../vendor/react-bits/Iridescence/Iridescence')),
    props: (r, p) => ({ color: hexToRgb01(p.accent), speed: r.range(0.4, 1.4), amplitude: r.range(0.05, 0.2), mouseReact: true })
  },
  liquidChrome: {
    Component: lazy(() => import('../vendor/react-bits/LiquidChrome/LiquidChrome')),
    props: (r, p) => ({ baseColor: hexToRgb01(p.accent).map(c => c * 0.4), speed: r.range(0.1, 0.5), amplitude: r.range(0.2, 0.6), interactive: true })
  },
  balatro: {
    Component: lazy(() => import('../vendor/react-bits/Balatro/Balatro')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, color3: p.bg, pixelFilter: r.pick([300, 700, 2000]), spinSpeed: r.range(2, 9), isRotate: r.chance(0.5), mouseInteraction: true })
  },
  galaxy: {
    Component: lazy(() => import('../vendor/react-bits/Galaxy/Galaxy')),
    props: (r, p) => ({ hueShift: hueOf(p), density: r.range(0.8, 2), glowIntensity: r.range(0.2, 0.6), saturation: r.range(0, 0.8), twinkleIntensity: r.range(0.2, 0.8), rotationSpeed: r.range(0, 0.15), mouseRepulsion: true, transparent: false })
  },
  particles: {
    Component: lazy(() => import('../vendor/react-bits/Particles/Particles')),
    props: (r, p) => ({ particleColors: [p.accent, p.accent2, p.fg], particleCount: r.int(150, 500), particleSpread: r.range(6, 14), speed: r.range(0.05, 0.3), particleBaseSize: r.range(60, 160), moveParticlesOnHover: true, alphaParticles: r.chance(0.5) })
  },
  plasma: {
    Component: lazy(() => import('../vendor/react-bits/Plasma/Plasma')),
    props: (r, p) => ({ color: p.accent, speed: r.range(0.3, 1.2), direction: r.pick(['forward', 'reverse', 'pingpong']), scale: r.range(0.8, 1.6), opacity: r.range(0.6, 1), mouseInteractive: true })
  },
  faultyTerminal: {
    Component: lazy(() => import('../vendor/react-bits/FaultyTerminal/FaultyTerminal')),
    props: (r, p) => ({ tint: p.accent, scale: r.range(1, 2.5), digitSize: r.range(1, 2), scanlineIntensity: r.range(0.2, 1), glitchAmount: r.range(0.5, 1.5), curvature: r.range(0, 0.3), brightness: r.range(0.5, 1), mouseReact: true })
  },
  lightning: {
    Component: lazy(() => import('../vendor/react-bits/Lightning/Lightning')),
    props: (r, p) => ({ hue: hueOf(p), xOffset: r.range(-0.6, 0.6), speed: r.range(0.5, 1.6), intensity: r.range(0.6, 1.4), size: r.range(0.7, 2) })
  },
  orb: {
    Component: lazy(() => import('../vendor/react-bits/Orb/Orb')),
    props: (r, p) => ({ hue: hueOf(p), hoverIntensity: r.range(0.2, 0.8), rotateOnHover: true, backgroundColor: p.bg })
  },
  lightRays: {
    Component: lazy(() => import('../vendor/react-bits/LightRays/LightRays')),
    props: (r, p) => ({ raysOrigin: r.pick(['top-center', 'top-left', 'top-right', 'bottom-center']), raysColor: p.accent, raysSpeed: r.range(0.5, 2), lightSpread: r.range(0.3, 1.5), rayLength: r.range(1, 3), pulsating: r.chance(0.4), followMouse: true, noiseAmount: r.range(0, 0.2), distortion: r.range(0, 0.1) })
  },
  waves: {
    Component: lazy(() => import('../vendor/react-bits/Waves/Waves')),
    props: (r, p) => ({ lineColor: p.accent, backgroundColor: 'transparent', waveSpeedX: r.range(0.01, 0.03), waveSpeedY: r.range(0.005, 0.02), waveAmpX: r.range(20, 50), waveAmpY: r.range(10, 30), xGap: r.int(8, 16), yGap: r.int(24, 44) })
  },
  grainient: {
    Component: lazy(() => import('../vendor/react-bits/Grainient/Grainient')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, color3: p.bg, warpStrength: r.range(0.5, 2), warpFrequency: r.range(2, 8), grainAmount: r.range(0.05, 0.2), timeSpeed: r.range(0.15, 0.5), zoom: r.range(0.7, 1.2) })
  },
  softAurora: {
    Component: lazy(() => import('../vendor/react-bits/SoftAurora/SoftAurora')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, speed: r.range(0.4, 1.2), brightness: r.range(0.8, 1.3), lightMode: p.isLight, enableMouseInteraction: true })
  },
  lineWaves: {
    Component: lazy(() => import('../vendor/react-bits/LineWaves/LineWaves')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, color3: p.accent3, speed: r.range(0.1, 0.5), warpIntensity: r.range(0.5, 1.5), rotation: r.range(-45, 45), lightMode: p.isLight, enableMouseInteraction: true })
  },
  gradientBlinds: {
    Component: lazy(() => import('../vendor/react-bits/GradientBlinds/GradientBlinds')),
    props: (r, p) => ({ gradientColors: [p.accent, p.accent2], angle: r.int(0, 180), noise: r.range(0, 0.4), blindCount: r.int(6, 24), spotlightRadius: r.range(0.3, 0.7), distortAmount: r.range(0, 2), mirrorGradient: r.chance(0.5), lightMode: p.isLight })
  },
  plasmaWave: {
    Component: lazy(() => import('../vendor/react-bits/PlasmaWave/PlasmaWave')),
    props: (r, p) => ({ colors: [p.accent, p.accent2], rotationDeg: r.int(-40, 40), focalLength: r.range(0.6, 1), speed1: r.range(0.02, 0.1), speed2: r.range(0.02, 0.1), bend1: r.range(0.5, 1.5), bend2: r.range(0.3, 1), lightMode: p.isLight })
  },
  topography: {
    Component: lazy(() => import('../vendor/react-bits/Topography/Topography')),
    props: (r, p) => ({ lowColor: p.bg, midColor: p.accent, highColor: p.accent2, bands: r.int(8, 24), thickness: r.range(0.5, 2), speed: r.range(0.1, 0.4), fillBands: r.chance(0.4), grain: r.chance(0.5), mouseInteraction: true })
  },
  dotGrid: {
    Component: lazy(() => import('../vendor/react-bits/DotGrid/DotGrid')),
    props: (r, p) => ({ baseColor: p.accent, activeColor: p.accent2, dotSize: r.int(3, 10), gap: r.int(14, 40), proximity: r.int(80, 180) })
  },
  letterGlitch: {
    Component: lazy(() => import('../vendor/react-bits/LetterGlitch/LetterGlitch')),
    props: (r, p) => ({ glitchColors: [p.accent, p.accent2, p.accent3], glitchSpeed: r.int(30, 90), centerVignette: r.chance(0.6), outerVignette: r.chance(0.5), smooth: true, backgroundColor: p.bg, lightMode: p.isLight, characters: r.pick(['XY', 'xyXY^01', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', '░▒▓█▀▄', '·•●○◌◍']) })
  },
  darkVeil: {
    Component: lazy(() => import('../vendor/react-bits/DarkVeil/DarkVeil')),
    props: (r, p) => ({ hueShift: hueOf(p), noiseIntensity: r.range(0, 0.1), scanlineIntensity: r.range(0, 0.4), speed: r.range(0.3, 1.2), warpAmount: r.range(0, 3), lightMode: p.isLight })
  },
  prism: {
    Component: lazy(() => import('../vendor/react-bits/Prism/Prism')),
    props: (r, p) => ({ animationType: r.pick(['rotate', '3drotate', 'hover']), hueShift: (p.hue / 180) * Math.PI, glow: r.range(0.6, 1.4), scale: r.range(2.5, 4), noise: r.range(0, 0.4), colorFrequency: r.range(0.6, 1.6), bloom: r.range(0.8, 1.4), transparent: true })
  }
};

// v0.3 additions — React Bits. Appended after LEGACY.
const RB_ADDED: Record<string, BackgroundDef> = {
  colorBends: {
    Component: lazy(() => import('../vendor/react-bits/ColorBends/ColorBends')),
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3], rotation: r.int(0, 180), speed: r.range(0.1, 0.35), autoRotate: r.chance(0.5) ? r.range(-4, 4) : 0, scale: r.range(0.8, 1.4), frequency: r.range(0.7, 1.4), warpStrength: r.range(0.5, 1.4), mouseInfluence: r.range(0.5, 1.2), parallax: r.range(0.2, 0.7), noise: r.range(0.05, 0.2), intensity: r.range(1, 1.6), bandWidth: r.range(4, 8), transparent: true })
  },
  lightfall: {
    Component: lazy(() => import('../vendor/react-bits/Lightfall/Lightfall')),
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3], backgroundColor: p.accent2, backgroundGlow: r.range(0.2, 0.6), speed: r.range(0.3, 0.8), streakCount: r.int(1, 3), streakWidth: r.range(0.7, 1.4), streakLength: r.range(0.7, 1.5), glow: r.range(0.7, 1.3), density: r.range(0.4, 0.8), twinkle: r.range(0.3, 1), zoom: r.range(2, 4), lightMode: p.isLight, mouseInteraction: true })
  },
  ferrofluid: {
    Component: lazy(() => import('../vendor/react-bits/Ferrofluid/Ferrofluid')),
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3], speed: r.range(0.3, 0.7), scale: r.range(1.2, 2.2), turbulence: r.range(0.6, 1.4), fluidity: r.range(0.05, 0.2), rimWidth: r.range(0.1, 0.3), sharpness: r.range(1.8, 3.2), shimmer: r.range(0.8, 1.8), glow: r.range(1, 2), flowDirection: r.pick(['up', 'down', 'left', 'right']), mouseInteraction: true })
  },
  gradientWaves: {
    Component: lazy(() => import('../vendor/react-bits/GradientWaves/GradientWaves')),
    props: (r, p) => ({ horizonColor: p.accent, waveColor: p.accent2, crestColor: p.accent3, speed: r.range(0.2, 0.6), amplitude: r.range(1.5, 3.5), waveScale: r.range(0.4, 0.9), waveRatio: r.range(0.7, 1.1), swell: r.range(20, 50), turbulence: r.range(10, 30), tilt: r.range(0.9, 1.3), zoom: r.range(0.8, 1.2), height: r.range(4, 7), fogDepth: r.range(10, 20), detail: 'medium', brightness: r.range(0.8, 1.1), grain: r.chance(0.6), grainIntensity: r.range(0.03, 0.08), mouseInteraction: true })
  },
  lightTunnel: {
    Component: lazy(() => import('../vendor/react-bits/LightTunnel/LightTunnel')),
    props: (r, p) => ({ cableColor: p.accent, pulseColor: p.accent2, tunnelColor: p.accent3, tunnelOpacity: r.range(0, 0.3), speed: r.range(0.05, 0.2), flowDirection: r.pick(['inward', 'outward']), pulseSpeed: r.range(1, 2.5), pulseLength: r.range(0.2, 0.4), cableCount: r.int(12, 32), thickness: r.range(0.25, 0.5), waviness: r.range(0.1, 0.5), sway: r.range(0.2, 0.8), size: r.range(0.8, 1.3), glow: r.range(0.7, 1.3), brightness: r.range(0.8, 1.1), colorVariance: r.chance(0.6), grain: true, lightMode: p.isLight, mouseInteraction: true })
  },
  ghostFibers: {
    Component: lazy(() => import('../vendor/react-bits/GhostFibers/GhostFibers')),
    props: (r, p) => ({ lineColor: mix(p.bg, p.accent2, 0.3), glowColor: mix(p.bg, p.accent, 0.6), speed: r.range(0.1, 0.3), scale: r.range(1.5, 2.5), rotation: r.int(0, 360), rotationSpeed: r.range(0.1, 0.35), layers: r.int(3, 5), waveAmplitude: r.range(0.01, 0.025), waveFrequency: r.range(2, 4), twist: r.range(0.05, 0.2), lineFrequency: r.range(4, 7), glowIntensity: r.range(1.2, 1.8), brightness: r.range(1.4, 2.2), vignette: r.range(0.5, 0.9), grain: r.range(0.03, 0.08), lightMode: p.isLight })
  },
  liquidEther: {
    Component: lazy(() => import('../vendor/react-bits/LiquidEther/LiquidEther')),
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3], mouseForce: r.range(12, 30), cursorSize: r.int(80, 140), isViscous: r.chance(0.3), viscous: r.range(20, 40), iterationsPoisson: 24, resolution: r.range(0.4, 0.5), autoDemo: true, autoSpeed: r.range(0.3, 0.7), autoIntensity: r.range(1.6, 2.6), backgroundColor: p.bg, lightMode: p.isLight })
  },
  radar: {
    Component: lazy(() => import('../vendor/react-bits/Radar/Radar')),
    props: (r, p) => ({ color: p.accent, backgroundColor: p.bg, speed: r.range(0.5, 1.2), scale: r.range(0.4, 0.8), ringCount: r.int(6, 14), spokeCount: r.int(6, 16), ringThickness: r.range(0.03, 0.07), spokeThickness: r.range(0.005, 0.02), sweepSpeed: r.range(0.4, 1.2), sweepWidth: r.range(1, 3), sweepLobes: r.int(1, 3), falloff: r.range(1.5, 3), brightness: r.range(0.7, 1.1), enableMouseInteraction: true, lightMode: p.isLight })
  },
  evilEye: {
    Component: lazy(() => import('../vendor/react-bits/EvilEye/EvilEye')),
    props: (r, p) => ({ eyeColor: p.accent, backgroundColor: p.bg, intensity: r.range(1, 1.6), pupilSize: r.range(0.4, 0.8), irisWidth: r.range(0.15, 0.35), glowIntensity: r.range(0.2, 0.5), scale: r.range(0.6, 1.1), noiseScale: r.range(0.7, 1.4), pupilFollow: r.range(0.5, 1.2), flameSpeed: r.range(0.5, 1.2), lightMode: p.isLight })
  },
  prismaticBurst: {
    Component: lazy(() => import('../vendor/react-bits/PrismaticBurst/PrismaticBurst')),
    props: (r, p) => ({ colors: [p.accent, p.accent2, p.accent3], intensity: r.range(1.2, 2.2), speed: r.range(0.3, 0.7), animationType: r.pick(['rotate', 'rotate3d', 'hover']), distort: r.range(0, 2), rayCount: r.chance(0.5) ? r.int(8, 24) : 0, hoverDampness: r.range(0.1, 0.5), mixBlendMode: 'lighten', lightMode: p.isLight })
  },
  lightPillar: {
    Component: lazy(() => import('../vendor/react-bits/LightPillar/LightPillar')),
    props: (r, p) => ({ topColor: p.accent, bottomColor: p.accent2, intensity: r.range(0.7, 1.1), rotationSpeed: r.range(0.1, 0.5), interactive: r.chance(0.5), glowAmount: r.range(0.003, 0.007), pillarWidth: r.range(2, 4), pillarHeight: r.range(0.3, 0.6), noiseIntensity: r.range(0.2, 0.6), pillarRotation: r.int(-40, 40), quality: 'medium', mixBlendMode: p.isLight ? 'normal' : 'screen', lightMode: p.isLight })
  },
  floatingLines: {
    Component: lazy(() => import('../vendor/react-bits/FloatingLines/FloatingLines')),
    props: (r, p) => {
      const waves = (['top', 'middle', 'bottom'] as const).filter(() => r.chance(0.7));
      return { linesGradient: [p.accent, p.accent2, p.accent3], enabledWaves: waves.length ? waves : ['middle'], lineCount: r.int(4, 10), lineDistance: r.range(3, 7), animationSpeed: r.range(0.5, 1.2), interactive: true, bendRadius: r.range(3, 7), bendStrength: r.range(-1, -0.2), parallax: true, parallaxStrength: r.range(0.1, 0.3), backgroundColor: p.bg, lightMode: p.isLight, mixBlendMode: 'screen' };
    }
  },
  crtWarp: {
    name: 'CRTWarp',
    Component: lazy(() => import('../vendor/react-bits/CRTWarp/CRTWarp')),
    props: (r, p) => ({ color: p.accent, backgroundColor: p.bg, speed: r.range(0.3, 0.8), curvature: r.range(0.1, 0.35), scanlineStrength: r.range(0.15, 0.35), scanlineFrequency: r.int(150, 300), waveAmplitude: r.range(0.15, 0.45), waveFrequency: r.range(1.5, 3.5), bloom: r.range(1, 1.8), noise: r.range(0.05, 0.15), vignette: r.range(0, 0.4), brightness: r.range(0.9, 1.3), pixelation: r.pick([1, 1, 2, 3]), rgbShift: r.range(0.005, 0.02), mouseReact: true })
  },
  webThreads: {
    Component: lazy(() => import('../vendor/react-bits/WebThreads/WebThreads')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, color3: p.accent3, speed: r.range(0.1, 0.35), threadCount: r.int(4, 10), frequency: r.range(3, 7), spread: r.range(0.1, 0.3), taper: r.range(0.6, 1.2), position: r.range(0.3, 0.7), fanMode: r.pick(['center', 'left', 'right']), glow: r.range(0.01, 0.04), falloff: r.range(0.4, 0.8), thickness: r.range(0.8, 1.4), brightness: r.range(0.5, 0.8), mirror: r.chance(0.6), shimmer: r.chance(0.3), grain: true, backgroundColor: p.bg, lightMode: p.isLight, mouseInteraction: true })
  },
  moltenMetal: {
    Component: lazy(() => import('../vendor/react-bits/MoltenMetal/MoltenMetal')),
    props: (r, p) => ({ color1: p.accent, color2: p.accent2, color3: p.accent3, speed: r.range(0.2, 0.5), scale: r.range(3, 5), detail: r.int(2, 4), glow: r.range(1.2, 2), coreSize: r.range(0.05, 0.2), swirl: r.range(0.6, 1.4), fold: r.range(-0.4, 0), blackPoint: r.range(0.02, 0.1), brightness: r.range(1, 1.4), colorMode: r.pick(['molten', 'ember', 'frost']), grain: r.chance(0.6), backgroundColor: p.bg, lightMode: p.isLight, mouseInteraction: true })
  },
  pixelSnow: {
    Component: lazy(() => import('../vendor/react-bits/PixelSnow/PixelSnow')),
    props: (r, p) => ({ color: p.isLight ? p.accent : p.fg, flakeSize: r.range(0.008, 0.015), minFlakeSize: r.range(1, 1.5), pixelResolution: r.pick([120, 200, 300]), speed: r.range(0.6, 1.5), depthFade: r.range(6, 10), farPlane: r.range(16, 24), brightness: r.range(0.7, 1), density: r.range(0.2, 0.4), variant: r.pick(['square', 'round', 'snowflake']), direction: r.int(90, 160) })
  },
  dotField: {
    webgl: false,
    Component: lazy(() => import('../vendor/react-bits/DotField/DotField')),
    props: (r, p) => ({ gradientFrom: rgba(p.accent, 0.35), gradientTo: rgba(p.accent2, 0.25), glowColor: p.bg, dotRadius: r.range(1, 2.5), dotSpacing: r.int(10, 20), cursorRadius: r.int(300, 600), cursorForce: r.range(0.05, 0.15), bulgeOnly: r.chance(0.6), bulgeStrength: r.range(40, 90), glowRadius: r.int(120, 220), sparkle: r.chance(0.3), waveAmplitude: r.chance(0.4) ? r.range(2, 8) : 0 })
  },
  shapeGrid: {
    webgl: false,
    // Draws a hard-coded #120F17 edge vignette, so it only suits dark palettes.
    when: p => !p.isLight,
    Component: lazy(() => import('../vendor/react-bits/ShapeGrid/ShapeGrid')),
    props: (r, p) => ({ direction: r.pick(['diagonal', 'up', 'right', 'down', 'left']), speed: r.range(0.2, 0.8), borderColor: mix(p.bg, p.accent, 0.35), squareSize: r.int(30, 70), hoverFillColor: mix(p.bg, p.accent, 0.5), shape: r.pick(['square', 'hexagon', 'circle', 'triangle']), hoverTrailAmount: r.int(0, 6) })
  }
  // Ballpit was tried and dropped: its injected lighting shader doesn't compile on three r186.
};

// v0.3 additions — Paper Shaders (all WebGL2). One shared chunk, picked by export name.
const paper = (name: string, props: BackgroundDef['props']): BackgroundDef => ({
  name,
  source: 'paper',
  Component: lazy(() => import('@paper-design/shaders-react').then(m => ({ default: (m as unknown as Record<string, ComponentType<any>>)[name] }))),
  props
});
const SHAPES = ['circle', 'daisy', 'diamond', 'metaballs'] as const;

const PAPER_ADDED: Record<string, BackgroundDef> = {
  paperMeshGradient: paper('MeshGradient', (r, p) => ({ colors: [p.bg, p.accent, p.accent2, p.accent3], distortion: r.range(0.5, 1), swirl: r.range(0, 0.6), grainMixer: r.range(0, 0.3), grainOverlay: r.range(0, 0.15), speed: r.range(0.2, 0.6) })),
  paperGrainGradient: paper('GrainGradient', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2, p.accent3], softness: r.range(0.3, 0.8), intensity: r.range(0.2, 0.6), noise: r.range(0.1, 0.35), shape: r.pick(['wave', 'dots', 'truchet', 'corners', 'ripple', 'blob', 'sphere']), speed: r.range(0.3, 0.8) })),
  paperWarp: paper('Warp', (r, p) => ({ colors: [p.bg, p.accent, mix(p.bg, p.accent2, 0.4), p.accent2], proportion: r.range(0.3, 0.6), softness: r.range(0.5, 1), distortion: r.range(0.1, 0.4), swirl: r.range(0.4, 1), swirlIterations: r.int(6, 12), shapeScale: r.range(0.05, 0.2), shape: r.pick(['checks', 'stripes', 'edge']), rotation: r.int(0, 360), speed: r.range(0.2, 0.6) })),
  paperSwirl: paper('Swirl', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2, p.accent3], bandCount: r.int(2, 7), twist: r.range(0.05, 0.4), center: r.range(0.1, 0.4), proportion: r.range(0.3, 0.7), softness: r.range(0, 0.5), noiseFrequency: r.range(0.2, 0.6), noise: r.range(0, 0.3), speed: r.range(0.15, 0.4) })),
  paperSmokeRing: paper('SmokeRing', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2], noiseScale: r.range(2, 4), noiseIterations: r.int(6, 8), radius: r.range(0.2, 0.35), thickness: r.range(0.4, 0.8), innerShape: r.range(0.5, 1), scale: r.range(0.8, 1.2), speed: r.range(0.3, 0.7) })),
  paperGodRays: paper('GodRays', (r, p) => ({ colorBack: p.bg, colorBloom: p.accent, colors: [rgba(p.accent, 0.45), rgba(p.accent2, 0.9), rgba(p.accent3, 0.8), rgba(p.accent, 0.6)], density: r.range(0.2, 0.4), spotty: r.range(0.2, 0.4), midIntensity: r.range(0.2, 0.5), midSize: r.range(0.1, 0.3), intensity: r.range(0.5, 0.8), bloom: r.range(0.2, 0.4), offsetX: r.range(-0.3, 0.3), offsetY: r.range(-0.6, -0.3), speed: r.range(0.4, 0.8) })),
  paperMetaballs: paper('Metaballs', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2, p.accent3], count: r.int(6, 14), size: r.range(0.6, 0.9), scale: r.range(0.8, 1.2), speed: r.range(0.5, 1) })),
  paperVoronoi: paper('Voronoi', (r, p) => ({ colors: [p.accent, p.accent2], stepsPerColor: r.int(2, 4), colorGlow: p.accent3, colorGap: p.bg, distortion: r.range(0.2, 0.5), gap: r.range(0.02, 0.08), glow: r.range(0, 0.6), scale: r.range(0.3, 0.7), speed: r.range(0.2, 0.6) })),
  paperDotOrbit: paper('DotOrbit', (r, p) => ({ colorBack: p.bg, colors: [p.accent3, p.accent, p.accent2, mix(p.accent2, p.bg, 0.5)], size: r.range(0.6, 1.2), sizeRange: r.range(0, 0.5), spreading: r.range(0.6, 1), stepsPerColor: r.int(2, 4), speed: r.range(0.5, 1.5) })),
  paperColorPanels: paper('ColorPanels', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2, p.accent3, mix(p.accent, p.accent2, 0.5)], angle1: r.range(-0.5, 0.5), angle2: r.range(-0.5, 0.5), length: r.range(0.8, 1.4), edges: r.chance(0.4), blur: r.range(0, 0.3), fadeIn: r.range(0.6, 1), fadeOut: r.range(0.2, 0.5), gradient: r.range(0, 0.6), density: r.range(2, 5), scale: r.range(0.6, 1), speed: r.range(0.3, 0.7) })),
  paperStaticMeshGradient: paper('StaticMeshGradient', (r, p) => ({ colors: [p.bg, p.accent, p.accent2, p.accent3], rotation: r.int(0, 360), positions: r.int(0, 100), waveX: r.range(0.5, 1), waveXShift: r.range(0, 1), waveY: r.range(0.5, 1), waveYShift: r.range(0, 1), mixing: r.range(0.5, 1), grainMixer: r.range(0, 0.2), grainOverlay: r.range(0, 0.1) })),
  paperStaticRadialGradient: paper('StaticRadialGradient', (r, p) => ({ colorBack: p.bg, colors: [p.accent, p.accent2, p.accent3], radius: r.range(0.6, 1), focalDistance: r.range(0.5, 1), focalAngle: r.int(0, 360), falloff: r.range(0.1, 0.5), mixing: r.range(0.3, 0.7), distortion: r.range(0, 0.4), distortionShift: r.range(0, 1), distortionFreq: r.int(6, 14), grainMixer: r.range(0, 0.2), grainOverlay: r.range(0, 0.1) })),
  paperSimplexNoise: paper('SimplexNoise', (r, p) => ({ colors: [p.bg, p.accent, p.accent2, p.accent3], stepsPerColor: r.int(1, 3), softness: r.range(0, 0.6), scale: r.range(0.4, 0.9), speed: r.range(0.2, 0.6) })),
  paperNeuroNoise: paper('NeuroNoise', (r, p) => ({ colorFront: p.isLight ? p.fg : p.accent3, colorMid: p.accent, colorBack: p.bg, brightness: r.range(0.02, 0.1), contrast: r.range(0.2, 0.4), speed: r.range(0.4, 1) })),
  paperPerlinNoise: paper('PerlinNoise', (r, p) => ({ colorBack: p.bg, colorFront: p.accent, proportion: r.range(0.3, 0.5), softness: r.range(0, 0.4), octaveCount: r.int(1, 4), persistence: r.range(0.5, 1), lacunarity: r.range(1.5, 2.5), speed: r.range(0.2, 0.6) })),
  paperWaves: paper('Waves', (r, p) => ({ colorFront: p.accent, colorBack: p.bg, shape: r.range(0, 3), frequency: r.range(0.3, 0.8), amplitude: r.range(0.3, 0.7), spacing: r.range(0.8, 1.6), proportion: r.range(0.05, 0.3), softness: r.range(0, 0.3), scale: r.range(0.4, 0.9), rotation: r.int(0, 180) })),
  paperSpiral: paper('Spiral', (r, p) => ({ colorBack: p.bg, colorFront: p.accent, density: r.range(0.5, 1.5), distortion: r.range(0, 0.4), strokeWidth: r.range(0.3, 0.7), strokeTaper: r.range(0, 0.5), strokeCap: r.range(0, 0.5), noise: r.range(0, 0.3), noiseFrequency: r.range(0, 0.5), softness: r.range(0, 0.3), speed: r.range(0.3, 0.8) })),
  paperDithering: paper('Dithering', (r, p) => ({ colorBack: p.bg, colorFront: p.accent, shape: r.pick(['simplex', 'warp', 'dots', 'wave', 'ripple', 'swirl', 'sphere']), type: r.pick(['random', '2x2', '4x4', '8x8']), size: r.int(2, 5), scale: r.range(0.5, 1), speed: r.range(0.3, 0.8) })),
  paperDotGrid: paper('DotGrid', (r, p) => {
    const gap = r.int(20, 40);
    return { colorBack: p.bg, colorFill: p.accent, colorStroke: p.accent2, size: r.range(1.5, 5), gapX: gap, gapY: r.chance(0.7) ? gap : r.int(20, 40), strokeWidth: r.range(0, 1.5), sizeRange: r.range(0, 0.6), opacityRange: r.range(0, 0.6), shape: r.pick(['circle', 'diamond', 'square', 'triangle']) };
  }),
  paperWater: paper('Water', (r, p) => ({ colorBack: mix(p.bg, p.accent, 0.3), colorHighlight: rgba(p.isLight ? '#ffffff' : p.accent3, 0.9), highlights: r.range(0.05, 0.15), layering: r.range(0.3, 0.7), waves: r.range(0.2, 0.5), size: r.range(0.6, 1.4), scale: r.range(0.7, 1), speed: r.range(0.5, 1) })),
  paperPaperTexture: paper('PaperTexture', (r, p) => ({ fit: 'cover', scale: 1, colorBack: p.bg, colorPaper: mix(p.bg, p.accent, 0.15), colorShadow: mix(p.bg, p.fg, 0.25), roughness: r.range(0.2, 0.6), fiber: r.range(0.2, 0.6), folds: r.range(0.2, 0.8), wrinkles: r.range(0.4, 1), crumples: r.range(0, 0.6), drops: r.range(0, 0.4), seed: r.int(0, 100), angle: r.int(0, 360) })),
  paperGemSmoke: paper('GemSmoke', (r, p) => ({ colorBack: p.bg, colorInner: mix(p.bg, p.fg, 0.8), colors: [p.accent, p.accent2], outerGlow: r.range(0.3, 0.7), innerGlow: r.range(0.6, 1), innerDistortion: r.range(0.5, 1), outerDistortion: r.range(0.4, 0.8), offset: r.range(-0.3, 0.3), angle: r.int(0, 360), size: r.range(0.6, 0.9), shape: r.pick(SHAPES), scale: r.range(0.5, 0.8), speed: r.range(0.5, 1) })),
  paperLiquidMetal: paper('LiquidMetal', (r, p) => ({ colorBack: p.bg, colorTint: p.accent, distortion: r.range(0.05, 0.12), repetition: r.range(1.5, 3), shiftRed: r.range(0.1, 0.4), shiftBlue: r.range(0.1, 0.4), contour: r.range(0.2, 0.6), softness: r.range(0.05, 0.3), angle: r.int(0, 180), shape: r.pick(SHAPES), scale: r.range(0.5, 0.8), speed: r.range(0.5, 1) }))
};

const DEFS: Record<string, BackgroundDef> = { ...LEGACY, ...RB_ADDED, ...PAPER_ADDED };

// Canvas-2D / DOM renderers among the v0.1 pool.
const LEGACY_2D = new Set(['waves', 'dotGrid', 'letterGlitch']);

export const BACKGROUND_IDS = Object.keys(DEFS);

export interface BackgroundGene {
  id: string;
  props: Props;
}

// Round numbers so props stay readable in the export kit.
const tidy = (v: unknown): unknown =>
  typeof v === 'number'
    ? Math.round(v * 1000) / 1000
    : Array.isArray(v)
      ? v.map(tidy)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x)]))
        : v;

export const rollBackground = (rng: Rng, p: Palette): BackgroundGene => {
  const ids = BACKGROUND_IDS.filter(id => DEFS[id].when?.(p) ?? true);
  const id = rng.pick(ids);
  const props = Object.fromEntries(Object.entries(DEFS[id].props(rng, p)).map(([k, v]) => [k, tidy(v)]));
  return { id, props };
};

const isPaper = (id: string) => DEFS[id]?.source === 'paper';

// Component name for each background (used by the export kit).
export const backgroundComponentName = (id: string) => DEFS[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1);

export const backgroundUsesWebGL = (id: string): boolean => {
  const def = DEFS[id];
  if (!def) return false;
  if (def.webgl !== undefined) return def.webgl;
  return !LEGACY_2D.has(id);
};

const FILL = { width: '100%', height: '100%' };

export const backgroundKit = (gene: BackgroundGene): { importLine: string; jsx: string; install: string[] } => {
  const name = backgroundComponentName(gene.id);
  const props = JSON.stringify(gene.props);
  if (isPaper(gene.id)) {
    return {
      importLine: `import { ${name} } from '@paper-design/shaders-react';`,
      jsx: `<${name} {...${props}} style={{ width: '100%', height: '100%' }} />`,
      install: ['npm i @paper-design/shaders-react']
    };
  }
  return {
    importLine: `import ${name} from './components/${name}/${name}';`,
    jsx: `<${name} {...${props}} />`,
    install: [`npx shadcn@latest add @react-bits/${name}-TS-CSS`]
  };
};

export const Background = ({ gene }: { gene: BackgroundGene }) => {
  const { Component } = DEFS[gene.id];
  return isPaper(gene.id) ? <Component {...gene.props} style={FILL} /> : <Component {...gene.props} />;
};
