import { Rect, Vec2 } from 'cc';
import { HitType, MirrorSnapshot, PrismSnapshot, RayDefinition, SolveWorld, TargetSnapshot } from '../core/LightTypes';
import {
  EPSILON,
  buildMirrorEndpoints,
  dot,
  intersectRayAabb,
  intersectRayCircle,
  intersectRaySegment,
  intersectRayRectBoundary,
} from './Geometry';

export interface CollisionResult {
  type: HitType;
  objectId: string;
  point: Vec2;
  distance: number;
  normal: Vec2;
  mirror?: MirrorSnapshot;
  prism?: PrismSnapshot;
  target?: TargetSnapshot;
}

const HIT_PRIORITY: Record<HitType, number> = {
  obstacle: 1,
  mirror: 2,
  prism: 3,
  target: 4,
  boundary: 5,
};

const pickBetter = (best: CollisionResult | null, candidate: CollisionResult) => {
  if (!best) {
    return candidate;
  }
  const delta = candidate.distance - best.distance;
  if (Math.abs(delta) > EPSILON) {
    return delta < 0 ? candidate : best;
  }
  return HIT_PRIORITY[candidate.type] < HIT_PRIORITY[best.type] ? candidate : best;
};

export const findNearestCollision = (ray: RayDefinition, world: SolveWorld): CollisionResult | null => {
  let nearest: CollisionResult | null = null;

  const boundaryHit = intersectRayRectBoundary(ray.origin, ray.direction, world.bounds);
  if (boundaryHit && boundaryHit.distance > EPSILON) {
    nearest = pickBetter(nearest, {
      type: 'boundary',
      objectId: 'play-area',
      point: boundaryHit.point,
      distance: boundaryHit.distance,
      normal: boundaryHit.normal,
    });
  }

  for (const obstacle of world.obstacles) {
    const rect = new Rect(
      obstacle.position.x - obstacle.width * 0.5,
      obstacle.position.y - obstacle.height * 0.5,
      obstacle.width,
      obstacle.height,
    );
    const hit = intersectRayAabb(ray.origin, ray.direction, rect);
    if (!hit || hit.distance <= EPSILON) {
      continue;
    }
    nearest = pickBetter(nearest, {
      type: 'obstacle',
      objectId: obstacle.id,
      point: hit.point,
      distance: hit.distance,
      normal: hit.normal,
    });
  }

  for (const mirror of world.mirrors) {
    const endpoints = buildMirrorEndpoints(mirror);
    const hit = intersectRaySegment(ray.origin, ray.direction, endpoints.start, endpoints.end);
    if (!hit || hit.distance <= EPSILON) {
      continue;
    }

    const mirrorDir = endpoints.end.clone().subtract(endpoints.start).normalize();
    let normal = new Vec2(-mirrorDir.y, mirrorDir.x);
    if (dot(normal, ray.direction) > 0) {
      normal = normal.multiplyScalar(-1);
    }

    nearest = pickBetter(nearest, {
      type: 'mirror',
      objectId: mirror.id,
      point: hit.point,
      distance: hit.distance,
      normal,
      mirror,
    });
  }

  for (const prism of world.prisms) {
    const radius = Math.max(8, prism.size * 0.5);
    const hit = intersectRayCircle(ray.origin, ray.direction, prism.position, radius);
    if (!hit || hit.distance <= EPSILON) {
      continue;
    }
    let normal = hit.point.clone().subtract(prism.position).normalize();
    if (dot(normal, ray.direction) > 0) {
      normal = normal.multiplyScalar(-1);
    }
    nearest = pickBetter(nearest, {
      type: 'prism',
      objectId: prism.id,
      point: hit.point,
      distance: hit.distance,
      normal,
      prism,
    });
  }

  for (const target of world.targets) {
    const hit = intersectRayCircle(ray.origin, ray.direction, target.position, target.radius);
    if (!hit || hit.distance <= EPSILON) {
      continue;
    }
    let normal = hit.point.clone().subtract(target.position).normalize();
    if (dot(normal, ray.direction) > 0) {
      normal = normal.multiplyScalar(-1);
    }
    nearest = pickBetter(nearest, {
      type: 'target',
      objectId: target.id,
      point: hit.point,
      distance: hit.distance,
      normal,
      target,
    });
  }

  return nearest;
};
