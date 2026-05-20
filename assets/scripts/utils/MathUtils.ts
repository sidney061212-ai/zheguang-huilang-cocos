import { Color, Vec2 } from 'cc';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export const degToRad = (degrees: number) => degrees * Math.PI / 180;

export const radToDeg = (radians: number) => radians * 180 / Math.PI;

export const vecFromAngle = (degrees: number) => new Vec2(Math.cos(degToRad(degrees)), Math.sin(degToRad(degrees)));

export const rotateVec2 = (vector: Vec2, degrees: number) => {
  const rad = degToRad(degrees);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return new Vec2(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
};

export const normalizeSafe = (vector: Vec2) => {
  const out = vector.clone();
  if (out.lengthSqr() < 1e-8) {
    return new Vec2(1, 0);
  }
  out.normalize();
  return out;
};

export const angleFromPoints = (from: Vec2, to: Vec2) => radToDeg(Math.atan2(to.y - from.y, to.x - from.x));

export const snapAngle = (degrees: number, snap: number) => Math.round(degrees / snap) * snap;

export const average = (a: number, b: number) => (a + b) * 0.5;

export const alphaColor = (base: Color, alpha: number) => new Color(base.r, base.g, base.b, clamp(Math.round(alpha), 0, 255));

export const distanceAttenuation = (distance: number) => Math.exp(-distance * 0.00215);

export const nearlyEqual = (a: number, b: number, epsilon = 1e-4) => Math.abs(a - b) <= epsilon;
