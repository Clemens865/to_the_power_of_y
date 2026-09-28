import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Rng } from '../engine/rng';
import { hexToRgb01, type Palette } from '../engine/palette';

// Each background is a React Bits effect plus a mapping from (rng, palette) to its props.
type Props = Record<string, unknown>;
interface BackgroundDef {
  Component: LazyExoticComponent<ComponentType<any>>;
  props: (rng: Rng, p: Palette) => Props;
}

const hueOf = (p: Palette) => p.hue;

const DEFS: Record<string, BackgroundDef> = {
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

export const BACKGROUND_IDS = Object.keys(DEFS);

export interface BackgroundGene {
  id: string;
  props: Props;
}

// Round numbers so props stay readable in the export kit.
const tidy = (v: unknown): unknown =>
  typeof v === 'number' ? Math.round(v * 1000) / 1000 : Array.isArray(v) ? v.map(tidy) : v;

export const rollBackground = (rng: Rng, p: Palette): BackgroundGene => {
  const id = rng.pick(BACKGROUND_IDS);
  const props = Object.fromEntries(Object.entries(DEFS[id].props(rng, p)).map(([k, v]) => [k, tidy(v)]));
  return { id, props };
};

// React Bits component name for each background (used by the export kit).
export const backgroundComponentName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

export const Background = ({ gene }: { gene: BackgroundGene }) => {
  const { Component } = DEFS[gene.id];
  return <Component {...gene.props} />;
};
