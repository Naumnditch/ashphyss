/**
 * Shared Three.js plumbing for the 3D simulations: a renderer on the labs'
 * cream "paper", an orbitable camera, crisp HTML labels, soft shadows, a
 * resize observer, and a loop that sleeps while the canvas is off-screen.
 * Each lab builds its own objects on top and registers a per-frame callback.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export const PAPER = 0xfaf7f0;
export const INK = 0x1b2a41;
export const TEAL = 0x2e7d6b;
export const BRASS = 0xb8823d;
export const PLUM = 0x7a4a8f;
export const BLUE = 0x2e5a8f;
export const RED = 0xb34a3c;

export interface StageOptions {
  fov?: number;
  position: [number, number, number];
  target: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
}

type FrameCallback = (dt: number, elapsed: number) => void;

export interface LabelItem {
  label: CSS2DObject;
  /** The world point the label hangs off. */
  anchor: THREE.Vector3;
  /** Screen direction to push the label (x right, y down)… */
  dir?: THREE.Vector2;
  /** …or the world point it points away from (an arrow's tail). */
  from?: THREE.Vector3;
}

export class ThreeStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly labels: CSS2DRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private frames: FrameCallback[] = [];
  private resizeObserver: ResizeObserver;
  private visibility: IntersectionObserver;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private cameraTween: { from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; start: number } | null = null;
  private onResize: Array<(w: number, h: number) => void> = [];

  constructor(private container: HTMLElement, opts: StageOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(PAPER, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    Object.assign(this.labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    container.appendChild(this.labels.domElement);

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, 0.05, 200);
    this.camera.position.set(...opts.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...opts.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = opts.minDistance ?? 2;
    this.controls.maxDistance = opts.maxDistance ?? 25;
    this.controls.addEventListener('start', () => (this.cameraTween = null));

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfb6, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(4, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.radius = 4;
    this.scene.add(sun);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) this.start();
      else this.stop();
    });
    this.visibility.observe(container);
  }

  onFrame(cb: FrameCallback) {
    this.frames.push(cb);
  }

  onSize(cb: (w: number, h: number) => void) {
    this.onResize.push(cb);
    cb(this.container.clientWidth, this.container.clientHeight);
  }

  /** Glide the camera to a new viewpoint. */
  flyTo(position: [number, number, number], target: [number, number, number]) {
    this.cameraTween = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...position),
      fromT: this.controls.target.clone(),
      toT: new THREE.Vector3(...target),
      start: performance.now(),
    };
  }

  /**
   * Frame a sphere of `radius` round `target`, looking along `direction`
   * (from the target towards the camera). Without a direction the current
   * viewing direction is kept, so a student's chosen angle survives.
   */
  frame(target: [number, number, number], radius: number, direction?: [number, number, number]) {
    const dir = direction
      ? new THREE.Vector3(...direction).normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const distance = radius / Math.sin(Math.min(vHalf, hHalf));
    const t = new THREE.Vector3(...target);
    this.flyTo(t.clone().addScaledVector(dir, distance).toArray() as [number, number, number], target);
  }

  /**
   * Frame a set of points as tightly as the view allows, looking along
   * `direction` (or the current direction). `margin` leaves room for labels.
   */
  fitPoints(points: THREE.Vector3[], direction?: [number, number, number], margin = 1.06) {
    const back = direction
      ? new THREE.Vector3(...direction).normalize()
      : this.camera.position.clone().sub(this.controls.target).normalize();
    const worldUp = Math.abs(back.y) > 0.999 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const right = worldUp.clone().cross(back).normalize();
    const up = back.clone().cross(right);
    // Centre the points on screen, then back off until the widest one fits.
    const box = new THREE.Box3().setFromPoints(points);
    const target = box.getCenter(new THREE.Vector3());
    let xs = [Infinity, -Infinity];
    let ys = [Infinity, -Infinity];
    for (const p of points) {
      const rel = p.clone().sub(target);
      const x = rel.dot(right);
      const y = rel.dot(up);
      xs = [Math.min(xs[0], x), Math.max(xs[1], x)];
      ys = [Math.min(ys[0], y), Math.max(ys[1], y)];
    }
    target.addScaledVector(right, (xs[0] + xs[1]) / 2).addScaledVector(up, (ys[0] + ys[1]) / 2);
    // Narrow (phone) views get extra room, since labels stick out sideways.
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) / (margin * (this.camera.aspect < 1.2 ? 1.14 : 1));
    const tanH = tanV * this.camera.aspect;
    let distance = 0;
    for (const p of points) {
      const rel = p.clone().sub(target);
      const z = rel.dot(back);
      distance = Math.max(distance, z + Math.abs(rel.dot(right)) / tanH, z + Math.abs(rel.dot(up)) / tanV);
    }
    distance = THREE.MathUtils.clamp(distance, this.controls.minDistance, this.controls.maxDistance);
    this.flyTo(target.clone().addScaledVector(back, distance).toArray() as [number, number, number], target.toArray() as [number, number, number]);
  }

  /** Where a world point lands on screen, in CSS pixels from the canvas's top left. */
  toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    return new THREE.Vector2((v.x + 1) * 0.5 * this.container.clientWidth, (1 - v.y) * 0.5 * this.container.clientHeight);
  }

  private labelSizes = new WeakMap<CSS2DObject, { html: string; w: number; h: number }>();

  /**
   * Place labels just beyond their anchors (an arrow's tip, say), on the side
   * given by `dir` or by the direction from `from` to the anchor on screen,
   * then push later labels outwards until none overlap. Earlier items win.
   */
  layoutLabels(items: LabelItem[], gapPx = 6) {
    const placed = items.map((it) => {
      const tip = this.toScreen(it.anchor);
      const d = it.dir ? it.dir.clone() : it.from ? tip.clone().sub(this.toScreen(it.from)) : new THREE.Vector2(1, 0);
      if (d.lengthSq() < 1e-6) d.set(1, 0);
      d.normalize();
      const size = this.labelSize(it.label);
      it.label.position.copy(it.anchor);
      return { label: it.label, tip, d, w: size.w, h: size.h, gap: gapPx };
    });
    const rect = (p: (typeof placed)[number]) => {
      const cx = p.tip.x + p.d.x * (p.gap + p.w / 2);
      const cy = p.tip.y + p.d.y * (p.gap + p.h / 2);
      return [cx - p.w / 2, cy - p.h / 2, cx + p.w / 2, cy + p.h / 2];
    };
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let j = 1; j < placed.length; j++) {
        for (let i = 0; i < j; i++) {
          const a = rect(placed[i]);
          const b = rect(placed[j]);
          const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
          const oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
          if (ox <= 0 || oy <= 0) continue;
          const p = placed[j];
          const need = Math.min(Math.abs(p.d.x) > 0.1 ? ox / Math.abs(p.d.x) : Infinity, Math.abs(p.d.y) > 0.1 ? oy / Math.abs(p.d.y) : Infinity);
          if (Number.isFinite(need) && p.gap < 120) {
            p.gap = Math.min(p.gap + need + 2, 120);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    for (const p of placed) {
      // center (0.5, 0.5) would centre the label on its anchor; this puts its near edge there instead.
      p.label.center.set(0.5 - 0.5 * p.d.x, 0.5 - 0.5 * p.d.y);
      p.label.element.style.margin = `${(p.d.y * p.gap).toFixed(1)}px 0 0 ${(p.d.x * p.gap).toFixed(1)}px`;
    }
  }

  private labelSize(label: CSS2DObject) {
    const html = label.element.innerHTML;
    const cached = this.labelSizes.get(label);
    if (cached && cached.html === html && cached.w > 0) return cached;
    const size = { html, w: label.element.offsetWidth, h: label.element.offsetHeight };
    this.labelSizes.set(label, size);
    return size.w > 0 ? size : { html, w: 8 * html.length, h: 18 };
  }

  private resize() {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const cb of this.onResize) cb(w, h);
  }

  start() {
    this.clock.getDelta();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.elapsed += dt;
      if (this.cameraTween) {
        const tw = this.cameraTween;
        // Wall-clock time, so a slow device still arrives on time.
        const t = Math.min(1, (performance.now() - tw.start) / 700);
        const s = t * t * (3 - 2 * t);
        this.camera.position.lerpVectors(tw.from, tw.to, s);
        this.controls.target.lerpVectors(tw.fromT, tw.toT, s);
        if (t >= 1) this.cameraTween = null;
      }
      for (const cb of this.frames) cb(dt, this.elapsed);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labels.render(this.scene, this.camera);
    });
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    this.visibility.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      mats.forEach((m) => m.dispose());
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}

/** A solid arrow (shaft + head) that can be re-aimed every frame. */
export class Arrow3D extends THREE.Group {
  private shaft: THREE.Mesh;
  private head: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  private static UP = new THREE.Vector3(0, 1, 0);

  /** Shaft radius in world units; the head is sized from it. */
  constructor(color: number, public radius = 0.025) {
    super();
    this.material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16), this.material);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(2.8, 8, 24), this.material);
    this.shaft.castShadow = this.head.castShadow = true;
    this.add(this.shaft, this.head);
  }

  /** Point the arrow from `origin` along `vector` (its length is the arrow's length). */
  set(origin: THREE.Vector3, vector: THREE.Vector3) {
    const len = vector.length();
    this.visible = len > 1e-4;
    if (!this.visible) return;
    const headLen = Math.min(this.radius * 8, len * 0.5);
    const shaftLen = Math.max(len - headLen, 1e-4);
    this.position.copy(origin);
    this.quaternion.setFromUnitVectors(Arrow3D.UP, vector.clone().divideScalar(len));
    this.shaft.scale.set(this.radius, shaftLen, this.radius);
    this.shaft.position.set(0, shaftLen / 2, 0);
    this.head.scale.setScalar(headLen / 8);
    this.head.position.set(0, shaftLen + headLen / 2, 0);
  }
}

/** A solid rod between two points: strings, rods, supports. */
export class Segment extends THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial> {
  private static UP = new THREE.Vector3(0, 1, 0);

  constructor(color: number, public radius = 0.01) {
    super(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    this.castShadow = true;
  }

  set(a: THREE.Vector3, b: THREE.Vector3) {
    const d = b.clone().sub(a);
    const len = d.length();
    this.visible = len > 1e-5;
    if (!this.visible) return;
    this.position.copy(a).addScaledVector(d, 0.5);
    this.quaternion.setFromUnitVectors(Segment.UP, d.divideScalar(len));
    this.scale.set(this.radius, len, this.radius);
  }
}

/**
 * A polyline drawn a few pixels thick, with a colour per point. Its buffers
 * are allocated once and rewritten in place, so it can change every frame.
 */
export class FatLine extends Line2 {
  readonly capacity: number;

  constructor(capacity: number, width = 3) {
    const geometry = new LineGeometry();
    geometry.setPositions(new Float32Array(capacity * 3));
    geometry.setColors(new Float32Array(capacity * 3));
    super(geometry, new LineMaterial({ linewidth: width, vertexColors: true, worldUnits: false }));
    this.capacity = capacity;
    this.frustumCulled = false;
    this.geometry.instanceCount = 0;
  }

  /** Call from the stage's `onSize` so the width stays in pixels. */
  setResolution(w: number, h: number) {
    this.material.resolution.set(w, h);
  }

  /** Points and matching colours (one colour for all if a single one is given). */
  setPoints(points: ArrayLike<THREE.Vector3>, colors: THREE.Color | ArrayLike<THREE.Color>) {
    const n = Math.min(points.length, this.capacity);
    const segments = Math.max(n - 1, 0);
    const pos = this.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
    const col = this.geometry.getAttribute('instanceColorStart') as THREE.InterleavedBufferAttribute;
    const pa = pos.data.array as Float32Array;
    const ca = col.data.array as Float32Array;
    const colorAt = (i: number) => ('r' in colors ? (colors as THREE.Color) : (colors as ArrayLike<THREE.Color>)[i]);
    for (let i = 0; i < segments; i++) {
      const a = points[i];
      const b = points[i + 1];
      pa.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      const c0 = colorAt(i);
      const c1 = colorAt(i + 1);
      ca.set([c0.r, c0.g, c0.b, c1.r, c1.g, c1.b], i * 6);
    }
    pos.data.needsUpdate = true;
    col.data.needsUpdate = true;
    this.geometry.instanceCount = segments;
  }
}

/** A label that stays upright and crisp, positioned in 3D. */
export function makeLabel(html: string, color = '#1b2a41', size = 13): CSS2DObject {
  const el = document.createElement('div');
  el.innerHTML = html;
  Object.assign(el.style, {
    color,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: `${size}px`,
    padding: '1px 5px',
    borderRadius: '4px',
    background: 'rgba(250, 247, 240, 0.82)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  });
  return new CSS2DObject(el);
}

export function setLabel(label: CSS2DObject, html: string) {
  if (label.element.innerHTML !== html) label.element.innerHTML = html;
}

/** A thin dashed guide line. Call `computeLineDistances` after moving its points. */
export function dashedLine(points: THREE.Vector3[], color = INK, opacity = 0.55) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.05, transparent: true, opacity }));
  line.computeLineDistances();
  return line;
}

export function setLinePoints(line: THREE.Line, points: THREE.Vector3[]) {
  const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (attr && attr.count === points.length) {
    points.forEach((p, i) => attr.setXYZ(i, p.x, p.y, p.z));
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  } else {
    line.geometry.setFromPoints(points);
  }
  if (line.material instanceof THREE.LineDashedMaterial) line.computeLineDistances();
}

/** Floor that only shows shadows, plus a faint grid like the labs' graph paper. */
export function paperFloor(size = 12, y = 0) {
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.ShadowMaterial({ opacity: 0.14 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.receiveShadow = true;
  const grid = new THREE.GridHelper(size, size * 4, 0xc9d6e2, 0xdfe7ee);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.7;
  group.add(grid, shadow);
  group.position.y = y;
  return group;
}

export function circlePoints(radius: number, y = 0, segments = 128, plane: 'xz' | 'xy' = 'xz', centre = new THREE.Vector3()) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(
      plane === 'xz'
        ? new THREE.Vector3(centre.x + Math.cos(a) * radius, y, centre.z + Math.sin(a) * radius)
        : new THREE.Vector3(centre.x + Math.cos(a) * radius, centre.y + Math.sin(a) * radius, centre.z)
    );
  }
  return pts;
}
