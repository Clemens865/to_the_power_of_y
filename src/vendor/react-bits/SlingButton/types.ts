import type { ReactNode } from 'react';

export type SlingAxis = 'any' | 'horizontal' | 'vertical';

export interface SlingButtonProps {
  children?: ReactNode;
  onSend?: () => void;
  padColor?: string;
  iconColor?: string;
  accentColor?: string;
  wellColor?: string;
  bandColor?: string;
  size?: number;
  strokeWidth?: number;
  armAt?: number;
  maxPull?: number;
  launchSpeed?: number;
  recoil?: number;
  flight?: number;
  particles?: number;
  spread?: number;
  axis?: SlingAxis;
  tapSends?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export interface Sample {
  x: number;
  y: number;
  t: number;
}

export interface Grip {
  id: number;
  startX: number;
  startY: number;
  scale: number;
  moved: boolean;
  hist: Sample[];
  rawOrigin: { x: number; y: number };
  slop: number;
}

