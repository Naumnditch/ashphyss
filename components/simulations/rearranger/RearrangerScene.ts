/**
 * The Equation Rearranger as a Manim scene. Each beat of a derivation is
 * choreographed the way a 3Blue1Brown-style video would do it:
 *
 *   1. the caption is written: "Divide both sides by m";
 *   2. the operation appears on both sides at once (TransformMatchingTex:
 *      everything already there glides aside, the new pieces fade in and
 *      the new fraction bars grow), and the new pieces flash;
 *   3. the pieces that cancel are indicated in red and struck through,
 *      with the reason as the caption (m/m = 1);
 *   4. the struck pieces shrink away and the rest glides into the
 *      simplified equation, the camera easing to keep it framed.
 *
 * The finished equation gets Manim's SurroundingRectangle and a Flash.
 * Variables keep one colour throughout; the one being solved for is yellow.
 */

import * as THREE from 'three';
import { Call, Create, FadeIn, FadeOut, flashLines, Group, Indicate, MoveFrame, Recolor, ShowPassingFlash, TransformMatching, Wait, Write, type Animation } from '@/lib/manim/animation';
import { MANIM, RED, YELLOW } from '@/lib/manim/colors';
import { Glyph, Stroke, TexMob, rectanglePath, type GlyphInfo } from '@/lib/manim/mobject';
import { FRAME_HEIGHT, ManimScene } from '@/lib/manim/scene';
import { loadTexEngine, type TexEngine } from '@/lib/manim/tex';
import { buildIntermediate, type EqState, type EquationDef, type Move } from './algebra';
import { cancelCaption, operateCaption, plainCaption, textTex } from './captions';
import { VAR_COLORS } from './palette';
import { equationTex, glyphKeys, symbolTex, type TaggedTex } from './texFromState';

const EQ_EM = 1.35;
const CAPTION_EM = 0.5;
const TITLE_EM = 0.34;
const EQ_BASELINE = -0.3;

export interface HoverHit {
  symbol: string;
  /** CSS pixels from the canvas's top left: the top centre of the variable. */
  x: number;
  y: number;
}

export interface RearrangerEvents {
  onHover?(hit: HoverHit | null): void;
  onPick?(symbol: string): void;
}

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

export class RearrangerScene {
  readonly stage: ManimScene;
  private eq: EquationDef | null = null;
  private target: string | null = null;
  private current: TexMob | null = null;
  private caption: TexMob | null = null;
  private title: TexMob | null = null;
  private solvedBox: Stroke | null = null;
  private gen = 0;
  private hovered: string | null = null;
  /** Whether hovering and clicking variables does anything right now. */
  pickable = true;

  static async create(container: HTMLElement, events: RearrangerEvents) {
    const tex = await loadTexEngine();
    return new RearrangerScene(container, tex, events);
  }

  private constructor(
    container: HTMLElement,
    private tex: TexEngine,
    private events: RearrangerEvents
  ) {
    this.stage = new ManimScene(container);
    const canvas = this.stage.renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('click', this.onClick);
  }

  dispose() {
    this.gen++;
    const canvas = this.stage.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('click', this.onClick);
    this.stage.dispose();
  }

  setSpeed(k: number) {
    this.stage.timeScale = k;
  }

  setPaused(p: boolean) {
    this.stage.setPaused(p);
  }

  /** A small inline SVG of an equation (the equation picker). */
  previewSvg(state: EqState): string {
    return this.tex.toSvg(equationTex(state).tex.replace(/\\class\{k\d+\}/g, ''), false);
  }

  /** A small inline SVG of one symbol (the variable legend). */
  symbolSvg(symbol: string): string {
    return this.tex.toSvg(symbolTex(symbol), false);
  }

  // ── Building mobjects ────────────────────────────────────────────────

  private varColor(symbol: string) {
    const i = this.eq?.vars.findIndex((v) => v.symbol === symbol) ?? -1;
    return i < 0 ? MANIM.WHITE : VAR_COLORS[i % VAR_COLORS.length];
  }

  private colorOf = (info: GlyphInfo): THREE.ColorRepresentation => {
    if (info.kind === 'var' && info.symbol) return info.symbol === this.target ? YELLOW : this.varColor(info.symbol);
    if (info.kind === 'const') return MANIM.GRAY_B;
    return MANIM.WHITE;
  };

  private build(tagged: TaggedTex, em: number) {
    const specs = this.tex.layout(tagged.tex);
    const keys = glyphKeys(specs, tagged.tokens);
    const infos: GlyphInfo[] = keys.map((k, i) => ({ token: k.token, match: k.match, char: specs[i].char, kind: k.meta?.kind, symbol: k.meta?.symbol }));
    const mob = new TexMob(specs, infos, em, this.colorOf);
    mob.renderOrder = 1;
    return mob;
  }

  private equationMob(state: EqState) {
    return this.build(equationTex(state), EQ_EM).place({ x: 0, baseline: EQ_BASELINE });
  }

  private get hudWidth() {
    return FRAME_HEIGHT * this.stage.aspect;
  }

  private captionMob(tagged: TaggedTex) {
    let mob = this.build(tagged, CAPTION_EM);
    // Centred, and clear of the title in the top-left corner.
    const titleRight = this.title ? this.title.box().max.x : -this.hudWidth / 2;
    const maxW = Math.min(this.hudWidth * 0.9, 2 * (-titleRight - 0.3));
    const w = mob.box().getSize(v2(0, 0)).x;
    if (w > maxW) {
      mob.dispose();
      mob = this.build(tagged, (CAPTION_EM * maxW) / w);
    }
    return mob.place({ x: 0, baseline: 2.8 });
  }

  private titleMob(name: string) {
    const mob = this.build({ tex: textTex(name.replace(/[—–]/g, '-')), tokens: new Map() }, TITLE_EM);
    mob.glyphs.forEach((g) => g.setColor(MANIM.GRAY_C));
    return mob.place({ left: -this.hudWidth / 2 + 0.45, baseline: 3.45 });
  }

  /** The camera frame that fits an equation below the caption, zooming out if it is wide. */
  private frameFor(mob: TexMob) {
    const box = mob.box();
    const size = box.getSize(v2(0, 0));
    // Keep the maths axis (where fraction bars sit) a little below the middle of the screen at any zoom,
    // so the equation does not bob up and down as fractions come and go.
    const axis = EQ_BASELINE + 0.25 * EQ_EM;
    const drop = 0.3;
    // Zoom out if it is too wide, or if it would reach up into the caption or down off the frame.
    const k = Math.max(1, size.x / (FRAME_HEIGHT * this.stage.aspect * 0.86), (box.max.y - axis) / (2.25 + drop), (axis - box.min.y) / (3.7 - drop));
    return { center: v2((box.min.x + box.max.x) / 2, axis + drop * k), height: FRAME_HEIGHT * k };
  }

  private frameTo(mob: TexMob, runTime = 1) {
    return new MoveFrame(this.stage.frame, this.frameFor(mob), { runTime });
  }

  // ── Scene control ─────────────────────────────────────────────────────

  /** Starts a new beat: finishes whatever is playing and invalidates any sequence still awaiting. */
  private next() {
    this.stage.finishAll();
    return ++this.gen;
  }

  private alive(g: number) {
    return g === this.gen;
  }

  private play(g: number, ...anims: Animation[]) {
    if (!this.alive(g)) return Promise.resolve(false);
    return this.stage.play(...anims).then(() => this.alive(g));
  }

  private clearAll() {
    this.stage.clear();
    this.current = this.caption = this.title = this.solvedBox = null;
  }

  private swapCaption(tagged: TaggedTex | null, write = false): Animation[] {
    // The old caption lifts away first; the new one is written (or fades up) as it clears.
    const seq: Animation[] = [];
    if (this.caption) {
      const old = this.caption;
      this.caption = null;
      seq.push(new Group([new FadeOut(old.glyphs, { shift: v2(0, 0.25), runTime: 0.45, remove: false }), new Call(() => old.dispose())], { lagRatio: 1 }));
    }
    if (tagged) {
      const mob = this.captionMob(tagged);
      this.stage.hud.add(mob);
      this.caption = mob;
      seq.push(write ? new Write(mob.glyphs, { runTime: 1 }) : new FadeIn(mob.glyphs, { shift: v2(0, 0.25), runTime: 0.6 }));
    }
    return seq.length > 1 ? [new Group(seq, { lagRatio: 0.8 })] : seq;
  }

  /**
   * Puts an equation on screen: written on stroke by stroke (intro), or
   * instantly. `caption` is shown below the title.
   */
  async showEquation(eq: EquationDef, state: EqState, opts: { intro: boolean; target?: string | null; caption?: TaggedTex | null; solved?: boolean }) {
    const g = this.next();
    this.clearAll();
    this.eq = eq;
    this.target = opts.target ?? null;
    this.hovered = null;
    this.stage.frame.center.set(0, 0);
    this.stage.frame.height = FRAME_HEIGHT;
    this.title = this.titleMob(eq.name);
    this.stage.hud.add(this.title);
    this.current = this.equationMob(state);
    this.stage.world.add(this.current);
    const fit = this.frameFor(this.current);
    this.stage.frame.center.copy(fit.center);
    this.stage.frame.height = fit.height;
    const caption = opts.caption === undefined ? this.idleCaption() : opts.caption;
    if (!opts.intro) {
      if (caption) {
        this.caption = this.captionMob(caption);
        this.stage.hud.add(this.caption);
      }
      if (opts.solved) this.addSolvedBox(false);
      this.stage.requestRender();
      return true;
    }
    if (!(await this.play(g, new FadeIn(this.title.glyphs, { shift: v2(0.3, 0), runTime: 0.6 }), new Write(this.current.glyphs, { runTime: 1.6 })))) return false;
    if (caption) return this.play(g, ...this.swapCaption(caption));
    return true;
  }

  private idleCaption() {
    return plainCaption('Click any variable to solve for it');
  }

  /** Highlights the variable being solved for and says how many steps it takes. */
  async chooseTarget(symbol: string, steps: number) {
    const g = this.next();
    this.target = symbol;
    this.solvedBox?.dispose();
    this.solvedBox = null;
    const glyphs = this.current?.glyphs.filter((x) => x.info.kind === 'var' && x.info.symbol === symbol) ?? [];
    const tex = symbolTex(symbol);
    const caption =
      steps === 0
        ? plainCaption('{0} is already on its own', [{ symbol, tex }])
        : plainCaption(`Solve for {0}: ${steps} step${steps === 1 ? '' : 's'}`, [{ symbol, tex }]);
    // Glyphs of other variables keep their colours; only the target turns yellow.
    this.current?.glyphs.forEach((x) => x.info.kind === 'var' && x.info.symbol !== symbol && x.setColor(this.colorOf(x.info)));
    return this.play(g, new Recolor(glyphs, YELLOW, { runTime: 0.6 }), new Indicate(glyphs, { scale: 1.25 }), ...this.swapCaption(caption, true));
  }

  /** Glyphs of `mob` that a move's cancel keys refer to, including the power that a root undoes. */
  private cancelGlyphs(mob: TexMob, move: Move, cancelKeys: string[]): Glyph[] {
    const keys = new Set(cancelKeys);
    const out = mob.glyphs.filter((g) => keys.has(g.info.token));
    if (move.kind === 'root' && this.target) {
      // √(v²): the exponent of v goes too.
      const side = move.homeIsLeft ? 'L' : 'R';
      const t = mob.glyphs.filter((g) => g.info.kind === 'var' && g.info.symbol === this.target && g.info.token.includes(`:${side}:`));
      const byToken = new Map<string, Glyph[]>();
      t.forEach((g) => byToken.set(g.info.token, [...(byToken.get(g.info.token) ?? []), g]));
      byToken.forEach((gs) => out.push(...gs.filter((g) => /\d/.test(g.info.char))));
    }
    if (move.kind === 'square' && cancelKeys[0]) {
      // (√x)²: the radical inside goes with the square.
      const base = cancelKeys[0].replace(/-open$/, '');
      out.push(...mob.glyphs.filter((g) => g.info.kind === 'bracket' && g.info.token.startsWith(`${base}-open~`)));
    }
    return [...new Set(out)];
  }

  /** A red slash through each cancelling piece: one per term, one per bracket glyph. */
  private strikes(glyphs: Glyph[]): Stroke[] {
    const groups = new Map<string, Glyph[]>();
    for (const g of glyphs) {
      if (g.isRule) continue;
      const key = g.info.kind === 'bracket' ? `${g.info.match}` : g.info.token;
      groups.set(key, [...(groups.get(key) ?? []), g]);
    }
    return [...groups.values()].map((gs) => {
      const box = new THREE.Box2();
      gs.forEach((x) => box.union(x.box()));
      const pad = 0.06;
      const s = new Stroke([[v2(box.min.x - pad, box.min.y - pad), v2(box.max.x + pad, box.max.y + pad)]], { color: RED, width: 5 });
      s.renderOrder = 3;
      this.stage.world.add(s);
      return s;
    });
  }

  /** One move of the derivation, from the settled `before` state. Resolves false if interrupted. */
  async playMove(move: Move, before: EqState, target: string) {
    const g = this.next();
    this.target = target;
    const from = this.current;
    if (!from) return false;
    const { mid, cancelKeys } = buildIntermediate(move, before);

    // 1. Say what we are about to do.
    if (!(await this.play(g, ...this.swapCaption(operateCaption(move), true)))) return false;

    // 2. Do it to both sides: the equation grows the new pieces.
    const midMob = this.equationMob(mid);
    this.stage.world.add(midMob);
    const before0 = new Set(from.glyphs.map((x) => x.info.match));
    const fresh = midMob.glyphs.filter((x) => !before0.has(x.info.match) && !x.isRule);
    this.current = midMob;
    if (move.kind !== 'negate') {
      if (!(await this.play(g, new TransformMatching(from, midMob, { runTime: 1.3, enterShift: v2(0, 0.3) }), this.frameTo(midMob, 1.3)))) return false;
      if (fresh.length && !(await this.play(g, new Indicate(fresh, { scale: 1.15, runTime: 0.8 })))) return false;
    } else {
      from.dispose();
      this.current = midMob;
      const signs = midMob.glyphs.filter((x) => x.info.kind === 'op');
      if (!(await this.play(g, new Indicate(signs.length ? signs : midMob.glyphs, { runTime: 0.9 })))) return false;
    }

    // 3. What cancels, struck through.
    const cancelling = this.cancelGlyphs(midMob, move, cancelKeys);
    let strokes: Stroke[] = [];
    const why = cancelCaption(move, symbolTex(target), target);
    if (cancelling.length) {
      if (!(await this.play(g, new Indicate(cancelling, { color: RED, scale: 1.12, runTime: 0.8 }), ...this.swapCaption(why)))) return false;
      strokes = this.strikes(cancelling);
      if (!(await this.play(g, new Create(strokes, { lagRatio: 0.35, runTime: 0.9 })))) return false;
      if (!(await this.play(g, new Wait(0.35)))) return false;
    }

    // 4. Simplify: the struck pieces go, everything else settles.
    const after = this.equationMob(move.stateAfter);
    this.stage.world.add(after);
    this.current = after;
    return this.play(
      g,
      new TransformMatching(midMob, after, { runTime: 1.3, vanishing: new Set(cancelling), exitScale: 0.55 }),
      new FadeOut(strokes, { scale: 0.55, runTime: 0.9 }),
      this.frameTo(after, 1.3)
    );
  }

  /** The last step when the answer ended up on the right: swap the sides along an arc. */
  async playFlip(last: EqState, flipped: EqState, target: string) {
    const g = this.next();
    this.target = target;
    const from = this.current;
    if (!from) return false;
    const caption = plainCaption('Swap the sides, so {0} is on the left', [{ symbol: target, tex: symbolTex(target) }]);
    if (!(await this.play(g, ...this.swapCaption(caption, true)))) return false;
    const a = equationTex(last);
    const b = equationTex(flipped);
    const map = new Map<string, string>();
    const side = (t: TaggedTex, s: 'L' | 'R') => [...t.tokens.values()].filter((m) => m.side === s);
    const pair = (xs: ReturnType<typeof side>, ys: ReturnType<typeof side>) =>
      xs.forEach((m, i) => {
        const n = ys[i];
        if (!n) return;
        map.set(m.key, n.key);
        if (m.wrap && n.wrap) {
          map.set(m.wrap.open, n.wrap.open);
          map.set(m.wrap.close, n.wrap.close);
        }
      });
    pair(side(a, 'L'), side(b, 'R'));
    pair(side(a, 'R'), side(b, 'L'));
    const to = this.equationMob(flipped);
    this.stage.world.add(to);
    this.current = to;
    return this.play(g, new TransformMatching(from, to, { runTime: 1.6, keyMap: (k) => map.get(k) ?? k, pathArc: Math.PI / 2 }), this.frameTo(to, 1.6));
  }

  private addSolvedBox(animate: boolean): Animation[] {
    if (!this.current) return [];
    const box = new Stroke([rectanglePath(this.current.box(), 0.28)], { color: YELLOW, width: 4 });
    box.renderOrder = 3;
    this.stage.world.add(box);
    this.solvedBox = box;
    if (!animate) return [];
    return [new Create([box], { runTime: 1.2 })];
  }

  /** The flourish at the end: SurroundingRectangle, a Flash on the answer, and "Solved for m". */
  async finale(target: string) {
    const g = this.next();
    if (!this.current) return false;
    const answer = this.current.glyphs.filter((x) => x.info.kind === 'var' && x.info.symbol === target);
    const box = new THREE.Box2();
    answer.forEach((x) => box.union(x.box()));
    const flash = answer.length ? flashLines(box.getCenter(v2(0, 0)), { radius: Math.max(box.getSize(v2(0, 0)).length() * 0.6, 0.35), length: 0.28 }) : [];
    flash.forEach((s) => this.stage.world.add(s));
    return this.play(
      g,
      ...this.addSolvedBox(true),
      new ShowPassingFlash(flash, { timeWidth: 1, runTime: 0.9 }),
      new Indicate(answer, { scale: 1.2 }),
      ...this.swapCaption(plainCaption('Solved for {0}', [{ symbol: target, tex: symbolTex(target) }]), true)
    );
  }

  // ── Pointer: hover shows what a variable is, click solves for it ───────

  private hitTest(e: PointerEvent | MouseEvent): { symbol: string; box: THREE.Box2 } | null {
    if (!this.current || !this.pickable) return null;
    const p = this.stage.worldFromClient(e.clientX, e.clientY);
    const pad = 0.12 * (this.stage.frame.height / FRAME_HEIGHT);
    let best: { symbol: string; box: THREE.Box2; d: number } | null = null;
    const boxes = new Map<string, THREE.Box2>();
    for (const g of this.current.glyphs) {
      if (g.info.kind !== 'var' || !g.info.symbol) continue;
      const b = boxes.get(g.info.token) ?? new THREE.Box2();
      boxes.set(g.info.token, b.union(g.box()));
    }
    for (const [token, b] of boxes) {
      const grown = b.clone().expandByScalar(pad);
      if (!grown.containsPoint(p)) continue;
      const d = b.distanceToPoint(p);
      const symbol = this.current.glyphs.find((g) => g.info.token === token)!.info.symbol!;
      if (!best || d < best.d) best = { symbol, box: b, d };
    }
    return best;
  }

  private highlight(symbol: string | null) {
    if (!this.current) return;
    for (const g of this.current.glyphs) {
      if (g.info.kind !== 'var') continue;
      if (g.info.symbol === symbol) g.paint(g.color.clone().lerp(new THREE.Color('#ffffff'), 0.45));
      else g.paint(g.color);
    }
    this.stage.requestRender();
  }

  private onPointerMove = (e: PointerEvent) => {
    const hit = this.hitTest(e);
    const symbol = hit?.symbol ?? null;
    this.stage.renderer.domElement.style.cursor = symbol ? 'pointer' : '';
    if (symbol !== this.hovered) {
      this.hovered = symbol;
      if (!this.stage.isBusy) this.highlight(symbol);
    }
    if (hit) {
      const top = this.stage.clientFromWorld(v2((hit.box.min.x + hit.box.max.x) / 2, hit.box.max.y));
      this.events.onHover?.({ symbol: hit.symbol, x: top.x, y: top.y });
    } else this.events.onHover?.(null);
  };

  private onPointerLeave = () => {
    this.hovered = null;
    this.stage.renderer.domElement.style.cursor = '';
    if (!this.stage.isBusy) this.highlight(null);
    this.events.onHover?.(null);
  };

  private onClick = (e: MouseEvent) => {
    const hit = this.hitTest(e);
    if (!hit) return;
    this.hovered = null;
    this.highlight(null);
    this.events.onHover?.(null);
    this.events.onPick?.(hit.symbol);
  };
}
