/**
 * Manim's animations, rebuilt for the three.js stage: same names, same
 * default run times and rate functions, same lag behaviour. An animation
 * is told its raw progress alpha ∈ [0, 1]; it applies its own rate
 * function (and lag ratio, per piece), exactly as Manim does.
 */

import * as THREE from 'three';
import { YELLOW } from './colors';
import { Glyph, Stroke, TexMob, type Mob } from './mobject';
import { integerInterpolate, linear, smooth, subAlpha, thereAndBack, type RateFunc } from './rate';

export interface AnimOpts {
  runTime?: number;
  rate?: RateFunc;
}

export abstract class Animation {
  runTime: number;
  rate: RateFunc;

  constructor(opts: AnimOpts = {}, defaults: { runTime?: number; rate?: RateFunc } = {}) {
    this.runTime = opts.runTime ?? defaults.runTime ?? 1;
    this.rate = opts.rate ?? defaults.rate ?? smooth;
  }

  begin(): void {}
  abstract update(alpha: number): void;
  end(): void {}
}

const v2 = (x = 0, y = 0) => new THREE.Vector2(x, y);

/** Plays several animations together, each starting `lagRatio` of the way through the previous (AnimationGroup / LaggedStart). */
export class Group extends Animation {
  private starts: number[] = [];
  private begun: boolean[] = [];
  private ended: boolean[] = [];

  constructor(
    readonly anims: Animation[],
    opts: AnimOpts & { lagRatio?: number } = {}
  ) {
    super(opts, { rate: linear });
    let t = 0;
    let end = 0;
    const lag = opts.lagRatio ?? 0;
    anims.forEach((a) => {
      this.starts.push(t);
      end = Math.max(end, t + a.runTime);
      t += a.runTime * lag;
    });
    this.runTime = opts.runTime ?? Math.max(end, 1e-6);
    this.scale = end > 0 ? this.runTime / end : 1;
  }

  private scale: number;

  begin() {
    this.begun = this.anims.map(() => false);
    this.ended = this.anims.map(() => false);
  }

  update(alpha: number) {
    const time = this.rate(alpha) * this.runTime;
    this.anims.forEach((a, i) => {
      const start = this.starts[i] * this.scale;
      const dur = a.runTime * this.scale;
      if (time < start && !this.begun[i]) return;
      if (!this.begun[i]) {
        this.begun[i] = true;
        a.begin();
      }
      const local = dur > 0 ? Math.min(Math.max((time - start) / dur, 0), 1) : 1;
      if (this.ended[i]) return;
      a.update(local);
      if (local >= 1) {
        this.ended[i] = true;
        a.end();
      }
    });
  }

  end() {
    this.anims.forEach((a, i) => {
      if (!this.begun[i]) {
        this.begun[i] = true;
        a.begin();
      }
      if (!this.ended[i]) {
        a.update(1);
        a.end();
        this.ended[i] = true;
      }
    });
  }
}

export const LaggedStart = (anims: Animation[], lagRatio = 0.05, opts: AnimOpts = {}) => new Group(anims, { ...opts, lagRatio });

/** Does nothing for a while: Manim's Wait. */
export class Wait extends Animation {
  constructor(seconds: number) {
    super({ runTime: seconds, rate: linear });
  }
  update() {}
}

/** Calls a function when reached — for putting a step into a timeline. */
export class Call extends Animation {
  constructor(private fn: () => void) {
    super({ runTime: 0.0001, rate: linear });
  }
  update() {}
  end() {
    this.fn();
  }
}

/**
 * Write: each glyph's outline is drawn on, then filled in as the outline
 * fades (Manim's DrawBorderThenFill, lagged across the glyphs).
 */
export class Write extends Animation {
  private strokes: Stroke[] = [];
  private lagRatio: number;

  constructor(
    readonly glyphs: Glyph[],
    opts: AnimOpts & { lagRatio?: number; strokeWidth?: number } = {}
  ) {
    const n = Math.max(glyphs.length, 1);
    super(opts, { runTime: n < 15 ? 1 : 2, rate: linear });
    this.lagRatio = opts.lagRatio ?? Math.min(4 / n, 0.2);
    this.strokeWidth = opts.strokeWidth ?? 2;
    glyphs.forEach((g) => g.setOpacity(0));
  }

  private strokeWidth: number;

  begin() {
    this.strokes = this.glyphs.map((g) => {
      // In the glyph's own coordinates; its width is in screen pixels, so unaffected by the glyph's scale.
      const s = new Stroke(g.outline, { color: g.color, width: this.strokeWidth });
      s.renderOrder = 2;
      g.add(s);
      g.setOpacity(0);
      g.visible = true;
      s.setPartial(0, 0);
      return s;
    });
  }

  update(alpha: number) {
    const n = this.glyphs.length;
    this.glyphs.forEach((g, i) => {
      const a = subAlpha(alpha, i, n, this.lagRatio, this.rate);
      const [phase, r] = integerInterpolate(0, 2, a);
      const s = this.strokes[i];
      if (phase === 0) {
        s.setPartial(0, r);
        s.setOpacity(1);
        g.mesh.material.opacity = 0;
      } else {
        s.setPartial(0, 1);
        s.setOpacity(1 - r);
        g.mesh.material.opacity = r;
      }
      g.visible = true;
    });
  }

  end() {
    this.strokes.forEach((s) => s.dispose());
    this.glyphs.forEach((g) => g.setOpacity(1));
  }
}

interface MobState {
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  opacity: number;
}

const snapshot = (m: THREE.Object3D & Mob): MobState => ({ pos: m.position.clone(), scale: m.scale.clone(), opacity: m.getOpacity() });

/** Scales a mob by `k` about the point `about` (in its parent's coordinates), from a saved state. */
function scaleAbout(m: THREE.Object3D, from: MobState, about: THREE.Vector2, kx: number, ky = kx) {
  m.scale.set(from.scale.x * kx, from.scale.y * ky, from.scale.z);
  m.position.set(about.x + (from.pos.x - about.x) * kx, about.y + (from.pos.y - about.y) * ky, from.pos.z);
}

/** FadeIn, optionally sliding in by `shift` and growing from `scale`. */
export class FadeIn extends Animation {
  private states: MobState[] = [];
  private centers: THREE.Vector2[] = [];

  constructor(
    readonly mobs: Mob[],
    private opts: AnimOpts & { shift?: THREE.Vector2; scale?: number; lagRatio?: number } = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
    mobs.forEach((m) => m.setOpacity(0));
  }

  begin() {
    this.states = this.mobs.map((m) => ({ ...snapshot(m), opacity: 1 }));
    this.centers = this.mobs.map((m) => m.center());
    this.update(0);
  }

  update(alpha: number) {
    const shift = this.opts.shift ?? v2();
    const s0 = this.opts.scale ?? 1;
    this.mobs.forEach((m, i) => {
      const a = subAlpha(alpha, i, this.mobs.length, this.opts.lagRatio ?? 0, this.rate);
      const k = s0 + (1 - s0) * a;
      scaleAbout(m, this.states[i], this.centers[i], k);
      m.position.x -= shift.x * (1 - a);
      m.position.y -= shift.y * (1 - a);
      m.setOpacity(a);
    });
  }
}

/** FadeOut, optionally sliding away by `shift` and shrinking to `scale`; removes the mobs at the end. */
export class FadeOut extends Animation {
  private states: MobState[] = [];
  private centers: THREE.Vector2[] = [];

  constructor(
    readonly mobs: Mob[],
    private opts: AnimOpts & { shift?: THREE.Vector2; scale?: number; remove?: boolean; lagRatio?: number } = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
  }

  begin() {
    this.states = this.mobs.map(snapshot);
    this.centers = this.mobs.map((m) => m.center());
  }

  update(alpha: number) {
    const shift = this.opts.shift ?? v2();
    const s1 = this.opts.scale ?? 1;
    this.mobs.forEach((m, i) => {
      const a = subAlpha(alpha, i, this.mobs.length, this.opts.lagRatio ?? 0, this.rate);
      scaleAbout(m, this.states[i], this.centers[i], 1 + (s1 - 1) * a);
      m.position.x += shift.x * a;
      m.position.y += shift.y * a;
      m.setOpacity(this.states[i].opacity * (1 - a));
    });
  }

  end() {
    if (this.opts.remove === false) return;
    this.mobs.forEach((m) => ('dispose' in m ? (m as unknown as { dispose(): void }).dispose() : m.removeFromParent()));
  }
}

/** Manim's path_along_arc: moves from a to b along an arc turning through `arc` radians. */
export function alongArc(a: THREE.Vector2, b: THREE.Vector2, t: number, arc: number): THREE.Vector2 {
  if (Math.abs(arc) < 1e-6) return a.clone().lerp(b, t);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const half = b.clone().sub(a).multiplyScalar(0.5);
  // Centre of the circle: from the chord's midpoint, perpendicular to it.
  const centre = mid.clone().add(new THREE.Vector2(-half.y, half.x).divideScalar(Math.tan(arc / 2)));
  return a.clone().sub(centre).rotateAround(new THREE.Vector2(), t * arc).add(centre);
}

export interface MatchOpts extends AnimOpts {
  /** Renames old tokens before matching (the sides swap in a flip). */
  keyMap?: (token: string) => string;
  /** Old glyphs that must vanish, never be re-used as a match. */
  vanishing?: Set<Glyph>;
  /** Arc to move matched glyphs along, radians (Manim's path_arc). */
  pathArc?: number;
  /** Where new pieces slide in from. */
  enterShift?: THREE.Vector2;
  /** Old pieces that vanish shrink to this. */
  exitScale?: number;
}

/**
 * TransformMatchingTex: glyphs of `from` that have a counterpart in `to`
 * glide (and recolour, and resize) into place; the rest fade out, and
 * `to`'s new glyphs fade in. Counterparts are found by token key first,
 * then by character among what is left, nearest first.
 */
export class TransformMatching extends Animation {
  private pairs: { from: Glyph; to: Glyph; start: MobState; c0: THREE.Vector2; c1: THREE.Vector2; col0: THREE.Color; kx: number; ky: number }[] = [];
  private gone: Glyph[] = [];
  private fresh: Glyph[] = [];
  private exit!: FadeOut;
  private enter!: FadeIn;
  private grow: Glyph[] = [];

  constructor(
    readonly from: TexMob,
    readonly to: TexMob,
    private opts: MatchOpts = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
    to.setOpacity(0);
  }

  begin() {
    const map = this.opts.keyMap ?? ((k: string) => k);
    const vanishing = this.opts.vanishing ?? new Set<Glyph>();
    const byMatch = new Map(this.to.glyphs.map((g) => [g.info.match, g]));
    const taken = new Set<Glyph>();
    const unmatched: Glyph[] = [];
    for (const g of this.from.glyphs) {
      if (!g.visible && g.getOpacity() === 0) continue;
      const rest = g.info.match.slice(g.info.token.length);
      const target = vanishing.has(g) ? undefined : byMatch.get(map(g.info.token) + rest);
      if (target && !taken.has(target)) {
        taken.add(target);
        this.addPair(g, target);
      } else unmatched.push(g);
    }
    // Second pass: same character (and same symbol), nearest first.
    for (const g of unmatched) {
      if (vanishing.has(g)) {
        this.gone.push(g);
        continue;
      }
      const c = g.center();
      let best: Glyph | null = null;
      let bestD = Infinity;
      for (const t of this.to.glyphs) {
        if (taken.has(t) || t.info.char !== g.info.char || t.info.symbol !== g.info.symbol) continue;
        const d = t.center().distanceTo(c);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) {
        taken.add(best);
        this.addPair(g, best);
      } else this.gone.push(g);
    }
    this.fresh = this.to.glyphs.filter((t) => !taken.has(t));
    this.grow = this.fresh.filter((g) => g.isRule);
    const enterShift = this.opts.enterShift ?? v2(0, -0.25);
    this.exit = new FadeOut(this.gone, { rate: this.rate, scale: this.opts.exitScale ?? 0.8, remove: false });
    this.enter = new FadeIn(
      this.fresh.filter((g) => !g.isRule),
      { rate: this.rate, shift: enterShift }
    );
    this.pairs.forEach((p) => p.from.setOpacity(0));
    this.exit.begin();
    this.enter.begin();
    this.grow.forEach((g) => g.setOpacity(0));
    this.update(0);
  }

  private addPair(from: Glyph, to: Glyph) {
    const s0 = from.size();
    const s1 = to.size();
    const ratio = (a: number, b: number) => (b > 1e-9 ? a / b : 1);
    // A bar can change length; a character only changes size, keeping its shape.
    const ky = ratio(s0.y, s1.y);
    const kx = to.isRule ? ratio(s0.x, s1.x) : ky;
    this.pairs.push({ from, to, start: snapshot(to), c0: from.center(), c1: to.center(), col0: from.mesh.material.color.clone(), kx, ky });
  }

  update(alpha: number) {
    const a = this.rate(alpha);
    const arc = this.opts.pathArc ?? 0;
    for (const p of this.pairs) {
      const c = alongArc(p.c0, p.c1, a, arc);
      const kx = p.kx + (1 - p.kx) * a;
      const ky = p.ky + (1 - p.ky) * a;
      p.to.scale.set(p.start.scale.x * kx, p.start.scale.y * ky, 1);
      const lc = p.to.localCenter();
      p.to.position.set(c.x - lc.x * p.to.scale.x, c.y - lc.y * p.to.scale.y, 0);
      p.to.paint(p.col0.clone().lerp(p.to.color, a));
      p.to.setOpacity(1);
    }
    this.exit.update(alpha);
    this.enter.update(alpha);
    for (const g of this.grow) {
      // GrowFromCenter along the bar.
      const lc = g.localCenter();
      const cx = g.home.position.x + lc.x * g.home.scale.x;
      g.scale.set(g.home.scale.x * Math.max(a, 1e-4), g.home.scale.y, 1);
      g.position.set(cx - lc.x * g.scale.x, g.home.position.y, 0);
      g.setOpacity(Math.min(1, a * 2));
    }
  }

  end() {
    for (const p of this.pairs) {
      p.to.position.copy(p.to.home.position);
      p.to.scale.copy(p.to.home.scale);
      p.to.paint(p.to.color);
      p.to.setOpacity(1);
    }
    this.fresh.forEach((g) => {
      g.position.copy(g.home.position);
      g.scale.copy(g.home.scale);
      g.setOpacity(1);
    });
    this.from.dispose();
  }
}

/** Indicate: briefly scales up and turns yellow (there and back). */
export class Indicate extends Animation {
  private states: MobState[] = [];
  private about = v2();
  private cols: THREE.Color[] = [];

  constructor(
    readonly glyphs: Glyph[],
    private opts: AnimOpts & { color?: THREE.ColorRepresentation; scale?: number } = {}
  ) {
    super(opts, { runTime: 1, rate: thereAndBack });
  }

  begin() {
    this.states = this.glyphs.map(snapshot);
    const box = new THREE.Box2();
    this.glyphs.forEach((g) => box.union(g.box()));
    this.about = box.getCenter(v2());
    this.cols = this.glyphs.map((g) => g.color.clone());
  }

  update(alpha: number) {
    const a = this.rate(alpha);
    const k = 1 + ((this.opts.scale ?? 1.2) - 1) * a;
    const hi = new THREE.Color(this.opts.color ?? YELLOW);
    this.glyphs.forEach((g, i) => {
      scaleAbout(g, this.states[i], this.about, k);
      g.paint(this.cols[i].clone().lerp(hi, a));
    });
  }

  end() {
    this.glyphs.forEach((g, i) => {
      g.position.copy(this.states[i].pos);
      g.scale.copy(this.states[i].scale);
      g.paint(g.color);
    });
  }
}

/** Changes glyphs' own colour. */
export class Recolor extends Animation {
  private from: THREE.Color[] = [];
  private to: THREE.Color;

  constructor(
    readonly glyphs: Glyph[],
    color: THREE.ColorRepresentation,
    opts: AnimOpts = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
    this.to = new THREE.Color(color);
  }

  begin() {
    this.from = this.glyphs.map((g) => g.color.clone());
  }

  update(alpha: number) {
    const a = this.rate(alpha);
    this.glyphs.forEach((g, i) => g.setColor(this.from[i].clone().lerp(this.to, a)));
  }
}

/** Create: draws strokes on from start to end. */
export class Create extends Animation {
  constructor(
    readonly strokes: Stroke[],
    private opts: AnimOpts & { lagRatio?: number } = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
    strokes.forEach((s) => s.setPartial(0, 0));
  }

  begin() {
    this.strokes.forEach((s) => {
      s.setOpacity(1);
      s.setPartial(0, 0);
    });
  }

  update(alpha: number) {
    this.strokes.forEach((s, i) => s.setPartial(0, subAlpha(alpha, i, this.strokes.length, this.opts.lagRatio ?? 0, this.rate)));
  }
}

/** ShowPassingFlash: a short piece of the stroke runs along it and away. Removes the stroke at the end. */
export class ShowPassingFlash extends Animation {
  constructor(
    readonly strokes: Stroke[],
    private opts: AnimOpts & { timeWidth?: number } = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
    strokes.forEach((s) => s.setPartial(0, 0));
  }

  update(alpha: number) {
    const w = this.opts.timeWidth ?? 0.1;
    const upper = this.rate(alpha) * (1 + w);
    const lower = upper - w;
    this.strokes.forEach((s) => s.setPartial(Math.max(lower, 0), Math.min(upper, 1)));
  }

  end() {
    this.strokes.forEach((s) => s.dispose());
  }
}

/** Flash: short lines burst outwards from a point. */
export function flashLines(center: THREE.Vector2, opts: { radius?: number; length?: number; lines?: number; color?: THREE.ColorRepresentation; width?: number } = {}) {
  const r = opts.radius ?? 0.3;
  const len = opts.length ?? 0.2;
  const n = opts.lines ?? 12;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const dir = v2(Math.cos(a), Math.sin(a));
    return new Stroke([[center.clone().addScaledVector(dir, r), center.clone().addScaledVector(dir, r + len)]], { color: opts.color ?? YELLOW, width: opts.width ?? 3 });
  });
}

/** Moves the camera frame (Manim's MovingCameraScene frame.animate). */
export class MoveFrame extends Animation {
  private c0 = v2();
  private h0 = 8;

  constructor(
    private frame: { center: THREE.Vector2; height: number },
    private target: { center: THREE.Vector2; height: number },
    opts: AnimOpts = {}
  ) {
    super(opts, { runTime: 1, rate: smooth });
  }

  begin() {
    this.c0 = this.frame.center.clone();
    this.h0 = this.frame.height;
  }

  update(alpha: number) {
    const a = this.rate(alpha);
    this.frame.center.copy(this.c0.clone().lerp(this.target.center, a));
    this.frame.height = this.h0 + (this.target.height - this.h0) * a;
  }
}
