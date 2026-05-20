import { Rect, Vec2 } from 'cc';
import { PrismSnapshot, RayColor } from '../core/LightTypes';
import { normalizeSafe, rotateVec2, vecFromAngle } from '../utils/MathUtils';

export const EPSILON = 0.0001;

export interface SegmentIntersection {
  point: Vec2;
  distance: number;
}

export interface PolygonHit {
  point: Vec2;
  distance: number;
  edgeIndex: number;
}

export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

export const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;

export const reflect = (direction: Vec2, normal: Vec2) => {
  const n = normalizeSafe(normal);
  const d = normalizeSafe(direction);
  return normalizeSafe(d.subtract(n.clone().multiplyScalar(2 * dot(d, n))));
};

export const refract = (direction: Vec2, normal: Vec2, eta: number) => {
  const d = normalizeSafe(direction);
  const n = normalizeSafe(normal);
  const cosi = Math.max(-1, Math.min(1, -dot(d, n)));
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) {
    return reflect(d, n);
  }
  return normalizeSafe(d.multiplyScalar(eta).add(n.clone().multiplyScalar(eta * cosi - Math.sqrt(k))));
};

export const intersectRaySegment = (origin: Vec2, direction: Vec2, start: Vec2, end: Vec2): SegmentIntersection | null => {
  const v1 = origin.clone().subtract(start);
  const v2 = end.clone().subtract(start);
  const v3 = new Vec2(-direction.y, direction.x);
  const denom = dot(v2, v3);
  if (Math.abs(denom) < EPSILON) {
    return null;
  }
  const t1 = cross(v2, v1) / denom;
  const t2 = dot(v1, v3) / denom;
  if (t1 > EPSILON && t2 >= -EPSILON && t2 <= 1 + EPSILON) {
    return {
      point: origin.clone().add(direction.clone().multiplyScalar(t1)),
      distance: t1,
    };
  }
  return null;
};

export const intersectRayCircle = (origin: Vec2, direction: Vec2, center: Vec2, radius: number): SegmentIntersection | null => {
  const oc = origin.clone().subtract(center);
  const a = dot(direction, direction);
  const b = 2 * dot(oc, direction);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return null;
  }
  const sqrt = Math.sqrt(disc);
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  const t = t1 > EPSILON ? t1 : t2 > EPSILON ? t2 : null;
  if (t === null) {
    return null;
  }
  return {
    point: origin.clone().add(direction.clone().multiplyScalar(t)),
    distance: t,
  };
};

export const intersectRayRectBoundary = (origin: Vec2, direction: Vec2, rect: Rect) => {
  const candidates: { point: Vec2; distance: number; normal: Vec2 }[] = [];
  const tryLine = (point: Vec2, lineDir: Vec2, normal: Vec2) => {
    const hit = intersectRaySegment(origin, direction, point, point.clone().add(lineDir));
    if (hit) {
      candidates.push({ ...hit, normal });
    }
  };
  tryLine(new Vec2(rect.x, rect.y), new Vec2(rect.width, 0), new Vec2(0, -1));
  tryLine(new Vec2(rect.x, rect.yMax), new Vec2(rect.width, 0), new Vec2(0, 1));
  tryLine(new Vec2(rect.x, rect.y), new Vec2(0, rect.height), new Vec2(-1, 0));
  tryLine(new Vec2(rect.xMax, rect.y), new Vec2(0, rect.height), new Vec2(1, 0));
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
};

export const intersectRayAabb = (origin: Vec2, direction: Vec2, rect: Rect) => {
  let tmin = -Infinity;
  let tmax = Infinity;
  let normal = new Vec2(0, 0);
  const checkAxis = (originValue: number, dirValue: number, min: number, max: number, axis: 'x' | 'y') => {
    if (Math.abs(dirValue) < EPSILON) {
      return originValue >= min && originValue <= max;
    }
    const t1 = (min - originValue) / dirValue;
    const t2 = (max - originValue) / dirValue;
    const enter = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    if (enter > tmin) {
      tmin = enter;
      normal = axis === 'x'
        ? new Vec2(t1 < t2 ? -1 : 1, 0)
        : new Vec2(0, t1 < t2 ? -1 : 1);
    }
    tmax = Math.min(tmax, exit);
    return tmax >= tmin;
  };
  if (!checkAxis(origin.x, direction.x, rect.xMin, rect.xMax, 'x')) {
    return null;
  }
  if (!checkAxis(origin.y, direction.y, rect.yMin, rect.yMax, 'y')) {
    return null;
  }
  if (tmax < EPSILON) {
    return null;
  }
  const distance = tmin > EPSILON ? tmin : tmax;
  if (distance < EPSILON) {
    return null;
  }
  return {
    point: origin.clone().add(direction.clone().multiplyScalar(distance)),
    distance,
    normal,
  };
};

export const buildPrismPoints = (prism: PrismSnapshot) => {
  const top = new Vec2(0, prism.size);
  const left = new Vec2(-prism.size * 0.866, -prism.size * 0.5);
  const right = new Vec2(prism.size * 0.866, -prism.size * 0.5);
  return [top, left, right].map((point) => rotateVec2(point, prism.angle).add(prism.position.clone()));
};

export const intersectRayPolygon = (origin: Vec2, direction: Vec2, points: Vec2[]): PolygonHit | null => {
  const hits: PolygonHit[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const hit = intersectRaySegment(origin, direction, start, end);
    if (hit) {
      hits.push({ ...hit, edgeIndex: i });
    }
  }
  if (!hits.length) {
    return null;
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0];
};

export const prismEdgeNormal = (points: Vec2[], edgeIndex: number, center: Vec2) => {
  const start = points[edgeIndex];
  const end = points[(edgeIndex + 1) % points.length];
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  return normalizeSafe(midpoint.subtract(center));
};

export const beamColorOrder: { color: RayColor; offset: number; ior: number }[] = [
  { color: 'red', offset: 1, ior: 1.513 },
  { color: 'green', offset: 0, ior: 1.517 },
  { color: 'blue', offset: -1, ior: 1.523 },
];

export const buildMirrorEndpoints = (position: Vec2, angle: number, length: number) => {
  const axis = vecFromAngle(angle);
  const half = axis.multiplyScalar(length * 0.5);
  return {
    start: position.clone().subtract(half),
    end: position.clone().add(half),
  };
};
