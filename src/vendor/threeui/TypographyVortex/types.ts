// ThreeUI Community MIT; see LICENSE.
export type TypographyVortexMode = "dark" | "light";

export type TypographyVortexOptions = {
  mode: TypographyVortexMode;
  seed: number;
  color: string;
  accent: string;
  backgroundColor: string;
  fontFamily: string;
  phrase: string;
  speed: number;
  ringGrowth: number;
  opacity: number;
  dissolveRadius: number;
  particleAmount: number;
  suctionDuration: number;
};

export function resolveMode(mode: TypographyVortexOptions["mode"] | number | string | undefined): TypographyVortexMode {
  if (mode === "light" || mode === 1 || mode === "1") return "light";
  return "dark";
}

export type Ring = {
  radius: number;
  fontSize: number;
  alpha: number;
  speed: number;
  offset: number;
  spacing: number;
  wobble: number;
  bitmap: HTMLCanvasElement;
  size: number;
};

export type Stray = {
  radius: number;
  angle: number;
  speed: number;
  character: string;
  alpha: number;
  fontSize: number;
};

export type Dust = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
  spin: number;
  color: string;
  sucked: boolean;
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = seed + 0x6d2b79f5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};


export const rgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
