import componentSource from './ThreeScene.tsx?raw';
import commonSource from './common.ts?raw';
import type { ThreeSceneGeneProps } from './props';

// Export-kit side of the xʸ 3D scene pack. Importing this pulls in every scene's source text,
// so only the lazily loaded kit should. The generated ThreeScene.tsx needs only react + three.
export { THREE_SCENE_IDS, threeSceneProps, type ThreeSceneGeneProps } from './props';

const SCENE_SOURCES = import.meta.glob('./scenes/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const COMMON_IMPORT = "import { seeded, type SharedUniforms, type SceneCtx } from './common';";
const SCENES_IMPORT = "import { SCENES } from './scenes';";
const IMPORT_RE = /^import [^;]*;\n/gm;

const swap = (src: string, find: string, put: string) => {
  if (!src.includes(find)) throw new Error(`[xy] three kit: "${find}" not found`);
  return src.replace(find, () => put);
};

/** Self-contained ThreeScene.tsx holding the component, the shared helpers and only the chosen scene. */
export const threeSceneSource = (scene: string): string => {
  const sceneSrc = SCENE_SOURCES[`./scenes/${scene}.ts`];
  if (!sceneSrc) throw new Error(`[xy] three kit: unknown scene "${scene}"`);
  const common = commonSource.replace(IMPORT_RE, '').replace(/^export /gm, '').trim();
  const builder = sceneSrc.replace(IMPORT_RE, '').replace('export default function build', 'function build').trim();
  const head = `// xʸ 3D scene pack — "${scene}" (original code). Needs: react, three.\n`;
  let out = swap(componentSource, COMMON_IMPORT, `// ---- shared helpers ----\n${common}`);
  out = swap(out, SCENES_IMPORT, `// ---- scene: ${scene} ----\n${builder}\n\nconst SCENES: Record<string, SceneBuilder> = { ${JSON.stringify(scene)}: build };`);
  return head + out;
};

export const threeSceneKit = (props: ThreeSceneGeneProps): { importLine: string; jsx: string; files: Record<string, string>; install: string[] } => ({
  importLine: "import ThreeScene from './ThreeScene';",
  jsx: `<ThreeScene {...${JSON.stringify(props)}} />`,
  files: { 'ThreeScene.tsx': threeSceneSource(props.scene) },
  install: ['npm i three', 'npm i -D @types/three']
});
