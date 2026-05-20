import { Color, Vec2 } from 'cc';

export type LightColor = 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta';
export type RayColor = LightColor;
export type HitType = 'mirror' | 'prism' | 'target' | 'obstacle' | 'boundary';

export interface Vec2Like {
  x: number;
  y: number;
}

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RayDefinition {
  origin: Vec2;
  direction: Vec2;
  color: LightColor;
  intensity: number;
  beamWidth: number;
  remainingDistance: number;
  depth: number;
  splitDepth: number;
  sourceId: string;
}

export interface RaySegment {
  from: Vec2;
  to: Vec2;
  start: Vec2;
  end: Vec2;
  color: LightColor;
  beamWidth: number;
  intensityStart: number;
  intensityEnd: number;
  depth: number;
  sourceId: string;
  hitType: HitType;
}

export interface RayHit {
  type: HitType;
  objectId?: string;
  point: Vec2;
  color: LightColor;
  intensity: number;
}

export interface RayImpactEvent {
  point: Vec2;
  type: HitType;
  color: LightColor;
  intensity: number;
  objectId: string;
}

export type TargetHitReason = 'none' | 'wrong_color' | 'low_intensity' | 'not_hit';

export interface TargetHitState {
  targetId: string;
  hit: boolean;
  completed: boolean;
  colorMatched: boolean;
  intensityEnough: boolean;
  bestColor?: LightColor;
  bestIntensity: number;
  reason: TargetHitReason;
}

export interface TargetHitResult {
  targetId: string;
  hit: boolean;
  color: LightColor | null;
  intensity: number;
}

export interface SourceSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  color: LightColor;
  intensity: number;
  beamWidth: number;
}

export interface MirrorSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  length: number;
  reflectivity?: number;
}

export interface PrismSnapshot {
  id: string;
  position: Vec2;
  angle: number;
  size: number;
  dispersion: number;
  dispersionAngle?: number;
  throughput?: number;
}

export interface TargetSnapshot {
  id: string;
  position: Vec2;
  radius: number;
  acceptedColors: Array<LightColor | string>;
  requiredIntensity: number;
  required: boolean;
  chargeTime?: number;
}

export interface ObstacleSnapshot {
  id: string;
  position: Vec2;
  width: number;
  height: number;
  angle?: number;
}

export interface SolveWorld {
  bounds: RectLike;
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

export interface RaySolveResult {
  rays: RaySegment[];
  hits: RayHit[];
  targetStates: Record<string, TargetHitState>;
}

export interface SolveResult extends RaySolveResult {
  segments: RaySegment[];
  impacts: RayImpactEvent[];
  targetHits: Record<string, TargetHitResult>;
  energyUsed?: number;
  cleared?: boolean;
}

export const RAY_COLORS: LightColor[] = ['white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];

export const colorToDisplayColor = (color: LightColor) => {
  switch (color) {
    case 'red':
      return new Color(255, 112, 128, 255);
    case 'green':
      return new Color(120, 234, 164, 255);
    case 'blue':
      return new Color(116, 190, 255, 255);
    case 'yellow':
      return new Color(255, 220, 116, 255);
    case 'cyan':
      return new Color(108, 240, 240, 255);
    case 'magenta':
      return new Color(236, 138, 255, 255);
    default:
      return new Color(243, 249, 255, 255);
  }
};
