/**
 * Coulomb's law: the numbers behind the Coulomb's Law Lab. Pure functions,
 * SI units (C, m, N), vectors as [x, y, z]. k = 9.0 × 10⁹ N·m²/C² to match
 * the practice questions.
 */

export const K = 9.0e9;

export type Vec3 = [number, number, number];

export interface PointCharge {
  /** Charge in coulombs; the sign matters. */
  q: number;
  /** Position in metres. */
  p: Vec3;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** Size of the force between two point charges r metres apart. */
export function coulombForce(q1: number, q2: number, r: number): number {
  return (K * Math.abs(q1 * q2)) / (r * r);
}

/** The force on `target` due to `source`: repulsive for like charges, attractive for unlike. */
export function forceOn(target: PointCharge, source: PointCharge): Vec3 {
  const d = sub(target.p, source.p);
  const r = length(d);
  return scale(d, (K * target.q * source.q) / (r * r * r));
}

export interface NetForce {
  /** The force from each source, in the order given. */
  parts: Vec3[];
  net: Vec3;
  magnitude: number;
  /** Direction of the net force in the x–y plane, degrees anticlockwise from +x. */
  angleDeg: number;
}

export function netForce(target: PointCharge, sources: PointCharge[]): NetForce {
  const parts = sources.map((s) => forceOn(target, s));
  const net = parts.reduce<Vec3>((acc, f) => add(acc, f), [0, 0, 0]);
  return { parts, net, magnitude: length(net), angleDeg: (Math.atan2(net[1], net[0]) * 180) / Math.PI };
}

/** Electric field (N/C) at a point. */
export function fieldAt(p: Vec3, charges: PointCharge[]): Vec3 {
  let e: Vec3 = [0, 0, 0];
  for (const c of charges) {
    const d = sub(p, c.p);
    const r = length(d);
    if (r < 1e-9) continue;
    e = add(e, scale(d, (K * c.q) / (r * r * r)));
  }
  return e;
}

export interface FieldLineOptions {
  /** Lines leaving a charge of the largest magnitude; smaller charges get proportionally fewer. */
  linesPerCharge?: number;
  /** Start and stop this far from a charge's centre, in metres. */
  radius?: number;
  step?: number;
  maxSteps?: number;
  /** Stop a line once it is this far from the origin. */
  bound?: number;
  /** Only seed lines in the x–y plane (clearer on screen) rather than all round each charge. */
  planar?: boolean;
}

/**
 * Field lines, traced numerically. Lines start on positive charges and follow
 * the field until they reach a negative charge or leave the region; if every
 * charge is negative, they start on the negatives and are traced backwards.
 * Each charge gets a number of lines proportional to its size.
 */
export function traceFieldLines(charges: PointCharge[], opts: FieldLineOptions = {}): Vec3[][] {
  const { linesPerCharge = 16, radius = 0.06, step = 0.02, maxSteps = 900, bound = 3.5, planar = false } = opts;
  const sources = charges.filter((c) => c.q > 0);
  const direction = sources.length > 0 ? 1 : -1;
  const seeds = sources.length > 0 ? sources : charges.filter((c) => c.q < 0);
  const sinks = charges.filter((c) => Math.sign(c.q) === -direction);
  const qMax = Math.max(...charges.map((c) => Math.abs(c.q)), 1e-30);

  const lines: Vec3[][] = [];
  for (const c of seeds) {
    const n = Math.max(2, Math.round((linesPerCharge * Math.abs(c.q)) / qMax));
    for (let i = 0; i < n; i++) {
      let dir: Vec3;
      if (planar) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        dir = [Math.cos(a), Math.sin(a), 0];
      } else {
        // Evenly spread directions on a sphere (Fibonacci lattice).
        const y = 1 - ((i + 0.5) / n) * 2;
        const rr = Math.sqrt(1 - y * y);
        const th = i * 2.399963229728653;
        dir = [Math.cos(th) * rr, y, Math.sin(th) * rr];
      }
      let p = add(c.p, scale(dir, radius));
      const line: Vec3[] = [p];
      for (let s = 0; s < maxSteps; s++) {
        // Midpoint (RK2) step along the unit field direction.
        const e1 = fieldAt(p, charges);
        const m1 = length(e1);
        if (m1 === 0) break;
        const mid = add(p, scale(e1, (direction * step) / (2 * m1)));
        const e2 = fieldAt(mid, charges);
        const m2 = length(e2);
        if (m2 === 0) break;
        p = add(p, scale(e2, (direction * step) / m2));
        line.push(p);
        const sink = sinks.find((k) => length(sub(p, k.p)) < radius);
        if (sink) break;
        if (length(p) > bound) break;
      }
      lines.push(line);
    }
  }
  return lines;
}
