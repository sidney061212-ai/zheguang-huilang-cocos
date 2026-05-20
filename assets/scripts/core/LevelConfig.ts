import { RayColor } from './LightTypes';

export interface LightSourceConfig {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: RayColor;
  intensity: number;
  beamWidth: number;
}

export interface MirrorConfig {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  movable: boolean;
  rotatable: boolean;
  reflectivity: number;
}

export interface PrismConfig {
  id: string;
  x: number;
  y: number;
  angle: number;
  size: number;
  movable: boolean;
  rotatable: boolean;
  dispersion: number;
}

export interface TargetConfig {
  id: string;
  x: number;
  y: number;
  radius: number;
  acceptedColors: RayColor[];
  requiredIntensity: number;
  required: boolean;
}

export interface ObstacleConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelRules {
  maxBounces: number;
  maxRays: number;
  maxDistance: number;
  minIntensity: number;
  maxSplitDepth: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  hint: string;
  playArea: {
    width: number;
    height: number;
  };
  sources: LightSourceConfig[];
  mirrors: MirrorConfig[];
  prisms: PrismConfig[];
  targets: TargetConfig[];
  obstacles: ObstacleConfig[];
  rules: LevelRules;
}
