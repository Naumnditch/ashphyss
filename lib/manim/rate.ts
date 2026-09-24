/**
 * Manim's rate functions, ported line for line from
 * manim/utils/rate_functions.py so that motion here has exactly the feel of
 * a Manim render. A rate function maps linear time t ∈ [0, 1] to progress.
 */

export type RateFunc = (t: number) => number;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

export const linear: RateFunc = (t) => t;

/** Manim's default: a sigmoid, flattened so it starts at exactly 0 and ends at exactly 1. */
export function smooth(t: number, inflection = 10): number {
  const error = sigmoid(-inflection / 2);
  return clamp01((sigmoid(inflection * (t - 0.5)) - error) / (1 - 2 * error));
}

export const rushInto: RateFunc = (t) => 2 * smooth(t / 2);
export const rushFrom: RateFunc = (t) => 2 * smooth(t / 2 + 0.5) - 1;
export const slowInto: RateFunc = (t) => Math.sqrt(1 - (1 - t) * (1 - t));

export const doubleSmooth: RateFunc = (t) => (t < 0.5 ? 0.5 * smooth(2 * t) : 0.5 * (1 + smooth(2 * t - 1)));

/** Out and back again: used by Indicate. */
export const thereAndBack: RateFunc = (t) => smooth(t < 0.5 ? 2 * t : 2 * (1 - t));

export function thereAndBackWithPause(t: number, pauseRatio = 1 / 3): number {
  const a = 1 / pauseRatio;
  if (t < 0.5 - pauseRatio / 2) return smooth(a * t);
  if (t < 0.5 + pauseRatio / 2) return 1;
  return smooth(a - a * t);
}

export const wiggle = (t: number, wiggles = 2) => thereAndBack(t) * Math.sin(wiggles * Math.PI * t);

export const exponentialDecay = (t: number, halfLife = 0.1) => 1 - Math.exp(-t / halfLife);

/**
 * Manim's Animation.get_sub_alpha: with a lag ratio, submobject `index` of
 * `count` starts `lagRatio` of the way through the previous one, and each
 * runs its own copy of the rate function.
 */
export function subAlpha(alpha: number, index: number, count: number, lagRatio: number, rate: RateFunc): number {
  const fullLength = (count - 1) * lagRatio + 1;
  return rate(clamp01(alpha * fullLength - index * lagRatio));
}

/** Manim's integer_interpolate: which of the integer steps from start to end alpha falls in, and how far through it. */
export function integerInterpolate(start: number, end: number, alpha: number): [number, number] {
  if (alpha >= 1) return [end - 1, 1];
  if (alpha <= 0) return [start, 0];
  const value = start + alpha * (end - start);
  const index = Math.floor(value);
  return [index, value - index];
}
