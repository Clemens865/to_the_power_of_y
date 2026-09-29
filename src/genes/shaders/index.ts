import { VERTEX, fragmentFor } from './glsl';
import componentSource from './ShaderBackground.tsx?raw';
import ShaderBackground from './ShaderBackground';
import type { shaderProps } from './props';

// Export-kit side of the xʸ shader pack. Importing this pulls in all GLSL, so only the kit should.
export { SHADER_IDS, shaderProps } from './props';

const IMPORT_LINE = "import { VERTEX, fragmentFor } from './glsl';";

export const shaderKit = (props: ReturnType<typeof shaderProps>): { importLine: string; jsx: string; files: Record<string, string> } => {
  const inlined = [
    `const VERTEX = ${JSON.stringify(VERTEX)};`,
    `// "${props.shader}" from the xʸ shader pack (original code).`,
    `const FRAGMENT = ${JSON.stringify(fragmentFor(props.shader))};`,
    'const fragmentFor = (_id: string) => FRAGMENT;'
  ].join('\n');
  return {
    importLine: "import ShaderBackground from './ShaderBackground';",
    jsx: `<ShaderBackground {...${JSON.stringify(props)}} />`,
    files: { 'ShaderBackground.tsx': componentSource.replace(IMPORT_LINE, inlined) }
  };
};

export { ShaderBackground };
