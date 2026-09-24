/**
 * Mobjects for the three.js Manim stage: glyphs (filled TeX outlines, with
 * the outline itself kept for Write), groups of glyphs typeset together,
 * and strokes that can be drawn on partially (Create, ShowPassingFlash).
 *
 * World units follow Manim: the frame is 8 units tall.
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GlyphSpec } from './tex';

/** Shared by every stroke material: the canvas size in CSS pixels. */
export const RESOLUTION = new THREE.Vector2(1, 1);
/** CSS pixels per Manim stroke-width unit (Manim widths are for a 1080p frame). */
export const STROKE_SCALE = { px: 0.5 };

interface GlyphShape {
  geometry: THREE.ShapeGeometry;
  outline: THREE.Vector2[][];
  box: THREE.Box2;
}

const shapeCache = new Map<string, GlyphShape>();
let loader: SVGLoader | null = null;

/** A glyph outline (font units) as a filled geometry plus its outline polylines; cached by path. */
function pathShape(d: string): GlyphShape {
  const hit = shapeCache.get(d);
  if (hit) return hit;
  loader ??= new SVGLoader();
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geometry = new THREE.ShapeGeometry(shapes, 6);
  const outline = data.paths.flatMap((p) => p.subPaths.map((sp) => sp.getPoints(6) as THREE.Vector2[]));
  const box = new THREE.Box2();
  outline.forEach((pts) => pts.forEach((p) => box.expandByPoint(p)));
  const shape = { geometry, outline, box };
  shapeCache.set(d, shape);
  return shape;
}

function rectShape(x: number, y: number, w: number, h: number): GlyphShape {
  const s = new THREE.Shape([new THREE.Vector2(x, y), new THREE.Vector2(x + w, y), new THREE.Vector2(x + w, y + h), new THREE.Vector2(x, y + h)]);
  const corners = [new THREE.Vector2(x, y), new THREE.Vector2(x + w, y), new THREE.Vector2(x + w, y + h), new THREE.Vector2(x, y + h), new THREE.Vector2(x, y)];
  return { geometry: new THREE.ShapeGeometry(s), outline: [corners], box: new THREE.Box2(new THREE.Vector2(x, y), new THREE.Vector2(x + w, y + h)) };
}

/** Anything the animations can fade, move and scale. */
export interface Mob extends THREE.Object3D {
  setOpacity(o: number): void;
  getOpacity(): number;
  /** Centre of what is drawn, in the parent's coordinates. */
  center(): THREE.Vector2;
}

export interface GlyphInfo {
  /** Slot key of the token this glyph belongs to. */
  token: string;
  /** Unique key for matching this glyph in the next equation. */
  match: string;
  char: string;
  kind?: string;
  symbol?: string;
}

/** One TeX glyph: a filled outline, positioned by its own position and scale. */
export class Glyph extends THREE.Group implements Mob {
  readonly mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
  readonly outline: THREE.Vector2[][];
  readonly localBox: THREE.Box2;
  readonly color = new THREE.Color();
  readonly isRule: boolean;
  private owned: boolean;
  private opacity = 1;
  /** Where the layout put it; animations return here. */
  readonly home = { position: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1) };

  constructor(
    spec: GlyphSpec,
    readonly info: GlyphInfo,
    em: number,
    color: THREE.ColorRepresentation
  ) {
    super();
    const shape = spec.rect ? rectShape(spec.rect.x, spec.rect.y, spec.rect.w, spec.rect.h) : pathShape(spec.d!);
    this.owned = !!spec.rect;
    this.isRule = !!spec.rect;
    this.outline = shape.outline;
    this.localBox = shape.box;
    this.color.set(color);
    this.mesh = new THREE.Mesh(
      shape.geometry,
      new THREE.MeshBasicMaterial({ color: this.color, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
    );
    this.add(this.mesh);
    const k = em / 1000;
    const [a, , , d, e, f] = spec.m;
    this.position.set(e * k, f * k, 0);
    this.scale.set(a * k, d * k, 1);
    this.saveHome();
  }

  saveHome() {
    this.home.position.copy(this.position);
    this.home.scale.copy(this.scale);
  }

  setColor(c: THREE.ColorRepresentation | THREE.Color) {
    this.color.set(c as THREE.ColorRepresentation);
    this.mesh.material.color.copy(this.color);
  }

  /** Paint without changing the glyph's own colour (for flashes). */
  paint(c: THREE.Color) {
    this.mesh.material.color.copy(c);
  }

  setOpacity(o: number) {
    this.opacity = o;
    this.mesh.material.opacity = o;
    this.visible = o > 0.001;
  }

  getOpacity() {
    return this.opacity;
  }

  localCenter() {
    return this.localBox.getCenter(new THREE.Vector2());
  }

  center() {
    const c = this.localCenter();
    return new THREE.Vector2(this.position.x + c.x * this.scale.x, this.position.y + c.y * this.scale.y);
  }

  /** Width and height as drawn. */
  size() {
    const s = this.localBox.getSize(new THREE.Vector2());
    return new THREE.Vector2(Math.abs(s.x * this.scale.x), Math.abs(s.y * this.scale.y));
  }

  /** World-space box as drawn now. */
  box() {
    const c = this.center();
    const s = this.size().multiplyScalar(0.5);
    return new THREE.Box2(c.clone().sub(s), c.clone().add(s));
  }

  dispose() {
    this.mesh.material.dispose();
    if (this.owned) this.mesh.geometry.dispose();
  }
}

/** A formula: its glyphs, in world units, all children of this group. */
export class TexMob extends THREE.Group {
  readonly glyphs: Glyph[] = [];

  constructor(
    specs: GlyphSpec[],
    infos: GlyphInfo[],
    em: number,
    colorOf: (info: GlyphInfo) => THREE.ColorRepresentation
  ) {
    super();
    specs.forEach((spec, i) => {
      const g = new Glyph(spec, infos[i], em, colorOf(infos[i]));
      this.glyphs.push(g);
      this.add(g);
    });
  }

  box(glyphs: Glyph[] = this.glyphs) {
    const b = new THREE.Box2();
    glyphs.forEach((g) => b.union(g.box()));
    return b;
  }

  byToken(token: string) {
    return this.glyphs.filter((g) => g.info.token === token);
  }

  /** Moves every glyph so the box's centre (or left edge) and the baseline land where asked. */
  place(opts: { x?: number; left?: number; right?: number; baseline?: number; y?: number }) {
    const box = this.box();
    let dx = 0;
    let dy = 0;
    if (opts.x !== undefined) dx = opts.x - (box.min.x + box.max.x) / 2;
    if (opts.left !== undefined) dx = opts.left - box.min.x;
    if (opts.right !== undefined) dx = opts.right - box.max.x;
    // Glyph positions are relative to the TeX baseline, which starts at y = 0.
    if (opts.baseline !== undefined) dy = opts.baseline;
    if (opts.y !== undefined) dy = opts.y - (box.min.y + box.max.y) / 2;
    this.glyphs.forEach((g) => {
      g.position.x += dx;
      g.position.y += dy;
      g.saveHome();
    });
    return this;
  }

  setOpacity(o: number) {
    this.glyphs.forEach((g) => g.setOpacity(o));
  }

  dispose() {
    this.glyphs.forEach((g) => g.dispose());
    this.removeFromParent();
  }
}

/**
 * A stroked path made of one or more polylines, drawn a set number of CSS
 * pixels wide, which can show just part of its length (from a to b, as
 * fractions of the whole) for Create and passing-flash effects.
 */
export class Stroke extends LineSegments2 implements Mob {
  private segs: { a: THREE.Vector2; b: THREE.Vector2; s0: number; s1: number }[] = [];
  private total = 0;
  private buf: Float32Array;
  private opacity = 1;
  manimWidth: number;
  private partial: [number, number] = [0, 1];

  constructor(paths: THREE.Vector2[][], opts: { color: THREE.ColorRepresentation; width?: number; opacity?: number }) {
    const geometry = new LineSegmentsGeometry();
    const capacity = paths.reduce((n, p) => n + Math.max(p.length - 1, 0), 0) + 2;
    const buf = new Float32Array(capacity * 6);
    geometry.setPositions(buf);
    const material = new LineMaterial({ color: new THREE.Color(opts.color).getHex(), linewidth: 1, transparent: true, depthTest: false, depthWrite: false, worldUnits: false });
    material.uniforms.resolution.value = RESOLUTION;
    super(geometry, material);
    this.buf = buf;
    this.frustumCulled = false;
    this.manimWidth = opts.width ?? 4;
    this.setPaths(paths);
    this.setOpacity(opts.opacity ?? 1);
    this.refreshWidth();
  }

  setPaths(paths: THREE.Vector2[][]) {
    this.segs = [];
    let s = 0;
    for (const p of paths) {
      for (let i = 0; i + 1 < p.length; i++) {
        const len = p[i].distanceTo(p[i + 1]);
        if (len < 1e-9) continue;
        this.segs.push({ a: p[i], b: p[i + 1], s0: s, s1: s + len });
        s += len;
      }
    }
    this.total = s;
    this.setPartial(...this.partial);
  }

  refreshWidth() {
    this.material.linewidth = Math.max(this.manimWidth * STROKE_SCALE.px, 0.75);
  }

  setColor(c: THREE.ColorRepresentation) {
    this.material.color.set(c);
  }

  setOpacity(o: number) {
    this.opacity = o;
    this.material.opacity = o;
    this.visible = o > 0.001 && this.partial[1] > this.partial[0];
  }

  getOpacity() {
    return this.opacity;
  }

  /** Show only the part of the path between fractions a and b of its length. */
  setPartial(a: number, b: number) {
    this.partial = [a, b];
    const lo = Math.max(0, a) * this.total;
    const hi = Math.min(1, b) * this.total;
    let n = 0;
    const lerp = (sg: (typeof this.segs)[number], s: number) => sg.a.clone().lerp(sg.b, (s - sg.s0) / (sg.s1 - sg.s0));
    for (const sg of this.segs) {
      if (sg.s1 <= lo || sg.s0 >= hi) continue;
      const p = sg.s0 < lo ? lerp(sg, lo) : sg.a;
      const q = sg.s1 > hi ? lerp(sg, hi) : sg.b;
      this.buf.set([p.x, p.y, 0, q.x, q.y, 0], n * 6);
      n++;
    }
    const start = this.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
    start.data.needsUpdate = true;
    this.geometry.instanceCount = n;
    this.visible = n > 0 && this.opacity > 0.001;
  }

  center() {
    const b = new THREE.Box2();
    this.segs.forEach((s) => b.expandByPoint(s.a).expandByPoint(s.b));
    const c = b.getCenter(new THREE.Vector2());
    return new THREE.Vector2(this.position.x + c.x * this.scale.x, this.position.y + c.y * this.scale.y);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.removeFromParent();
  }
}

/** Manim's SurroundingRectangle: a rectangle round a box, `buff` units clear of it. */
export function rectanglePath(box: THREE.Box2, buff = 0.2): THREE.Vector2[] {
  const { min, max } = box;
  return [
    new THREE.Vector2(min.x - buff, max.y + buff),
    new THREE.Vector2(max.x + buff, max.y + buff),
    new THREE.Vector2(max.x + buff, min.y - buff),
    new THREE.Vector2(min.x - buff, min.y - buff),
    new THREE.Vector2(min.x - buff, max.y + buff),
  ];
}
