import { LightColor, RectLike, Vec2Like } from './LightTypes';

export interface LightSourceConfig {
  id: string;
  position: Vec2Like;
  x: number;
  y: number;
  angle: number;
  color: LightColor;
  intensity: number;
  beamWidth: number;
}

export interface MirrorConfig {
  id: string;
  position: Vec2Like;
  x: number;
  y: number;
  angle: number;
  length: number;
  movable: boolean;
  rotatable: boolean;
  moveBounds?: RectLike;
  reflectivity?: number;
}

export interface PrismConfig {
  id: string;
  position: Vec2Like;
  x: number;
  y: number;
  angle: number;
  size: number;
  movable: boolean;
  rotatable: boolean;
  moveBounds?: RectLike;
  dispersion: number;
  dispersionAngle?: number;
  throughput?: number;
}

export interface TargetConfig {
  id: string;
  position: Vec2Like;
  x: number;
  y: number;
  radius: number;
  acceptedColors: Array<LightColor | string>;
  requiredIntensity: number;
  chargeTime: number;
  required: boolean;
}

export interface ObstacleConfig {
  id: string;
  position: Vec2Like;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
}

export interface LevelRules {
  maxDistance: number;
  maxBounces: number;
  maxRays: number;
  maxSplitDepth: number;
  minIntensity: number;
}

export interface LevelConfig {
  // Keep string key compatibility for existing GameState/LevelSelect flow.
  id: string;
  numericId: number;
  name: string;
  shortName: string;
  hint: string;
  teachingGoal: string;
  chargeTime: number;
  sources: LightSourceConfig[];
  mirrors: MirrorConfig[];
  prisms: PrismConfig[];
  targets: TargetConfig[];
  obstacles: ObstacleConfig[];
  rules: LevelRules;
  recommendedSolution?: string;
}
