/**
 * Circular motion at constant speed: the numbers behind the Circular Motion
 * Lab. Pure functions, SI units throughout, g = 9.8 m/s² to match the
 * practice questions.
 */

export const G = 9.8;

export interface HorizontalCircle {
  /** Speed, m/s. */
  v: number;
  /** Angular speed, rad/s. */
  omega: number;
  /** Centripetal acceleration, m/s². */
  a: number;
  /** Centripetal force (the string's tension), N. */
  force: number;
  /** Revolutions per minute. */
  rpm: number;
}

/** A mass whirled in a horizontal circle of radius r, once every `period` seconds. */
export function horizontalCircle(m: number, r: number, period: number): HorizontalCircle {
  const v = (2 * Math.PI * r) / period;
  const a = (v * v) / r;
  return { v, omega: (2 * Math.PI) / period, a, force: m * a, rpm: 60 / period };
}

export interface VerticalCircle {
  /** Centripetal acceleration, m/s². */
  a: number;
  /** Speed below which the string goes slack at the top, √(g r). */
  minSpeed: number;
  /** Tension at the top: T + mg = mv²/r. Negative means the string would go slack. */
  tensionTop: number;
  /** Tension at the bottom: T − mg = mv²/r. */
  tensionBottom: number;
}

/**
 * A mass on a string in a vertical circle, treated (as the questions do) as
 * moving at constant speed v.
 */
export function verticalCircle(m: number, r: number, v: number, g = G): VerticalCircle {
  const a = (v * v) / r;
  return { a, minSpeed: Math.sqrt(g * r), tensionTop: m * (a - g), tensionBottom: m * (a + g) };
}

/**
 * Tension at an angle `phi` round the vertical circle, measured from the
 * bottom (0 = bottom, π = top). The radial equation T − mg cos φ = mv²/r.
 */
export function verticalTensionAt(m: number, r: number, v: number, phi: number, g = G): number {
  return m * ((v * v) / r + g * Math.cos(phi));
}

export interface ConicalPendulum {
  /** Radius of the circle, L sin θ. */
  r: number;
  /** Height of the pivot above the circle, L cos θ. */
  h: number;
  /** Speed, √(g r tan θ). */
  v: number;
  /** Time for one revolution, 2π √(h / g). */
  period: number;
  /** Tension in the string, mg / cos θ. */
  tension: number;
  /** The horizontal part of the tension, which is the centripetal force: mg tan θ. */
  centripetal: number;
  /** Centripetal acceleration, g tan θ. */
  a: number;
}

/** A conical pendulum: string of length L at angle θ (degrees) to the vertical. */
export function conicalPendulum(m: number, L: number, thetaDeg: number, g = G): ConicalPendulum {
  const th = (thetaDeg * Math.PI) / 180;
  const r = L * Math.sin(th);
  const h = L * Math.cos(th);
  const a = g * Math.tan(th);
  return {
    r,
    h,
    v: Math.sqrt(a * r),
    period: 2 * Math.PI * Math.sqrt(h / g),
    tension: (m * g) / Math.cos(th),
    centripetal: m * a,
    a,
  };
}
