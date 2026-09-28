import type { CSSProperties, ReactNode } from 'react';
import type { Rng } from '../engine/rng';
import type { Palette } from '../engine/palette';
import ElectricBorder from '../vendor/react-bits/ElectricBorder/ElectricBorder';
import GlareHover from '../vendor/react-bits/GlareHover/GlareHover';
import Magnet from '../vendor/react-bits/Magnet/Magnet';
import ClickSpark from '../vendor/react-bits/ClickSpark/ClickSpark';

import type { Shape, Skin, Idle } from './buttonCss';

// Order of these lists is part of the seed contract: append, don't reorder.
const SHAPES: Shape[] = ['pill', 'square', 'rounded', 'circle', 'blob', 'ticket', 'hex', 'slant'];
const SKINS: Skin[] = ['solid', 'outline', 'glass', 'brutal', 'neon', 'emboss', 'gradient', 'invert', 'naked'];
const WRAPS = ['none', 'none', 'electric', 'glare'] as const;
const IDLES: Idle[] = ['none', 'none', 'breathe', 'wobble', 'float', 'spin-border'];

export interface ButtonGene {
  shape: Shape;
  skin: Skin;
  wrap: (typeof WRAPS)[number];
  idle: Idle;
  size: number; // rem
  magnet: boolean;
  spark: boolean;
}

export const rollButton = (rng: Rng): ButtonGene => ({
  shape: rng.pick(SHAPES),
  skin: rng.pick(SKINS),
  wrap: rng.pick(WRAPS),
  idle: rng.pick(IDLES),
  size: rng.range(1.2, 4.2),
  magnet: rng.chance(0.4),
  spark: rng.chance(0.5)
});

// Text colour that stays readable on the chosen skin.
export const labelColor = (gene: ButtonGene, p: Palette): string =>
  gene.skin === 'solid' || gene.skin === 'brutal' || gene.skin === 'emboss' ? p.bg : gene.skin === 'invert' ? '#fff' : p.fg;

export const XButton = ({ gene, palette, onPress, onHover, children }: { gene: ButtonGene; palette: Palette; onPress: (e: React.MouseEvent) => void; onHover?: () => void; children: ReactNode }) => {
  const style = {
    '--bg': palette.bg,
    '--fg': palette.fg,
    '--a1': palette.accent,
    '--a2': palette.accent2,
    '--a3': palette.accent3,
    '--size': `${gene.size}rem`,
    color: labelColor(gene, palette)
  } as CSSProperties;

  let node: ReactNode = (
    <button type="button" className={`xbtn shape-${gene.shape} skin-${gene.skin} idle-${gene.idle}`} style={style} onClick={onPress} onMouseEnter={onHover} aria-label="Change everything">
      <span className="xbtn-label">{children}</span>
    </button>
  );

  if (gene.wrap === 'electric') {
    node = (
      <ElectricBorder color={palette.accent} speed={1} chaos={0.12} borderRadius={gene.shape === 'pill' || gene.shape === 'circle' ? 999 : 12}>
        {node}
      </ElectricBorder>
    );
  } else if (gene.wrap === 'glare') {
    node = (
      <GlareHover width="auto" height="auto" background="transparent" borderColor="transparent" borderRadius="999px" glareColor={palette.fg} glareOpacity={0.4}>
        {node}
      </GlareHover>
    );
  }
  if (gene.magnet) node = <Magnet padding={120} magnetStrength={3}>{node}</Magnet>;
  return gene.spark ? (
    <ClickSpark sparkColor={palette.accent2} sparkCount={12} sparkRadius={40} sparkSize={14}>
      {node}
    </ClickSpark>
  ) : (
    node
  );
};
