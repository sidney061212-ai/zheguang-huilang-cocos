import { Rect, Vec2 } from 'cc';
import { MirrorSnapshot, RectLike } from '../core/LightTypes';
import { vecFromAngle } from '../utils/MathUtils';

export const EPSILON = 0.001;
export const HIT_OFFSET = 0.5;

export interface SegmentIntersection {
  point: Vec2;
  distance: number;
}

export interface RayAabbHit extends SegmentIntersection {
  normal: Vec2;
}

export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

export const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;

export const normalizeSafe = (vector: Vec2) => {
  const out = vector.clone();
  if (out.lengthSqr() < EPSILON * EPSILON) {
    return new Vec2(1, 0);
  }
  out.normalize();
  return out;
};

export const angleToVector = (degrees: number) => normalizeSafe(vecFromAngle(degrees));

export const vectorToAngle = (vector: Vec2) => (Math.atan2(vector.y, vector.x) * 180) / Math.PI;

export const normalizeAngle = (angle: number) => {
  let out = angle % 360;
  if (out > 180) out -= 360;
  if (out <= -180) out += 360;
  return out;
};

export const rotateByDegrees = (vector: Vec2, degrees: number) => {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return new Vec2(
    vector.x * cos - vector.y * sin,
    vector.x * sin + vector.y * cos,
  );
};

export const reflect = (direction: Vec2, normal: Vec2) => {
  const d = normalizeSafe(direction);
  const n = normalizeSafe(normal);
  const k = 2 * dot(d, n);
  return normalizeSafe(d.subtract(n.clone().multiplyScalar(k)));
};

export const buildMirrorEndpoints = (mirror: MirrorSnapshot) => {
  const tangent = angleToVector(mirror.angle);
  const half = mirror.length * 0.5;
  const center = mirror.position.clone();
  return {
    start: center.clone().subtract(tangent.clone().multiplyScalar(half)),
    end: center.clone().add(tangent.clone().multiplyScalar(half)),
    tangent,
  };
};

export const intersectRaySegment = (origin: Vec2, direction: Vec2, start: Vec2, end: Vec2): SegmentIntersection | null => {
  const rayDir = normalizeSafe(direction);
  const seg = end.clone().subtract(start);
  const denom = cross(rayDir, seg);
  if (Math.abs(denom) <= EPSILON) {
    return null;
  }
  const fromStart = start.clone().subtract(origin);
  const t = cross(fromStart, seg) / denom;
  const u = cross(fromStart, rayDir) / denom;
  if (t <= EPSILON) {
    return null;
  }
  if (u < -EPSILON || u > 1 + EPSILON) {
    return null;
  }
  return {
    point: origin.clone().add(rayDir.clone().multiplyScalar(t)),
    distance: t,
  };
};

export const intersectRayCircle = (origin: Vec2, direction: Vec2, center: Vec2, radius: number): SegmentIntersection | null => {
  const rayDir = normalizeSafe(direction);
  const oc = origin.clone().subtract(center);
  const b = 2 * dot(oc, rayDir);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) {
    return null;
  }
  const sqrt = Math.sqrt(disc);
  const t1 = (-b - sqrt) * 0.5;
  const t2 = (-b + sqrt) * 0.5;
  let t = Number.POSITIVE_INFINITY;
  if (t1 > EPSILON) t = Math.min(t, t1);
  if (t2 > EPSILON) t = Math.min(t, t2);
  if (!Number.isFinite(t)) {
    return null;
  }
  return {
    point: origin.clone().add(rayDir.clone().multiplyScalar(t)),
    distance: t,
  };
};

const asRect = (rectLike: RectLike | Rect) => {
  if (rectLike instanceof Rect) {
    return rectLike;
  }
  return new Rect(rectLike.x, rectLike.y, rectLike.width, rectLike.height);
};

export const intersectRayAabb = (origin: Vec2, direction: Vec2, rectLike: RectLike | Rect): RayAabbHit | null => {
  const rect = asRect(rectLike);
  const rayDir = normalizeSafe(direction);
  let tMin = -Number.MAX_VALUE;
  let tMax = Number.MAX_VALUE;
  let enterNormal = new Vec2(0, 0);

  const updateAxis = (originValue: number, dirValue: number, min: number, max: number, axis: 'x' | 'y') => {
    if (Math.abs(dirValue) <= EPSILON) {
      return originValue >= min && originValue <= max;
    }
    const t1 = (min - originValue) / dirValue;
    const t2 = (max - originValue) / dirValue;
    const enter = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    if (enter > tMin) {
      tMin = enter;
      if (axis === 'x') {
        enterNormal = t1 < t2 ? new Vec2(-1, 0) : new Vec2(1, 0);
      } else {
        enterNormal = t1 < t2 ? new Vec2(0, -1) : new Vec2(0, 1);
      }
    }
    tMax = Math.min(tMax, exit);
    return tMax >= tMin;
  };

  if (!updateAxis(origin.x, rayDir.x, rect.xMin, rect.xMax, 'x')) {
    return null;
  }
  if (!updateAxis(origin.y, rayDir.y, rect.yMin, rect.yMax, 'y')) {
    return null;
  }
  if (tMax <= EPSILON) {
    return null;
  }
  const distance = tMin > EPSILON ? tMin : tMax;
  if (distance <= EPSILON) {
    return null;
  }
  return {
    point: origin.clone().add(rayDir.clone().multiplyScalar(distance)),
    distance,
    normal: enterNormal,
  };
};

export const intersectRayRectBoundary = (origin: Vec2, direction: Vec2, rectLike: RectLike | Rect): RayAabbHit | null => {
  const rect = asRect(rectLike);
  const edges = [
    { start: new Vec2(rect.xMin, rect.yMin), end: new Vec2(rect.xMax, rect.yMin), normal: new Vec2(0, -1) },
    { start: new Vec2(rect.xMin, rect.yMax), end: new Vec2(rect.xMax, rect.yMax), normal: new Vec2(0, 1) },
    { start: new Vec2(rect.xMin, rect.yMin), end: new Vec2(rect.xMin, rect.yMax), normal: new Vec2(-1, 0) },
    { start: new Vec2(rect.xMax, rect.yMin), end: new Vec2(rect.xMax, rect.yMax), normal: new Vec2(1, 0) },
  ];
  let best: RayAabbHit | null = null;
  for (const edge of edges) {
    const hit = intersectRaySegment(origin, direction, edge.start, edge.end);
    if (!hit) {
      continue;
    }
    if (!best || hit.distance < best.distance) {
      best = {
        point: hit.point,
        distance: hit.distance,
        normal: edge.normal,
      };
    }
  }
  return best;
};
