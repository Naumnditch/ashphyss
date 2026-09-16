/**
 * Pure 2D vector math — the single source of truth for every mode of the
 * Vector Addition sandbox (1D is just this with y always 0). No rendering,
 * no React, no DOM — deliberately, so it can be (and was) verified in a
 * plain Node script before any UI existed.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export const ZERO: Vec2 = { x: 0, y: 0 };

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVec(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function negate(a: Vec2): Vec2 {
  return { x: -a.x, y: -a.y };
}

export function sum(vecs: Vec2[]): Vec2 {
  return vecs.reduce(add, ZERO);
}

export function magnitude(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function normalize(a: Vec2): Vec2 {
  const m = magnitude(a);
  return m === 0 ? ZERO : scaleVec(a, 1 / m);
}

/** Angle from the +x axis, in degrees, normalised to [0, 360). */
export function angleDeg(a: Vec2): number {
  if (a.x === 0 && a.y === 0) return 0;
  let deg = (Math.atan2(a.y, a.x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  if (deg >= 360) deg -= 360;
  return deg;
}

export function toPolar(a: Vec2): { r: number; theta: number } {
  return { r: magnitude(a), theta: angleDeg(a) };
}

export function fromPolar(r: number, thetaDeg: number): Vec2 {
  const rad = (thetaDeg * Math.PI) / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

/**
 * The tail-to-tip chain used by the tip-to-tail method: origin, then each
 * running partial sum. `cumulativeChain(vecs).at(-1)` is always `sum(vecs)`
 * (verified in the Node script, not just asserted here).
 */
export function cumulativeChain(vecs: Vec2[]): Vec2[] {
  const points: Vec2[] = [ZERO];
  let running = ZERO;
  for (const v of vecs) {
    running = add(running, v);
    points.push(running);
  }
  return points;
}

/** Shortest signed difference between two angles in degrees, result in (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** 2 d.p. for magnitudes/components, per the sim's display convention. */
export function fmtMag(n: number): string {
  return round2(n).toFixed(2);
}

/** 1 d.p. for angles, per the sim's display convention. */
export function fmtAngle(n: number): string {
  return round1(n).toFixed(1);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Snap a vector's components to the nearest integer grid point. */
export function snapToGrid(a: Vec2): Vec2 {
  return { x: Math.round(a.x), y: Math.round(a.y) };
}
