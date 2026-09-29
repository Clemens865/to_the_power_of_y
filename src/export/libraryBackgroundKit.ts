import type { BackgroundGene } from '../genes/backgrounds';
import { LIBRARY_BACKGROUND_IDS } from '../genes/bg/library';
import surfaceSource from '../genes/bg/librarySurface.tsx?raw';
import vortexSource from '../vendor/threeui/TypographyVortex/TypographyVortex.tsx?raw';
import vortexRendererSource from '../vendor/threeui/TypographyVortex/typographyVortexRenderer.ts?raw';
import vortexTypesSource from '../vendor/threeui/TypographyVortex/types.ts?raw';
import vortexLicense from '../vendor/threeui/TypographyVortex/LICENSE?raw';

export interface LibraryBackgroundKit {
  importLine: string;
  jsx: string;
  files: Record<string, string>;
  install: string[];
}

/** Ships our adapter and MIT ThreeUI source; React Bits always comes from its official registry. */
export function libraryBackgroundKit(gene: BackgroundGene): LibraryBackgroundKit | null {
  if (!(LIBRARY_BACKGROUND_IDS as readonly string[]).includes(gene.id)) return null;
  const name = gene.id.charAt(0).toUpperCase() + gene.id.slice(1);
  const vortex = gene.id === 'typographyVortex';
  const { surface, ...componentProps } = gene.props;
  const files: Record<string, string> = {
    'LibrarySurface.tsx': surfaceSource,
    'LibraryBackground.tsx': `import ${name} from './components/${name}/${name}';
import { LibrarySurface } from './LibrarySurface';

export default function LibraryBackground() {
  return <LibrarySurface {...${JSON.stringify(surface)}}>
    <${name} {...${JSON.stringify(componentProps)}} />
  </LibrarySurface>;
}
`
  };
  if (vortex) {
    files['components/TypographyVortex/TypographyVortex.tsx'] = vortexSource;
    files['components/TypographyVortex/typographyVortexRenderer.ts'] = vortexRendererSource;
    files['components/TypographyVortex/types.ts'] = vortexTypesSource;
    files['components/TypographyVortex/LICENSE'] = vortexLicense;
  } else {
    files['LIBRARY-BACKGROUND.md'] = `# ${name}\n\nInstall from the official React Bits registry with the command in README.\nThe component source is excluded from this kit under its MIT + Commons Clause terms.\nThe live page uses the cached TS-CSS variant from revision\n5d0c00e7594c898e989b250d022806961f4c8478; future registry versions may differ.\n\nFor the live page's GPU budget, open components/${name}/${name}.tsx after installation\nand cap the renderer's dpr at 1.25:\n\n\`\`\`ts\ndpr: Math.min(window.devicePixelRatio || 1, 1.25)\n\`\`\`\n\nLibrarySurface supplies the same palette veil, pointer forwarding, reduced-motion\nstatic fallback, and offscreen/hidden cleanup as the live page.\n`;
  }
  return {
    importLine: "import LibraryBackground from './LibraryBackground';",
    jsx: '<LibraryBackground />',
    files,
    install: vortex ? [] : [`npx shadcn@latest add @react-bits/${name}-TS-CSS`]
  };
}
