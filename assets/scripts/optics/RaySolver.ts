import { Vec2 } from 'cc';
import {
  RayDefinition,
  RayImpactEvent,
  RaySegment,
  RayColor,
  SolveResult,
  SolveWorld,
  TargetHitResult,
} from '../core/LightTypes';
import { distanceAttenuation, rotateVec2, vecFromAngle } from '../utils/MathUtils';
import { findNearestCollision } from './Collision';
import { beamColorOrder, refract, reflect } from './Geometry';

const COLOR_TO_IOR: Record<Exclude<RayColor, 'white'>, number> = {
  red: 1.513,
  green: 1.517,
  blue: 1.523,
};

export class RaySolver {
  solve(world: SolveWorld): SolveResult {
    const segments: RaySegment[] = [];
    const impacts: RayImpactEvent[] = [];
    const targetHits: Record<string, TargetHitResult> = {};
    world.targets.forEach((target) => {
      targetHits[target.id] = {
        targetId: target.id,
        hit: false,
        color: null,
        intensity: 0,
      };
    });

    const queue: RayDefinition[] = world.sources.map((source) => ({
      origin: source.position.clone(),
      direction: vecFromAngle(source.angle),
      color: source.color,
      intensity: source.intensity,
      beamWidth: source.beamWidth,
      remainingDistance: world.rules.maxDistance,
      depth: 0,
      splitDepth: 0,
      sourceId: source.id,
    }));

    let emittedRays = queue.length;
    let energyUsed = 0;

    while (queue.length) {
      const ray = queue.shift()!;
      if (
        ray.intensity < world.rules.minIntensity ||
        ray.depth > world.rules.maxBounces ||
        ray.remainingDistance <= 0
      ) {
        continue;
      }

      const collision = findNearestCollision(ray, world);
      const distance = Math.min(collision.distance, ray.remainingDistance);
      const point = ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance));
      const intensityEnd = ray.intensity * distanceAttenuation(distance);

      segments.push({
        start: ray.origin.clone(),
        end: point.clone(),
        color: ray.color,
        beamWidth: ray.beamWidth,
        intensityStart: ray.intensity,
        intensityEnd,
        sourceId: ray.sourceId,
        hitType: collision.type,
      });

      energyUsed += intensityEnd;

      if (intensityEnd < world.rules.minIntensity) {
        continue;
      }

      impacts.push({
        point: point.clone(),
        type: collision.type,
        color: ray.color,
        intensity: intensityEnd,
        objectId: collision.objectId,
      });

      if (collision.type === 'mirror' && collision.mirror) {
        if (emittedRays >= world.rules.maxRays) {
          continue;
        }
        emittedRays += 1;
        const reflected = reflect(ray.direction, collision.normal);
        queue.push({
          ...ray,
          origin: point.clone().add(reflected.clone().multiplyScalar(1.2)),
          direction: reflected,
          intensity: intensityEnd * collision.mirror.reflectivity,
          remainingDistance: ray.remainingDistance - distance,
          depth: ray.depth + 1,
        });
        continue;
      }

      if (collision.type === 'prism' && collision.prism) {
        const travelLeft = ray.remainingDistance - distance;
        const baseDir = refract(ray.direction, collision.normal, 1 / 1.515);
        if (ray.color === 'white' && ray.splitDepth < world.rules.maxSplitDepth) {
          for (const item of beamColorOrder) {
            if (emittedRays >= world.rules.maxRays) {
              break;
            }
            emittedRays += 1;
            queue.push({
              origin: point.clone().add(baseDir.clone().multiplyScalar(1.4)),
              direction: rotateVec2(baseDir, item.offset * collision.prism.dispersion),
              color: item.color,
              intensity: intensityEnd * 0.34,
              beamWidth: ray.beamWidth * 0.92,
              remainingDistance: travelLeft,
              depth: ray.depth + 1,
              splitDepth: ray.splitDepth + 1,
              sourceId: ray.sourceId,
            });
          }
        } else if (ray.color !== 'white' && emittedRays < world.rules.maxRays) {
          emittedRays += 1;
          const ior = COLOR_TO_IOR[ray.color];
          const refracted = refract(ray.direction, collision.normal, 1 / ior);
          queue.push({
            ...ray,
            origin: point.clone().add(refracted.clone().multiplyScalar(1.4)),
            direction: rotateVec2(refracted, collision.prism.dispersion * 0.08),
            intensity: intensityEnd * 0.82,
            remainingDistance: travelLeft,
            depth: ray.depth + 1,
          });
        }
        continue;
      }

      if (collision.type === 'target' && collision.target) {
        const accepted = collision.target.acceptedColors.includes(ray.color);
        if (accepted && intensityEnd >= collision.target.requiredIntensity) {
          targetHits[collision.target.id] = {
            targetId: collision.target.id,
            hit: true,
            color: ray.color,
            intensity: intensityEnd,
          };
        }
        continue;
      }
    }

    const cleared = world.targets
      .filter((target) => target.required)
      .every((target) => targetHits[target.id]?.hit);

    return {
      segments,
      targetHits,
      impacts,
      energyUsed,
      cleared,
    };
  }
}
