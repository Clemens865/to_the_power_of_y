// Minimal types for zzfx (MIT, https://github.com/KilledByAPixel/ZzFX), which ships none.
declare module 'zzfx' {
  export const ZZFX: {
    sampleRate: number;
    buildSamples(...parameters: number[]): number[];
  };
}
