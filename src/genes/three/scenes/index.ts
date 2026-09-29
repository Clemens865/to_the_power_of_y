import type { SceneBuilder } from '../common';
import dotField from './dotField';
import ringTunnel from './ringTunnel';
import orbitRings from './orbitRings';
import pointSphere from './pointSphere';
import terrainWire from './terrainWire';
import cubeDrift from './cubeDrift';
import helix from './helix';
import galaxySpiral from './galaxySpiral';
import lineStack from './lineStack';
import voxelSea from './voxelSea';
import knotPoints from './knotPoints';
import crystalCluster from './crystalCluster';

// Every scene builder in the xʸ 3D pack, keyed by id (same ids as THREE_SCENE_IDS in ../props).
export const SCENES: Record<string, SceneBuilder> = {
  dotField,
  ringTunnel,
  orbitRings,
  pointSphere,
  terrainWire,
  cubeDrift,
  helix,
  galaxySpiral,
  lineStack,
  voxelSea,
  knotPoints,
  crystalCluster
};
