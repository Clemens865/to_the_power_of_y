import type { CSSProperties } from 'react';

export interface ElasticMeshProps {
  image?: string;
  color1?: string;
  color2?: string;
  highlight?: string;
  showGrid?: boolean;
  gridDensity?: number;
  gridOpacity?: number;
  gridColor?: string;
  borderRadius?: number;
  stiffness?: number;
  damping?: number;
  grabRadius?: number;
  pull?: number;
  wobble?: number;
  tilt?: number;
  shading?: number;
  resolution?: number;
  interaction?: 'hover' | 'drag';
  enabled?: boolean;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}
