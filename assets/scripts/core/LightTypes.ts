import { Color, Vec2 } from 'cc';

export type RayColor = 'white' | 'red' | 'green' | 'blue';
export type HitType = 'mirror' | 'prism' | 'target' | 'obstacle' | 'boundary';

export interface RayDefinition {
  origin: Vec2;
  direction: Vec2;
  color: RayColor;
  intensity: number;
  beamWidth: number;
  remainingDistance: number;
  depth: number;
  splitDepth: number;
  sourceId: string;
}

export interface RaySegment {
  start: Vec2;
  end: Vec2;
  color: RayColor;
  beamWidth: number;
  intensityStart: number;
  intensityEnd: number;
  sourceId: string;
  hitType: HitType;
}

export interface RayImpactEvent {
  point: Vec2;
  type: HitType;
  color: RayColor;
  intensity: number;
  objectId: string;
}

export interface SourceSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  color: RayColor;
  intensity: number;
  beamWidth: number;
}

export interface MirrorSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  length: number;
  reflectivity: number;
}

export interface PrismSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  size: number;
  dispersion: number;
}

export interface TargetSnapshot {
  id: string;
  position: Vec2;
  radius: number;
  acceptedColors: RayColor[];
  requiredIntensity: number;
  required: boolean;
}

export interface ObstacleSnapshot {
  id: string;
  position: Vec2;
  width: number;
  height: number;
}

export interface TargetHitResult {
  targetId: string;
  hit: boolean;
  color: RayColor | null;
  intensity: number;
}

export interface SolveWorld {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rules: {
    maxBounces: number;
    maxRays: number;
    maxDistance: number;
    minIntensity: number;
    maxSplitDepth: number;
  };
  sources: SourceSnapshot[];
  mirrors: MirrorSnapshot[];
  prisms: PrismSnapshot[];
  targets: TargetSnapshot[];
  obstacles: ObstacleSnapshot[];
}

export interface SolveResult {
  segments: RaySegment[];
  targetHits: Record<string, TargetHitResult>;
  impacts: RayImpactEvent[];
  energyUsed: number;
  cleared: boolean;
}

export const RAY_COLORS: RayColor[] = ['white', 'red', 'green', 'blue'];

export const colorToDisplayColor = (color: RayColor) => {
  switch (color) {
    case 'red':
      return new Color(255, 112, 128, 255);
    case 'green':
      return new Color(120, 234, 164, 255);
    case 'blue':
      return new Color(116, 190, 255, 255);
    default:
      return new Color(243, 249, 255, 255);
  }
};
