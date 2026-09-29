import vantaSource from '../genes/bg/VantaBg.tsx?raw';
import vantaTypes from '../genes/bg/vanta.d.ts?raw';

// Vanta backgrounds in the export kit: our r186 compatibility adapter (VantaBg.tsx) is shipped as a file,
// narrowed to the one effect this universe uses. Vanta itself (MIT) comes from npm.

const EFFECT_MAP = /const EFFECTS: Record<VantaEffectName, \(\) => Promise<unknown>> = \{[\s\S]*?\n\};/;

export const vantaKit = (effect: string, options: Record<string, unknown>) => {
  const source = vantaSource
    .replace("import type { VantaEffectName } from './vantaOptions';", `type VantaEffectName = ${JSON.stringify(effect)};`)
    .replace(EFFECT_MAP, `const EFFECTS: Record<VantaEffectName, () => Promise<unknown>> = {\n  ${effect}: () => import('vanta/dist/vanta.${effect}.min.js')\n};`)
    .replace(/const BASE_SCALE: Partial<Record<VantaEffectName, \[number, number\]>>/, 'const BASE_SCALE: Partial<Record<string, [number, number]>>');
  return {
    importLine: "import VantaBg from './VantaBg';",
    jsx: `<VantaBg effect={${JSON.stringify(effect)}} options={${JSON.stringify(options)}} />`,
    install: ['npm i vanta three', 'npm i -D @types/three'],
    files: { 'VantaBg.tsx': source, 'vanta.d.ts': vantaTypes }
  };
};
