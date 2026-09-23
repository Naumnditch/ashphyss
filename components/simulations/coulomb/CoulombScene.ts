/**
 * The 3D scene behind the Coulomb's Law Lab: point charges floating in the
 * x–y plane (the plane of the textbook diagram), the forces on them, and the
 * electric field lines round them. All the physics comes from
 * lib/physics/coulomb; this file draws it and lets students drag charges.
 *
 * Positions arrive in metres and are drawn at `scale` world units per metre.
 */

import * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { forceOn, netForce, traceFieldLines, type PointCharge, type Vec3 } from '@/lib/physics/coulomb';
import { sci } from '@/lib/physics/format';
import { Arrow3D, BLUE, BRASS, dashedLine, FatLine, INK, makeLabel, PLUM, RED, setLabel, setLinePoints, TEAL, ThreeStage, type LabelItem } from '../three/stage';

export type CoulombMode = 'pair' | 'net';
export type FieldLineMode = 'off' | 'plane' | '3d';
export type CoulombView = '3d' | 'face';

export interface ChargeSpec {
  /** Display name, e.g. q₁ or qA. */
  name: string;
  /** Charge in coulombs. */
  q: number;
  /** Position in metres, in the x–y plane. */
  x: number;
  y: number;
  /** Text shown under the charge, e.g. "q₁ = +2.0 µC". */
  label: string;
}

export interface CoulombParams {
  mode: CoulombMode;
  /** Changes whenever a new arrangement is loaded; the camera and arrow scale then start afresh. */
  layout: string;
  charges: ChargeSpec[];
  /** Net-force mode: which charge the forces are shown on. */
  target: number;
  /** World units per metre. */
  scale: number;
  /** Grid spacing, metres. */
  grid: number;
  fieldLines: FieldLineMode;
  showParallelogram: boolean;
  /**
   * Frame this box (half-width, half-height in metres, round the origin)
   * instead of the charges, so the camera holds still while they move.
   */
  frameBox?: [number, number];
}

export interface CoulombInfo {
  /** Newtons represented by one grid square of arrow length. */
  newtonsPerSquare: number;
}

const POSITIVE = new THREE.Color(0xd9998c);
const NEGATIVE = new THREE.Color(0x9fb4d2);
const MAX_LINES = 72;

export class CoulombScene {
  private stage: ThreeStage;
  private p: CoulombParams;
  private spheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
  private signs: CSS2DObject[] = [];
  private names: CSS2DObject[] = [];
  private ring: THREE.Mesh;
  private grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd6e0ea, transparent: true, opacity: 0.8 }));
  private axes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa9b8c8 }));
  private lines: FatLine[] = [];
  private heads: THREE.InstancedMesh;
  private arrows = { a: new Arrow3D(PLUM), b: new Arrow3D(TEAL), net: new Arrow3D(BRASS) };
  private arrowLabels = { a: makeLabel('', '#7a4a8f', 12), b: makeLabel('', '#2e7d6b', 12), net: makeLabel('', '#8f6428', 13) };
  private para = [dashedLine([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], INK, 0.45), dashedLine([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], INK, 0.45)];
  /** World units per newton; kept steady until arrows get too long or too short. */
  private arrowScale = 0;
  private gridHalf = 0;
  private sphereR: number[] = [];
  private dragging: number | null = null;
  private raycaster = new THREE.Raycaster();
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    params: CoulombParams,
    private onInfo: (info: CoulombInfo) => void,
    private onDrag: (index: number, x: number, y: number) => void
  ) {
    this.container = container;
    this.p = params;
    this.stage = new ThreeStage(container, { fov: 36, position: [1.5, 1.2, 6], target: [0, 0, 0], minDistance: 0.2, maxDistance: 40 });
    const scene = this.stage.scene;
    scene.add(this.grid, this.axes);

    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: RED, metalness: 0.15, roughness: 0.35 }));
      s.castShadow = true;
      this.spheres.push(s);
      const sign = makeLabel('+', '#ffffff', 17);
      Object.assign(sign.element.style, { background: 'transparent', fontStyle: 'normal', fontFamily: 'ui-sans-serif, system-ui', padding: '0' });
      const name = makeLabel('', '#1b2a41', 12);
      this.signs.push(sign);
      this.names.push(name);
      scene.add(s, sign, name);
    }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 12, 64), new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.4, roughness: 0.35 }));
    scene.add(this.ring);

    for (let i = 0; i < MAX_LINES; i++) {
      const line = new FatLine(1400, 2);
      line.visible = false;
      this.lines.push(line);
      scene.add(line);
    }
    this.heads = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.6, 12), new THREE.MeshBasicMaterial({ color: 0x8a7a62 }), MAX_LINES);
    this.heads.count = 0;
    scene.add(this.heads);

    Object.values(this.arrows).forEach((a) => scene.add(a));
    Object.values(this.arrowLabels).forEach((l) => scene.add(l));
    this.para.forEach((l) => scene.add(l));

    this.stage.onSize((w, h) => this.lines.forEach((l) => l.setResolution(w, h)));
    this.stage.onFrame(() => this.frame());

    container.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    container.addEventListener('pointermove', this.onHover);

    this.apply(null);
    this.setView('3d');
  }

  setParams(next: CoulombParams) {
    const prev = this.p;
    this.p = next;
    // A new arrangement (mode or preset) starts with fresh arrow and camera scales.
    const fresh = prev.layout !== next.layout || prev.mode !== next.mode;
    if (fresh) this.arrowScale = 0;
    this.apply(prev);
    if (fresh) this.setView('3d');
  }

  setView(view: CoulombView) {
    this.stage.fitPoints(this.fitPoints(), view === 'face' ? [0, 0, 1] : [0.42, 0.3, 1]);
  }

  dispose() {
    this.container.removeEventListener('pointerdown', this.onPointerDown, { capture: true });
    this.container.removeEventListener('pointermove', this.onHover);
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    this.stage.dispose();
  }

  private world(c: { x: number; y: number }) {
    return new THREE.Vector3(c.x * this.p.scale, c.y * this.p.scale, 0);
  }

  private fitPoints() {
    const box = this.p.frameBox;
    if (box) {
      const [w, h] = [box[0] * this.p.scale, box[1] * this.p.scale];
      return [new THREE.Vector3(-w, -h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(-w, h, 0), new THREE.Vector3(w, -h, 0)];
    }
    const pts: THREE.Vector3[] = [];
    const pad = this.span() * this.p.scale * 0.3;
    for (const c of this.p.charges) {
      const w = this.world(c);
      pts.push(w.clone().add(new THREE.Vector3(pad, pad, 0)), w.clone().add(new THREE.Vector3(-pad, -pad, 0)));
    }
    // The force arrows too, with room for their labels.
    for (const v of this.vectors) {
      const out = v.tip.clone().sub(v.origin).normalize().multiplyScalar(pad * 0.6);
      pts.push(v.tip.clone().add(out));
    }
    return pts;
  }

  /** The size of the arrangement, metres. */
  private span() {
    const cs = this.p.charges;
    let s = 0;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) s = Math.max(s, Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y));
    return Math.max(s, 1e-3);
  }

  private pointCharges(): PointCharge[] {
    return this.p.charges.map((c) => ({ q: c.q, p: [c.x, c.y, 0] as Vec3 }));
  }

  /** Recompute everything that does not change frame to frame. */
  private apply(prev: CoulombParams | null) {
    const p = this.p;
    const S = p.scale;
    const span = this.span();
    const charges = this.pointCharges();
    const qMax = Math.max(...charges.map((c) => Math.abs(c.q)), 1e-30);

    // Spheres: bigger for bigger charges, but never touching.
    const base = Math.min(0.16, 0.28 * span * S);
    this.sphereR = [];
    this.spheres.forEach((s, i) => {
      const c = p.charges[i];
      const visible = !!c;
      s.visible = this.signs[i].visible = this.names[i].visible = visible;
      if (!c) return;
      const r = base * (0.62 + 0.38 * Math.sqrt(Math.abs(c.q) / qMax));
      this.sphereR.push(r);
      s.scale.setScalar(r);
      s.position.copy(this.world(c));
      s.material.color.set(c.q > 0 ? RED : c.q < 0 ? BLUE : 0x9aa3ad);
      setLabel(this.signs[i], c.q > 0 ? '+' : c.q < 0 ? '−' : '0');
      this.signs[i].position.copy(s.position);
      setLabel(this.names[i], c.label);
    });

    const t = p.charges[p.target];
    this.ring.visible = p.mode === 'net' && !!t;
    if (t) {
      const r = this.sphereR[p.target] * 1.45;
      this.ring.scale.set(r, r, r);
      this.ring.position.copy(this.world(t));
    }

    this.buildGrid(prev);
    this.buildFieldLines(charges, span);
    this.updateForces();
  }

  private buildGrid(prev: CoulombParams | null) {
    const p = this.p;
    const step = p.grid * p.scale;
    const half = Math.max(6, Math.ceil((this.span() * p.scale * 2.2) / step) * step);
    if (prev && prev.grid === p.grid && prev.scale === p.scale && half <= this.gridHalf) return;
    this.gridHalf = half;
    const n = Math.round(half / step);
    const pts: number[] = [];
    for (let i = -n; i <= n; i++) {
      const v = i * step;
      if (i !== 0) pts.push(v, -half, 0, v, half, 0, -half, v, 0, half, v, 0);
    }
    this.grid.geometry.dispose();
    this.grid.geometry = new THREE.BufferGeometry();
    this.grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.axes.geometry.dispose();
    this.axes.geometry = new THREE.BufferGeometry();
    this.axes.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-half, 0, 0, half, 0, 0, 0, -half, 0, 0, half, 0], 3));
  }

  private buildFieldLines(charges: PointCharge[], span: number) {
    const p = this.p;
    this.lines.forEach((l) => (l.visible = false));
    this.heads.count = 0;
    if (p.fieldLines === 'off' || charges.every((c) => c.q === 0)) return;

    // Trace round the middle of the arrangement, in metres.
    const cx = charges.reduce((s, c) => s + c.p[0], 0) / charges.length;
    const cy = charges.reduce((s, c) => s + c.p[1], 0) / charges.length;
    const centred = charges.filter((c) => c.q !== 0).map((c) => ({ q: c.q, p: [c.p[0] - cx, c.p[1] - cy, 0] as Vec3 }));
    const step = span / 90;
    const bound = span * 2.4;
    const minR = Math.min(...this.sphereR) / p.scale;
    const traced = traceFieldLines(centred, {
      linesPerCharge: p.fieldLines === 'plane' ? 14 : 22,
      planar: p.fieldLines === 'plane',
      radius: minR * 0.9,
      step,
      bound,
      maxSteps: Math.ceil((bound * 2.5) / step),
    });
    const forward = centred.some((c) => c.q > 0);
    const S = p.scale;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const headSize = Math.min(0.035, span * S * 0.03);
    traced.slice(0, MAX_LINES).forEach((pts, i) => {
      const line = this.lines[i];
      const world = pts.map((v) => new THREE.Vector3((v[0] + cx) * S, (v[1] + cy) * S, v[2] * S));
      const n = world.length;
      const colours = world.map((_, k) => {
        const f = n > 1 ? k / (n - 1) : 0;
        return forward ? POSITIVE.clone().lerp(NEGATIVE, f) : NEGATIVE.clone().lerp(POSITIVE, f);
      });
      line.setPoints(world, colours);
      line.visible = n > 1;
      // An arrowhead part-way along shows which way the field points.
      if (n > 8) {
        const k = Math.min(Math.floor(n * 0.35), n - 2);
        const dir = world[k + 1].clone().sub(world[k]).normalize();
        if (!forward) dir.negate();
        q.setFromUnitVectors(up, dir);
        m.compose(world[k], q, new THREE.Vector3(headSize, headSize, headSize));
        this.heads.setMatrixAt(this.heads.count++, m);
      }
    });
    this.heads.instanceMatrix.needsUpdate = true;
  }

  /** Force arrows: equal and opposite for a pair; the parts and the resultant on the target in net mode. */
  private updateForces() {
    const p = this.p;
    const charges = this.pointCharges();
    const A = this.arrows;
    const L = this.arrowLabels;
    const S = p.scale;
    const spanW = this.span() * S;
    const v3 = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

    let vectors: { key: 'a' | 'b' | 'net'; at: number; f: THREE.Vector3; text: string; lift?: number }[] = [];
    if (p.mode === 'pair') {
      // Drawn just above q₁ and just below q₂ (as in the PhET lab), so that
      // the two arrows never lie on top of each other however close the charges are.
      const [c1, c2] = charges;
      const f1 = v3(forceOn(c1, c2));
      const text = `F = ${sci(f1.length())} N`;
      vectors =
        c1.q * c2.q === 0
          ? []
          : [
              { key: 'a', at: 0, f: f1, text: `${text} on ${p.charges[0].name}`, lift: this.sphereR[0] + 0.08 },
              { key: 'b', at: 1, f: f1.clone().negate(), text: `${text} on ${p.charges[1].name}`, lift: -(this.sphereR[1] + 0.08) },
            ];
    } else {
      const t = p.target;
      const others = charges.map((_, i) => i).filter((i) => i !== t);
      const res = netForce(charges[t], others.map((i) => charges[i]));
      const name = (i: number) => p.charges[i].name;
      vectors = [
        { key: 'a', at: t, f: v3(res.parts[0]), text: `F from ${name(others[0])} = ${sci(Math.hypot(...res.parts[0]))} N` },
        { key: 'b', at: t, f: v3(res.parts[1]), text: `F from ${name(others[1])} = ${sci(Math.hypot(...res.parts[1]))} N` },
        { key: 'net', at: t, f: v3(res.net), text: `net F = ${sci(res.magnitude)} N` },
      ];
    }

    // Keep the scale steady so that changes can be compared; re-range only when arrows get silly.
    const biggest = Math.max(...vectors.map((v) => v.f.length()), 0);
    const longest = biggest * this.arrowScale;
    const [lo, hi] = p.mode === 'pair' ? [0.12, 1.7] : [0.12 * spanW, 0.9 * spanW];
    if (biggest > 0 && (this.arrowScale === 0 || longest > hi || longest < lo)) {
      this.arrowScale = (p.mode === 'pair' ? 0.75 : 0.45 * spanW) / biggest;
    }
    this.onInfo({ newtonsPerSquare: this.arrowScale > 0 ? (p.grid * S) / this.arrowScale : 0 });

    const thick = Math.min(0.022, spanW * 0.012);
    // In a pair both arrows are the same force (Newton's third law), so the same colour.
    A.b.material.color.set(p.mode === 'pair' ? PLUM : TEAL);
    L.b.element.style.color = p.mode === 'pair' ? '#7a4a8f' : '#2e7d6b';
    for (const key of ['a', 'b', 'net'] as const) {
      const v = vectors.find((x) => x.key === key);
      A[key].visible = L[key].visible = !!v;
      A[key].radius = key === 'net' ? thick * 1.35 : thick;
      if (!v) continue;
      const origin = this.world(p.charges[v.at]).add(new THREE.Vector3(0, v.lift ?? 0, 0));
      A[key].set(origin, v.f.clone().multiplyScalar(this.arrowScale));
      setLabel(L[key], v.text);
    }
    this.vectors = vectors.map((v) => {
      const origin = this.world(p.charges[v.at]).add(new THREE.Vector3(0, v.lift ?? 0, 0));
      return { key: v.key, origin, tip: origin.clone().add(v.f.clone().multiplyScalar(this.arrowScale)), side: v.lift === undefined ? 0 : Math.sign(v.lift) };
    });

    // The parallelogram: each part drawn again from the tip of the other.
    const showPara = p.mode === 'net' && p.showParallelogram && vectors.length === 3;
    this.para.forEach((l) => (l.visible = showPara));
    if (showPara) {
      const o = this.world(p.charges[p.target]);
      const a = vectors[0].f.clone().multiplyScalar(this.arrowScale);
      const b = vectors[1].f.clone().multiplyScalar(this.arrowScale);
      setLinePoints(this.para[0], [o.clone().add(a), o.clone().add(a).add(b)]);
      setLinePoints(this.para[1], [o.clone().add(b), o.clone().add(a).add(b)]);
      for (const l of this.para) {
        const m = l.material as THREE.LineDashedMaterial;
        m.dashSize = spanW * 0.025;
        m.gapSize = spanW * 0.018;
      }
    }
  }

  private vectors: { key: 'a' | 'b' | 'net'; origin: THREE.Vector3; tip: THREE.Vector3; side: number }[] = [];

  private frame() {
    const items: LabelItem[] = [];
    this.p.charges.forEach((c, i) => {
      const pos = this.world(c);
      // In a pair, q₂'s force arrow sits below it, so its name goes above.
      const below = !(this.p.mode === 'pair' && i === 1);
      const edge = new THREE.Vector3(0, below ? -this.sphereR[i] : this.sphereR[i], 0);
      items.push({ label: this.names[i], anchor: pos.clone().add(edge), dir: new THREE.Vector2(0, below ? 1 : -1) });
    });
    const order = ['net', 'a', 'b'] as const;
    for (const key of order) {
      const v = this.vectors.find((x) => x.key === key);
      if (!v || !this.arrowLabels[key].visible) continue;
      // Pair arrows are labelled alongside, on the outer side; the others beyond their tips.
      if (v.side) items.push({ label: this.arrowLabels[key], anchor: v.origin.clone().lerp(v.tip, 0.5), dir: new THREE.Vector2(0, -v.side) });
      else items.push({ label: this.arrowLabels[key], anchor: v.tip, from: v.origin });
    }
    this.stage.layoutLabels(items, 7);
  }

  // ── Dragging charges (net-force mode) ─────────────────────────────────

  private pick(e: PointerEvent): number | null {
    const rect = this.container.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const hits = this.raycaster.intersectObjects(this.spheres.filter((s) => s.visible), false);
    if (!hits.length) return null;
    return this.spheres.indexOf(hits[0].object as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>);
  }

  private planePoint(e: PointerEvent): THREE.Vector3 | null {
    const rect = this.container.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit) ? hit : null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.p.mode !== 'net' || e.button !== 0) return;
    const i = this.pick(e);
    if (i === null) return;
    // Take the gesture away from the orbit controls.
    e.stopPropagation();
    e.preventDefault();
    this.dragging = i;
    this.container.style.cursor = 'grabbing';
    window.addEventListener('pointermove', this.onDragMove);
    window.addEventListener('pointerup', this.onDragEnd);
  };

  private onDragMove = (e: PointerEvent) => {
    if (this.dragging === null) return;
    const hit = this.planePoint(e);
    if (!hit) return;
    const snap = this.p.grid / 2;
    const x = Math.round(hit.x / this.p.scale / snap) * snap;
    const y = Math.round(hit.y / this.p.scale / snap) * snap;
    const clash = this.p.charges.some((c, j) => j !== this.dragging && Math.hypot(c.x - x, c.y - y) < snap * 0.99);
    const cur = this.p.charges[this.dragging];
    if (!clash && (Math.abs(cur.x - x) > 1e-9 || Math.abs(cur.y - y) > 1e-9)) this.onDrag(this.dragging, x, y);
  };

  private onDragEnd = () => {
    this.dragging = null;
    this.container.style.cursor = '';
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
  };

  private onHover = (e: PointerEvent) => {
    if (this.dragging !== null || this.p.mode !== 'net') return;
    this.container.style.cursor = this.pick(e) === null ? '' : 'grab';
  };
}
