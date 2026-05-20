import { Vec2 } from 'cc';
import {
  LightColor,
  RayDefinition,
  RayHit,
  RayImpactEvent,
  RaySegment,
  SolveResult,
  SolveWorld,
  TargetHitReason,
  TargetHitResult,
  TargetHitState,
} from '../core/LightTypes';
import { findNearestCollision } from './Collision';
import {
  EPSILON,
  HIT_OFFSET,
  angleToVector,
  normalizeAngle,
  normalizeSafe,
  reflect,
  rotateByDegrees,
  vectorToAngle,
} from './Geometry';

const DEFAULT_MIRROR_REFLECTIVITY = 0.92;
const DEFAULT_PRISM_THROUGHPUT = 0.82;
const DEFAULT_PRISM_DISPERSION = 12;
const COLOR_PASS_OFFSETS: Record<LightColor, number> = {
  white: 0,
  red: -6,
  green: 0,
  blue: 6,
  yellow: -2,
  cyan: 2,
  magenta: 0,
};

const distanceFalloff = (distance: number) => Math.exp(-distance * 0.00215);

const buildTargetState = (targetId: string): TargetHitState => ({
  targetId,
  hit: false,
  completed: false,
  colorMatched: false,
  intensityEnough: false,
  bestIntensity: 0,
  reason: 'not_hit',
});

const isColorMatched = (acceptedColors: Array<LightColor | string>, color: LightColor) => {
  return acceptedColors.some((entry) => String(entry) === color);
};

const reasonPriority: Record<TargetHitReason, number> = {
  none: 3,
  low_intensity: 2,
  wrong_color: 1,
  not_hit: 0,
};

const chooseReason = (current: TargetHitReason, next: TargetHitReason): TargetHitReason => {
  return reasonPriority[next] > reasonPriority[current] ? next : current;
};

const makeSegment = (
  origin: Vec2,
  end: Vec2,
  ray: RayDefinition,
  intensityEnd: number,
  hitType: RaySegment['hitType'],
): RaySegment => ({
  from: origin.clone(),
  to: end.clone(),
  start: origin.clone(),
  end: end.clone(),
  color: ray.color,
  beamWidth: ray.beamWidth,
  intensityStart: ray.intensity,
  intensityEnd,
  depth: ray.depth,
  sourceId: ray.sourceId,
  hitType,
});

const enqueueRay = (
  queue: RayDefinition[],
  ray: RayDefinition,
  world: SolveWorld,
  emittedRef: { value: number },
) => {
  if (emittedRef.value >= world.rules.maxRays) {
    return;
  }
  if (ray.intensity < world.rules.minIntensity) {
    return;
  }
  if (ray.depth > world.rules.maxBounces) {
    return;
  }
  if (ray.remainingDistance <= EPSILON) {
    return;
  }
  emittedRef.value += 1;
  queue.push(ray);
};

const updateTargetState = (
  state: TargetHitState,
  acceptedColors: Array<LightColor | string>,
  requiredIntensity: number,
  color: LightColor,
  intensity: number,
) => {
  state.hit = true;
  if (intensity > state.bestIntensity) {
    state.bestIntensity = intensity;
    state.bestColor = color;
  }

  const colorMatched = isColorMatched(acceptedColors, color);
  if (!colorMatched) {
    state.reason = chooseReason(state.reason, 'wrong_color');
    return;
  }

  state.colorMatched = true;
  if (intensity >= requiredIntensity) {
    state.intensityEnough = true;
    state.completed = true;
    state.reason = 'none';
    return;
  }
  state.reason = chooseReason(state.reason, 'low_intensity');
};

export class RaySolver {
  solve(world: SolveWorld): SolveResult {
    const rays: RaySegment[] = [];
    const hits: RayHit[] = [];
    const targetStates: Record<string, TargetHitState> = {};
    world.targets.forEach((target) => {
      targetStates[target.id] = buildTargetState(target.id);
    });

    const queue: RayDefinition[] = world.sources.map((source) => ({
      origin: source.position.clone(),
      direction: normalizeSafe(angleToVector(source.angle)),
      color: source.color,
      intensity: source.intensity,
      beamWidth: source.beamWidth,
      remainingDistance: world.rules.maxDistance,
      depth: 0,
      splitDepth: 0,
      sourceId: source.id,
    }));

    const emittedRef = { value: queue.length };
    let energyUsed = 0;

    while (queue.length > 0 && rays.length < world.rules.maxRays) {
      const ray = queue.shift()!;
      if (ray.intensity < world.rules.minIntensity || ray.remainingDistance <= EPSILON || ray.depth > world.rules.maxBounces) {
        continue;
      }

      const collision = findNearestCollision(ray, world);
      if (!collision) {
        const endPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(ray.remainingDistance));
        const intensityEnd = ray.intensity * distanceFalloff(ray.remainingDistance);
        rays.push(makeSegment(ray.origin, endPoint, ray, intensityEnd, 'boundary'));
        energyUsed += intensityEnd;
        continue;
      }

      if (collision.distance > ray.remainingDistance) {
        const endPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(ray.remainingDistance));
        const intensityEnd = ray.intensity * distanceFalloff(ray.remainingDistance);
        rays.push(makeSegment(ray.origin, endPoint, ray, intensityEnd, 'boundary'));
        energyUsed += intensityEnd;
        continue;
      }

      const travelDistance = Math.min(collision.distance, ray.remainingDistance);
      if (travelDistance <= EPSILON) {
        continue;
      }

      const hitPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(travelDistance));
      const intensityEnd = ray.intensity * distanceFalloff(travelDistance);

      rays.push(makeSegment(ray.origin, hitPoint, ray, intensityEnd, collision.type));
      energyUsed += intensityEnd;

      if (intensityEnd < world.rules.minIntensity) {
        continue;
      }

      hits.push({
        type: collision.type,
        objectId: collision.objectId,
        point: hitPoint.clone(),
        color: ray.color,
        intensity: intensityEnd,
      });

      switch (collision.type) {
        case 'mirror': {
          const reflected = reflect(ray.direction, collision.normal);
          const reflectivity = collision.mirror?.reflectivity ?? DEFAULT_MIRROR_REFLECTIVITY;
          enqueueRay(queue, {
            ...ray,
            origin: hitPoint.clone().add(reflected.clone().multiplyScalar(HIT_OFFSET)),
            direction: reflected,
            intensity: intensityEnd * reflectivity,
            remainingDistance: ray.remainingDistance - travelDistance,
            depth: ray.depth + 1,
          }, world, emittedRef);
          break;
        }
        case 'prism': {
          const prism = collision.prism;
          if (!prism) {
            break;
          }
          const remainingDistance = ray.remainingDistance - travelDistance;
          const throughput = prism.throughput ?? DEFAULT_PRISM_THROUGHPUT;
          const dispersion = prism.dispersionAngle ?? prism.dispersion ?? DEFAULT_PRISM_DISPERSION;
          const baseAngle = vectorToAngle(ray.direction) + normalizeAngle(prism.angle) * 0.08;
          const baseDirection = normalizeSafe(angleToVector(baseAngle));

          if (ray.color === 'white' && ray.splitDepth < world.rules.maxSplitDepth) {
            const splitColors: Array<{ color: LightColor; offset: number }> = [
              { color: 'red', offset: -dispersion },
              { color: 'green', offset: 0 },
              { color: 'blue', offset: dispersion },
            ];
            splitColors.forEach((child) => {
              const direction = normalizeSafe(rotateByDegrees(baseDirection, child.offset));
              enqueueRay(queue, {
                ...ray,
                origin: hitPoint.clone().add(direction.clone().multiplyScalar(HIT_OFFSET)),
                direction,
                color: child.color,
                intensity: intensityEnd * throughput * 0.65,
                remainingDistance,
                depth: ray.depth + 1,
                splitDepth: ray.splitDepth + 1,
                beamWidth: ray.beamWidth * 0.92,
              }, world, emittedRef);
            });
          } else {
            const bend = COLOR_PASS_OFFSETS[ray.color];
            const direction = normalizeSafe(rotateByDegrees(baseDirection, bend));
            enqueueRay(queue, {
              ...ray,
              origin: hitPoint.clone().add(direction.clone().multiplyScalar(HIT_OFFSET)),
              direction,
              intensity: intensityEnd * throughput * 0.65,
              remainingDistance,
              depth: ray.depth + 1,
            }, world, emittedRef);
          }
          break;
        }
        case 'target': {
          const target = collision.target;
          if (!target) {
            break;
          }
          updateTargetState(
            targetStates[target.id],
            target.acceptedColors,
            target.requiredIntensity,
            ray.color,
            intensityEnd,
          );

          enqueueRay(queue, {
            ...ray,
            origin: hitPoint.clone().add(ray.direction.clone().multiplyScalar(HIT_OFFSET)),
            intensity: intensityEnd * 0.98,
            remainingDistance: ray.remainingDistance - travelDistance,
          }, world, emittedRef);
          break;
        }
        case 'obstacle':
        case 'boundary':
        default:
          break;
      }
    }

    const targetHits: Record<string, TargetHitResult> = {};
    world.targets.forEach((target) => {
      const state = targetStates[target.id] ?? buildTargetState(target.id);
      if (!state.hit) {
        state.reason = 'not_hit';
      }
      targetHits[target.id] = {
        targetId: state.targetId,
        hit: state.completed,
        color: state.bestColor ?? null,
        intensity: state.bestIntensity,
      };
    });

    const impacts: RayImpactEvent[] = hits.map((hit) => ({
      point: new Vec2(hit.point.x, hit.point.y),
      type: hit.type,
      color: hit.color,
      intensity: hit.intensity,
      objectId: hit.objectId ?? 'unknown',
    }));

    const cleared = world.targets
      .filter((target) => target.required)
      .every((target) => targetStates[target.id]?.completed);

    return {
      rays,
      hits,
      targetStates,
      segments: rays,
      impacts,
      targetHits,
      energyUsed,
      cleared,
    };
  }
}
