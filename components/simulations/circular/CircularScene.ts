/**
 * The 3D scene behind the Circular Motion Lab: a mass on a string going round
 * a horizontal circle, a vertical circle, or as a conical pendulum. All the
 * numbers come from lib/physics/circularMotion; this file only draws them.
 *
 * World units are metres. Force arrows share one scale per mode, so their
 * lengths can be compared; the velocity arrow has its own.
 */

import * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { conicalPendulum, G, horizontalCircle, verticalCircle, verticalTensionAt } from '@/lib/physics/circularMotion';
import {
  Arrow3D,
  BLUE,
  BRASS,
  circlePoints,
  dashedLine,
  FatLine,
  INK,
  makeLabel,
  paperFloor,
  PAPER,
  PLUM,
  RED,
  Segment,
  setLabel,
  setLinePoints,
  TEAL,
  ThreeStage,
  type LabelItem,
} from '../three/stage';

export type CircularMode = 'horizontal' | 'vertical' | 'conical';
export type CircularView = '3d' | 'side' | 'top';
export type StringState = 'attached' | 'flying' | 'landed';

export interface CircularParams {
  mode: CircularMode;
  mass: number;
  /** Horizontal and vertical circles: radius, m. */
  radius: number;
  /** Horizontal circle: time for one turn, s. */
  period: number;
  /** Vertical circle: speed, m/s (kept constant, as in the questions). */
  speed: number;
  /** Conical pendulum: string length, m. */
  length: number;
  /** Conical pendulum: angle of the string to the vertical, degrees. */
  angle: number;
  showVelocity: boolean;
  showForces: boolean;
  showResultant: boolean;
  showComponents: boolean;
  showTrail: boolean;
  timeScale: number;
  playing: boolean;
}

export interface CircularLive {
  /** Angle round the circle in radians; for the vertical circle, measured from the bottom. */
  phase: number;
  /** The string's tension right now, N (0 when slack or cut). */
  tension: number;
  slack: boolean;
  string: StringState;
  /** After a cut: horizontal distance from where the string was cut, m. */
  flight: number;
}

interface Derived {
  r: number;
  /** Centre of the circle the mass moves round. */
  centre: THREE.Vector3;
  /** Conical pendulum pivot. */
  pivot: THREE.Vector3;
  v: number;
  omega: number;
  ballR: number;
  /** A size for line thicknesses: grows more slowly than the apparatus. */
  u: number;
  forceScale: number;
  velocityScale: number;
  /** Points the camera keeps in view: the apparatus plus room for its arrows. */
  fit: THREE.Vector3[];
  thetaRad: number;
}

const VIEW_DIRECTIONS: Record<CircularMode, Record<CircularView, [number, number, number]>> = {
  horizontal: { '3d': [0.3, 0.72, 1], side: [0, 0.1, 1], top: [0, 1, 0.0001] },
  vertical: { '3d': [0.55, 0.22, 1], side: [0, 0.02, 1], top: [0, 1, 0.0001] },
  conical: { '3d': [0.3, 0.42, 1], side: [0, 0.04, 1], top: [0, 1, 0.0001] },
};

const lineEnds = (line: THREE.Line) => {
  const a = line.geometry.getAttribute('position') as THREE.BufferAttribute;
  return [new THREE.Vector3().fromBufferAttribute(a, 0), new THREE.Vector3().fromBufferAttribute(a, a.count - 1)];
};
const n = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2));
const LIGHT_PLUM = new THREE.Color(0xe6dcef);
const TRAIL_OLD = new THREE.Color(PAPER);
const TRAIL_NEW = new THREE.Color(TEAL);
const FLIGHT = new THREE.Color(0x8f6428);

export class CircularScene {
  private stage: ThreeStage;
  private p: CircularParams;
  private d!: Derived;
  private phase = 0;
  private simTime = 0;

  private ball: THREE.Mesh;
  private string = new Segment(INK, 0.006);
  private stub = new Segment(INK, 0.006);
  private path = dashedLine(circlePoints(1), INK, 0.4);

  private horizontal = new THREE.Group();
  private peg: THREE.Mesh;

  private vertical = new THREE.Group();
  private post = new Segment(0x8d7a5a, 0.02);
  private axle = new Segment(0x6b5a40, 0.012);
  private hub: THREE.Mesh;
  private stand: THREE.Mesh;
  private ring = new FatLine(193, 6);

  private conical = new THREE.Group();
  private beam: THREE.Mesh;
  private mount: THREE.Mesh;
  private cone: THREE.Mesh;
  private axis = dashedLine([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)], INK, 0.55);
  private radiusLine = dashedLine([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], INK, 0.55);
  private arc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8f6428 }));

  private trail = new FatLine(600, 3);
  private trailPts: { p: THREE.Vector3; t: number }[] = [];

  private arrows = {
    v: new Arrow3D(TEAL),
    T: new Arrow3D(PLUM),
    W: new Arrow3D(BLUE),
    N: new Arrow3D(0x5d6b80),
    R: new Arrow3D(BRASS),
    Tx: new Arrow3D(0xa57fb8),
    Ty: new Arrow3D(0xa57fb8),
  };
  private labels: Record<'v' | 'T' | 'W' | 'N' | 'R' | 'Tx' | 'Ty' | 'r' | 'h' | 'theta' | 'slack', CSS2DObject> = {
    v: makeLabel('v', '#2e7d6b'),
    T: makeLabel('T', '#7a4a8f'),
    W: makeLabel('mg', '#2e5a8f'),
    N: makeLabel('N', '#4a5a72'),
    R: makeLabel('F', '#8f6428'),
    Tx: makeLabel('T sin θ', '#7a4a8f', 12),
    Ty: makeLabel('T cos θ', '#7a4a8f', 12),
    r: makeLabel('r', '#4a5a72', 12),
    h: makeLabel('h', '#4a5a72', 12),
    theta: makeLabel('θ', '#8f6428', 13),
    slack: makeLabel('string slack: T = 0', '#b34a3c', 12),
  };

  /** After the string is cut: the mass as a free body. */
  private flight: { pos: THREE.Vector3; vel: THREE.Vector3; start: THREE.Vector3; end: THREE.Vector3; landed: boolean } | null = null;
  /** Vertical circle below the minimum speed: the mass falls inside the circle until the string snaps taut. */
  private slack: { pos: THREE.Vector3; vel: THREE.Vector3; t: number } | null = null;
  private refit: ReturnType<typeof setTimeout> | null = null;
  private tipLabels: LabelItem[] = [];

  constructor(container: HTMLElement, params: CircularParams, private onLive: (live: CircularLive) => void) {
    this.p = params;
    this.stage = new ThreeStage(container, { fov: 38, position: [2, 2.5, 4], target: [0, 0.5, 0], minDistance: 0.4, maxDistance: 30 });
    const scene = this.stage.scene;
    scene.add(paperFloor(16));

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 24),
      new THREE.MeshStandardMaterial({ color: 0x3b4a63, metalness: 0.55, roughness: 0.28 })
    );
    this.ball.castShadow = true;
    scene.add(this.ball, this.string, this.stub, this.path, this.trail);

    // Horizontal circle: a peg in the middle of a frictionless table.
    this.peg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.25, 1, 24), new THREE.MeshStandardMaterial({ color: 0x8d7a5a, roughness: 0.6 }));
    this.peg.castShadow = true;
    this.horizontal.add(this.peg);

    // Vertical circle: a stand holding an axle at the centre.
    this.hub = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x6b5a40, metalness: 0.3, roughness: 0.4 }));
    this.stand = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8d7a5a, roughness: 0.7 }));
    this.stand.castShadow = this.stand.receiveShadow = true;
    this.vertical.add(this.post, this.axle, this.hub, this.stand, this.ring);

    // Conical pendulum: a beam overhead, and the cone the string sweeps out.
    this.beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8d7a5a, roughness: 0.7 }));
    this.mount = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshStandardMaterial({ color: 0x6b5a40, metalness: 0.3, roughness: 0.4 }));
    this.beam.castShadow = this.mount.castShadow = true;
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 72, 1, true),
      new THREE.MeshBasicMaterial({ color: PLUM, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
    );
    this.conical.add(this.beam, this.mount, this.cone, this.axis, this.arc);
    scene.add(this.radiusLine);
    this.labels.r.center.set(0.5, 1.25);
    this.labels.h.center.set(-0.12, 0.5);

    scene.add(this.horizontal, this.vertical, this.conical);
    Object.values(this.arrows).forEach((a) => scene.add(a));
    Object.values(this.labels).forEach((l) => scene.add(l));

    this.stage.onSize((w, h) => {
      this.ring.setResolution(w, h);
      this.trail.setResolution(w, h);
    });
    this.stage.onFrame((dt) => this.tick(dt));
    this.apply(true);
  }

  setParams(next: CircularParams) {
    const prev = this.p;
    this.p = next;
    const modeChanged = prev.mode !== next.mode;
    if (modeChanged) {
      this.flight = null;
      this.slack = null;
      this.trailPts = [];
    }
    this.apply(modeChanged);
    const sizeChanged = prev.radius !== next.radius || prev.length !== next.length || prev.angle !== next.angle;
    if (!modeChanged && sizeChanged) {
      // Let the student watch the apparatus change size, then ease the camera to fit it.
      if (this.refit) clearTimeout(this.refit);
      this.refit = setTimeout(() => this.stage.fitPoints(this.viewPoints()), 700);
    }
  }

  setView(view: CircularView) {
    this.stage.fitPoints(this.viewPoints(), VIEW_DIRECTIONS[this.p.mode][view]);
  }

  /** The apparatus, plus where a cut-free mass will end up. */
  private viewPoints() {
    if (!this.flight || this.p.mode === 'horizontal') return this.d.fit;
    // Keep the landing spot in view, with room for the ball and its arrows.
    const { end } = this.flight;
    const reach = this.d.ballR + this.p.mass * G * this.d.forceScale;
    return [...this.d.fit, end.clone().setY(-reach), end.clone().setY(end.y + reach), end.clone().setX(end.x + reach), end.clone().setX(end.x - reach)];
  }

  private fitPointsFor(d: Derived): THREE.Vector3[] {
    const p = this.p;
    const reach = Math.max(d.r * 1.08, Math.hypot(d.r, d.velocityScale * d.v));
    const weight = p.mass * G * d.forceScale;
    const ring = (y: number) => circlePoints(reach, y, 16);
    if (p.mode === 'horizontal') {
      return [...ring(0), ...ring(d.ballR * 3.4 + weight), ...ring(d.ballR - weight)];
    }
    if (p.mode === 'vertical') {
      return [
        ...circlePoints(reach, 0, 16, 'xy', d.centre),
        new THREE.Vector3(0, d.centre.y - d.r - weight - d.ballR, 0),
        new THREE.Vector3(0, 0, -0.14 * d.u),
      ];
    }
    return [
      ...ring(d.centre.y),
      ...ring(d.centre.y - weight),
      d.pivot.clone().add(new THREE.Vector3(0.55 * d.u, 0.1 * d.u, 0)),
      d.pivot.clone().add(new THREE.Vector3(-0.55 * d.u, 0.1 * d.u, 0)),
    ];
  }

  /** Cut the string: from now on only gravity (or nothing, on the table) acts. */
  cut() {
    if (this.flight) return;
    const { pos, vel } = this.state();
    this.slack = null;
    const d = this.d;
    let end: THREE.Vector3;
    if (this.p.mode === 'horizontal') {
      // It slides away along the tangent until it is well out of the picture.
      end = pos.clone().addScaledVector(vel.clone().normalize(), 5 * d.r);
    } else {
      const t = (vel.y + Math.sqrt(vel.y ** 2 + 2 * G * Math.max(pos.y - d.ballR, 0))) / G;
      end = pos.clone().addScaledVector(vel, t).setY(d.ballR);
    }
    this.flight = { pos, vel, start: pos.clone(), end, landed: false };
    this.trailPts = [{ p: pos.clone(), t: this.simTime }];
    this.stage.fitPoints(this.viewPoints());
  }

  reattach() {
    const wasCut = !!this.flight;
    this.flight = null;
    this.slack = null;
    this.trailPts = [];
    if (wasCut) this.stage.fitPoints(this.viewPoints());
  }

  dispose() {
    if (this.refit) clearTimeout(this.refit);
    this.stage.dispose();
  }

  /** Recompute everything that depends on the parameters rather than on time. */
  private apply(reframe: boolean) {
    const p = this.p;
    let d: Derived;
    const g = G;

    if (p.mode === 'horizontal') {
      const c = horizontalCircle(p.mass, p.radius, p.period);
      const u = Math.sqrt(p.radius);
      const ballR = this.ballRadius(u);
      d = {
        r: p.radius,
        centre: new THREE.Vector3(0, ballR, 0),
        pivot: new THREE.Vector3(0, ballR, 0),
        v: c.v,
        omega: c.omega,
        ballR,
        u,
        forceScale: (0.6 * p.radius) / Math.max(c.force, p.mass * g),
        velocityScale: 0,
        fit: [],
        thetaRad: 0,
      };
    } else if (p.mode === 'vertical') {
      const c = verticalCircle(p.mass, p.radius, p.speed);
      const u = Math.sqrt(p.radius);
      const centre = new THREE.Vector3(0, 1.35 * p.radius + 0.15, 0);
      d = {
        r: p.radius,
        centre,
        pivot: centre,
        v: p.speed,
        omega: p.speed / p.radius,
        ballR: this.ballRadius(u),
        u,
        forceScale: (0.6 * p.radius) / Math.max(c.tensionBottom, p.mass * g, p.mass * c.a),
        velocityScale: 0,
        fit: [],
        thetaRad: 0,
      };
    } else {
      const c = conicalPendulum(p.mass, p.length, p.angle);
      const u = Math.sqrt(p.length);
      const pivot = new THREE.Vector3(0, 1.3 * p.length, 0);
      const centre = new THREE.Vector3(0, pivot.y - c.h, 0);
      d = {
        r: c.r,
        centre,
        pivot,
        v: c.v,
        omega: (2 * Math.PI) / c.period,
        ballR: this.ballRadius(u),
        u,
        forceScale: (0.5 * p.length) / c.tension,
        velocityScale: 0,
        fit: [],
        thetaRad: (p.angle * Math.PI) / 180,
      };
    }
    // Velocity arrows: longer for faster, but never absurdly long.
    d.velocityScale = (d.u * (0.3 + (0.55 * d.v) / (d.v + 4))) / Math.max(d.v, 1e-6);
    d.fit = this.fitPointsFor(d);
    this.d = d;

    this.horizontal.visible = p.mode === 'horizontal';
    this.vertical.visible = p.mode === 'vertical';
    this.conical.visible = p.mode === 'conical';

    // Thicknesses follow the apparatus size.
    const u = d.u;
    this.ball.scale.setScalar(d.ballR);
    this.string.radius = this.stub.radius = 0.0055 * u;
    Object.values(this.arrows).forEach((a) => (a.radius = 0.012 * u));
    this.arrows.Tx.radius = this.arrows.Ty.radius = 0.008 * u;
    for (const line of [this.path, this.axis, this.radiusLine]) {
      const m = line.material as THREE.LineDashedMaterial;
      m.dashSize = 0.045 * u;
      m.gapSize = 0.03 * u;
    }

    if (p.mode === 'horizontal') {
      this.peg.scale.set(0.035 * u, d.ballR * 2.2, 0.035 * u);
      this.peg.position.set(0, d.ballR * 1.1, 0);
      setLinePoints(this.path, circlePoints(d.r, 0.003));
      setLinePoints(this.radiusLine, [new THREE.Vector3(0, 0.004, 0), new THREE.Vector3(-0.7071 * d.r, 0.004, 0.7071 * d.r)]);
    } else if (p.mode === 'vertical') {
      const back = -0.14 * u;
      const c = d.centre;
      this.post.radius = 0.028 * u;
      this.post.set(new THREE.Vector3(0, 0, back), new THREE.Vector3(0, c.y, back));
      this.axle.radius = 0.014 * u;
      this.axle.set(new THREE.Vector3(0, c.y, back), c);
      this.hub.scale.setScalar(0.03 * u);
      this.hub.position.copy(c);
      this.stand.scale.set(0.5 * u, 0.04 * u, 0.3 * u);
      this.stand.position.set(0, 0.02 * u, back);
      this.updateRing();
      setLinePoints(this.radiusLine, [c.clone(), c.clone().add(new THREE.Vector3(-d.r, 0, 0))]);
    } else {
      const c = conicalPendulum(p.mass, p.length, p.angle);
      const pv = d.pivot;
      this.beam.scale.set(1.1 * u, 0.06 * u, 0.12 * u);
      this.beam.position.set(0, pv.y + 0.03 * u + 0.03 * u, 0);
      this.mount.scale.set(0.025 * u, 0.04 * u, 0.025 * u);
      this.mount.position.set(0, pv.y + 0.01 * u, 0);
      this.cone.scale.set(c.r, c.h, c.r);
      this.cone.position.set(0, pv.y - c.h / 2, 0);
      setLinePoints(this.path, circlePoints(c.r, d.centre.y));
      setLinePoints(this.axis, [pv.clone(), d.centre.clone()]);
      setLinePoints(this.radiusLine, [d.centre.clone(), d.centre.clone().add(new THREE.Vector3(-0.7071 * c.r, 0, 0.7071 * c.r))]);
    }

    if (reframe) this.setView('3d');
  }

  private ballRadius(u: number) {
    return THREE.MathUtils.clamp(0.06 * u * Math.cbrt(this.p.mass / 0.5), 0.035 * u, 0.1 * u);
  }

  /** The vertical circle's path, shaded by how hard the string pulls at each point. */
  private updateRing() {
    const { mass, radius, speed } = this.p;
    const c = this.d.centre;
    const bottom = verticalCircle(mass, radius, speed).tensionBottom;
    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];
    const count = this.ring.capacity;
    for (let i = 0; i < count; i++) {
      const phi = (i / (count - 1)) * Math.PI * 2;
      pts.push(new THREE.Vector3(c.x + radius * Math.sin(phi), c.y - radius * Math.cos(phi), -0.004));
      const t = verticalTensionAt(mass, radius, speed, phi);
      cols.push(t < 0 ? new THREE.Color(RED) : LIGHT_PLUM.clone().lerp(new THREE.Color(PLUM), THREE.MathUtils.clamp(t / bottom, 0, 1)));
    }
    this.ring.setPoints(pts, cols);
  }

  /** Where the mass is and how it is moving, when it is on the string. */
  private state(): { pos: THREE.Vector3; vel: THREE.Vector3 } {
    if (this.slack) return { pos: this.slack.pos.clone(), vel: this.slack.vel.clone() };
    const { mode } = this.p;
    const { r, centre, v } = this.d;
    const f = this.phase;
    if (mode === 'vertical') {
      return {
        pos: new THREE.Vector3(centre.x + r * Math.sin(f), centre.y - r * Math.cos(f), 0),
        vel: new THREE.Vector3(Math.cos(f), Math.sin(f), 0).multiplyScalar(v),
      };
    }
    // Horizontal circles run anticlockwise seen from above.
    return {
      pos: new THREE.Vector3(centre.x + r * Math.cos(f), centre.y, centre.z - r * Math.sin(f)),
      vel: new THREE.Vector3(-Math.sin(f), 0, -Math.cos(f)).multiplyScalar(v),
    };
  }

  private tick(dt: number) {
    const p = this.p;
    const d = this.d;
    const sdt = p.playing ? dt * p.timeScale : 0;
    this.simTime += sdt;

    if (this.flight) this.stepFlight(sdt);
    else if (this.slack) this.stepSlack(sdt);
    else {
      this.phase = (this.phase + d.omega * sdt) % (Math.PI * 2);
      if (p.mode === 'vertical' && sdt > 0 && verticalTensionAt(p.mass, d.r, d.v, this.phase) < 0) {
        const s = this.state();
        this.slack = { pos: s.pos, vel: s.vel, t: 0 };
      }
    }

    const { pos, vel } = this.flight ? { pos: this.flight.pos, vel: this.flight.vel } : this.state();
    this.ball.position.copy(pos);
    const attached = !this.flight;
    const slack = !!this.slack;

    // The string (or what is left of it after a cut).
    const anchor = p.mode === 'conical' ? d.pivot : d.centre;
    this.string.visible = attached;
    if (attached) {
      this.string.set(anchor, pos);
      this.string.material.color.set(slack ? RED : INK);
    }
    this.stub.visible = !attached && p.mode !== 'horizontal';
    if (this.stub.visible) this.stub.set(anchor, anchor.clone().add(new THREE.Vector3(0, -0.22 * d.u, 0)));

    // Forces on the mass.
    const m = p.mass;
    const toCentre = d.centre.clone().sub(pos);
    if (toCentre.lengthSq() > 0) toCentre.normalize();
    let tension = 0;
    const fs = d.forceScale;
    const A = this.arrows;
    const L = this.labels;
    const weight = new THREE.Vector3(0, -m * G, 0);
    let resultant = new THREE.Vector3();
    let tensionVec = new THREE.Vector3();

    if (attached && !slack) {
      if (p.mode === 'horizontal') {
        tension = (m * d.v * d.v) / d.r;
        tensionVec = toCentre.clone().multiplyScalar(tension);
        resultant = tensionVec.clone();
      } else if (p.mode === 'vertical') {
        tension = verticalTensionAt(m, d.r, d.v, this.phase);
        tensionVec = toCentre.clone().multiplyScalar(tension);
        resultant = toCentre.clone().multiplyScalar((m * d.v * d.v) / d.r);
      } else {
        const c = conicalPendulum(m, p.length, p.angle);
        tension = c.tension;
        tensionVec = d.pivot.clone().sub(pos).normalize().multiplyScalar(tension);
        resultant = toCentre.clone().multiplyScalar(c.centripetal);
      }
    } else if (p.mode !== 'horizontal' && !this.flight?.landed) {
      // Cut, or slack: gravity is the only force left.
      resultant = weight.clone();
    }

    const supported = p.mode === 'horizontal' || !!this.flight?.landed;
    const showF = p.showForces;
    this.place(A.T, L.T, pos, tensionVec.clone().multiplyScalar(fs), showF && tension > 0, `T = ${n(tension)} N`);
    this.place(A.W, L.W, pos, weight.clone().multiplyScalar(fs), showF, `mg = ${n(m * G)} N`);
    this.place(A.N, L.N, pos, weight.clone().multiplyScalar(-fs), showF && supported, `N = ${n(m * G)} N`);
    // Keep the resultant clear of the arrows it would otherwise sit on (T on the table, T sin θ on the cone).
    const lift =
      p.mode === 'horizontal'
        ? new THREE.Vector3(0, d.ballR * 2.2, 0)
        : p.mode === 'conical' && p.showComponents && p.showForces && attached
          ? new THREE.Vector3(0, -d.ballR * 2.4, 0)
          : new THREE.Vector3();
    this.place(
      A.R,
      L.R,
      pos.clone().add(lift),
      resultant.clone().multiplyScalar(fs),
      p.showResultant && resultant.lengthSq() > 0,
      attached && !slack ? `F = mv²/r = ${n(resultant.length())} N` : `F = mg = ${n(m * G)} N`
    );
    const conicalAttached = p.mode === 'conical' && attached;
    const th = d.thetaRad;
    this.place(A.Ty, L.Ty, pos, new THREE.Vector3(0, tension * Math.cos(th) * fs, 0), showF && p.showComponents && conicalAttached, `T cos θ = ${n(tension * Math.cos(th))} N`);
    this.place(A.Tx, L.Tx, pos, toCentre.clone().multiplyScalar(tension * Math.sin(th) * fs), showF && p.showComponents && conicalAttached, `T sin θ = ${n(tension * Math.sin(th))} N`);
    this.place(A.v, L.v, pos, vel.clone().multiplyScalar(d.velocityScale), p.showVelocity && !(this.flight?.landed), `v = ${n(vel.length())} m/s`);

    // Guides: the radius (fixed, so it never hides the forces), and for the cone its height and angle.
    const rl = lineEnds(this.radiusLine);
    const guides: LabelItem[] = [{ label: L.r, anchor: rl[0].clone().lerp(rl[1], 0.5), dir: new THREE.Vector2(0, -1) }];
    setLabel(L.r, `r = ${n(d.r)} m`);
    L.h.visible = p.mode === 'conical';
    this.arc.visible = L.theta.visible = conicalAttached;
    if (p.mode === 'conical') {
      guides.push({ label: L.h, anchor: d.pivot.clone().lerp(d.centre, 0.5), dir: new THREE.Vector2(1, 0) });
      setLabel(L.h, `h = ${n(d.pivot.y - d.centre.y)} m`);
      if (conicalAttached) {
        const arcR = 0.28 * p.length;
        const az = Math.atan2(-(pos.z - d.centre.z), pos.x - d.centre.x);
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) {
          const s = (i / 24) * th;
          pts.push(d.pivot.clone().add(new THREE.Vector3(Math.sin(s) * Math.cos(az), -Math.cos(s), -Math.sin(s) * Math.sin(az)).multiplyScalar(arcR)));
        }
        this.arc.geometry.setFromPoints(pts);
        const mid = th / 2;
        const thetaAt = d.pivot.clone().add(new THREE.Vector3(Math.sin(mid) * Math.cos(az), -Math.cos(mid), -Math.sin(mid) * Math.sin(az)).multiplyScalar(arcR));
        guides.unshift({ label: L.theta, anchor: thetaAt, from: d.pivot.clone() });
        setLabel(L.theta, `θ = ${p.angle.toFixed(0)}°`);
      }
    }
    L.slack.visible = slack;
    if (slack) guides.push({ label: L.slack, anchor: d.centre.clone().lerp(pos, 0.5), dir: new THREE.Vector2(1, 0) });
    this.stage.layoutLabels([...guides.filter((g) => g.label.visible), ...this.tipLabels]);
    this.tipLabels = [];
    this.path.visible = p.mode !== 'vertical';

    this.updateTrail(pos);

    const phase = this.slack
      ? (Math.atan2(pos.x - d.centre.x, -(pos.y - d.centre.y)) + Math.PI * 2) % (Math.PI * 2)
      : this.phase;
    this.onLive({
      phase,
      tension: attached && !slack ? tension : 0,
      slack,
      string: this.flight ? (this.flight.landed ? 'landed' : 'flying') : 'attached',
      flight: this.flight ? Math.hypot(pos.x - this.flight.start.x, pos.z - this.flight.start.z) : 0,
    });
  }

  private place(arrow: Arrow3D, label: CSS2DObject, origin: THREE.Vector3, vector: THREE.Vector3, show: boolean, text: string) {
    const visible = show && vector.length() > 1e-4;
    arrow.visible = label.visible = visible;
    if (!visible) return;
    arrow.set(origin, vector);
    this.tipLabels.push({ label, anchor: origin.clone().add(vector), from: origin.clone() });
    setLabel(label, text);
  }

  private stepFlight(dt: number) {
    const f = this.flight!;
    if (f.landed || dt === 0) return;
    const d = this.d;
    if (this.p.mode === 'horizontal') {
      // Nothing horizontal acts any more: a straight line at a steady speed.
      f.pos.addScaledVector(f.vel, dt);
      if (f.pos.distanceTo(f.start) >= 5 * d.r) {
        f.pos.copy(f.end);
        f.landed = true;
      }
    } else {
      f.vel.y -= G * dt;
      f.pos.addScaledVector(f.vel, dt);
      if (f.pos.y <= d.ballR) {
        f.pos.y = d.ballR;
        f.landed = true;
      }
    }
  }

  private stepSlack(dt: number) {
    const s = this.slack!;
    if (dt === 0) return;
    const d = this.d;
    s.vel.y -= G * dt;
    s.pos.addScaledVector(s.vel, dt);
    s.t += dt;
    const off = s.pos.clone().sub(d.centre);
    if (s.t > 0.03 && off.length() >= d.r) {
      // The string snaps taut again and the motor carries the mass on round.
      this.phase = (Math.atan2(off.x, -off.y) + Math.PI * 2) % (Math.PI * 2);
      this.slack = null;
    } else if (s.t > 4) {
      this.slack = null;
      this.phase = 0;
    }
  }

  private updateTrail(pos: THREE.Vector3) {
    const p = this.p;
    this.trail.visible = p.showTrail && this.trailPts.length > 1;
    const last = this.trailPts[this.trailPts.length - 1];
    if (!last || last.p.distanceToSquared(pos) > 1e-8) this.trailPts.push({ p: pos.clone(), t: this.simTime });
    if (this.flight) {
      if (this.trailPts.length > this.trail.capacity) this.trailPts.splice(1, 1);
      this.trail.setPoints(
        this.trailPts.map((x) => x.p),
        FLIGHT
      );
      return;
    }
    // On the string: a comet tail covering the last part of a turn.
    const span = Math.max(0.15, (0.45 * Math.PI * 2) / this.d.omega);
    const cutoff = this.simTime - span;
    while (this.trailPts.length > 2 && (this.trailPts[0].t < cutoff || this.trailPts.length > 240)) this.trailPts.shift();
    const count = this.trailPts.length;
    this.trail.setPoints(
      this.trailPts.map((x) => x.p),
      this.trailPts.map((_, i) => TRAIL_OLD.clone().lerp(TRAIL_NEW, (i + 1) / count))
    );
  }
}
