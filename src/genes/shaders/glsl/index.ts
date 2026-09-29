import { PRELUDE } from './common';
import marble from './marble';
import topo from './topo';
import truchet from './truchet';
import kaleido from './kaleido';
import moire from './moire';
import hexpulse from './hexpulse';
import metaballs from './metaballs';
import tunnel from './tunnel';
import liquid from './liquid';
import led from './led';
import glass from './glass';
import aurora from './aurora';
import oprings from './oprings';
import halftone from './halftone';

export { VERTEX, PRELUDE } from './common';

// Shader bodies (main() plus helpers); each is prefixed with PRELUDE to form the fragment shader.
export const SHADER_BODIES: Record<string, string> = {
  marble,
  topo,
  truchet,
  kaleido,
  moire,
  hexpulse,
  metaballs,
  tunnel,
  liquid,
  led,
  glass,
  aurora,
  oprings,
  halftone
};

export const fragmentFor = (id: string): string => PRELUDE + (SHADER_BODIES[id] ?? SHADER_BODIES.marble);
