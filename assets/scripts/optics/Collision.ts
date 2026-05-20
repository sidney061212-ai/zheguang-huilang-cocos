import { Rect, Vec2 } from 'cc';
import { HitType, MirrorSnapshot, PrismSnapshot, RayDefinition, SolveWorld, TargetSnapshot } from '../core/LightTypes';
import {
  buildMirrorEndpoints,
  buildPrismPoints,
  intersectRayAabb,
  intersectRayCircle,
  intersectRaySegment,
  intersectRayPolygon,
  intersectRayRectBoundary,
  prismEdgeNormal,
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

export const findNearestCollision = (ray: RayDefinition, world: SolveWorld): CollisionResult => {
  const bounds = new Rect(world.bounds.x, world.bounds.y, world.bounds.width, world.bounds.height);
  const candidates: CollisionResult[] = [];
  const boundaryHit = intersectRayRectBoundary(ray.origin, ray.direction, bounds);
  if (boundaryHit) {
    candidates.push({
      type: 'boundary',
      objectId: 'play-area',
      point: boundaryHit.point,
      distance: boundaryHit.distance,
      normal: boundaryHit.normal,
    });
  }
  world.mirrors.forEach((mirror) => {
    const endpoints = buildMirrorEndpoints(mirror.position, mirror.angle, mirror.length);
    const hit = intersectRaySegment(ray.origin, ray.direction, endpoints.start, endpoints.end);
    if (hit) {
      const axis = endpoints.end.clone().subtract(endpoints.start).normalize();
      let normal = new Vec2(-axis.y, axis.x);
      if (normal.dot(ray.direction) > 0) {
        normal = normal.multiplyScalar(-1);
      }
      candidates.push({
        type: 'mirror',
        objectId: mirror.id,
        point: hit.point,
        distance: hit.distance,
        normal,
        mirror,
      });
    }
  });
  world.prisms.forEach((prism) => {
    const points = buildPrismPoints(prism);
    const hit = intersectRayPolygon(ray.origin, ray.direction, points);
    if (hit) {
      let normal = prismEdgeNormal(points, hit.edgeIndex, prism.position);
      if (normal.dot(ray.direction) > 0) {
        normal = normal.multiplyScalar(-1);
      }
      candidates.push({
        type: 'prism',
        objectId: prism.id,
        point: hit.point,
        distance: hit.distance,
        normal,
        prism,
      });
    }
  });
  world.targets.forEach((target) => {
    const hit = intersectRayCircle(ray.origin, ray.direction, target.position, target.radius);
    if (hit) {
      const normal = hit.point.clone().subtract(target.position).normalize();
      candidates.push({
        type: 'target',
        objectId: target.id,
        point: hit.point,
        distance: hit.distance,
        normal,
        target,
      });
    }
  });
  world.obstacles.forEach((obstacle) => {
    const rect = new Rect(
      obstacle.position.x - obstacle.width * 0.5,
      obstacle.position.y - obstacle.height * 0.5,
      obstacle.width,
      obstacle.height,
    );
    const hit = intersectRayAabb(ray.origin, ray.direction, rect);
    if (hit) {
      candidates.push({
        type: 'obstacle',
        objectId: obstacle.id,
        point: hit.point,
        distance: hit.distance,
        normal: hit.normal,
      });
    }
  });
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
};
