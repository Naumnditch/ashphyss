/**
 * Question figures for AS Level (9702) Chapter 1 "Kinematics" and Chapter 2
 * "Accelerated motion" — originals, not reproduced from any textbook or exam
 * paper. Unlike most of this directory's diagrams (one hand-drawn SVG per
 * question), these are genuinely parametric: a handful of reusable chart/
 * instrument components take the question's own numbers as props, and each
 * dictionary entry below is just those numbers. This keeps 350+ figures
 * correct by construction — the figure can never drift from the question it
 * illustrates, because it is built from the same values.
 *
 * Referenced from problems.question_image_url as "diagram:kin-<slug>" and
 * merged into the shared getDiagram() dispatch in MomentumDiagrams.tsx, so
 * they render in React (practice page) and in the worksheet PDF (SVGtoPDF)
 * with no asset hosting. Every line style also differs by dash pattern or
 * marker, not colour alone, so a black-and-white print stays legible.
 */

import type { ReactNode } from 'react';

const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const TEAL = '#2e7d6b';
const RED = '#b34a3c';
const GRID = '#d8cfb6';
const PAPER = '#faf7f0';
const BORDER = '#e4ddcc';
const SERIF = 'Georgia, serif';
const MONO = 'ui-monospace, monospace';

function Frame({ width, height, children, viewBox }: { width: number; height: number; children: ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox ?? `0 0 ${width} ${height}`}
      className="w-full max-w-lg mx-auto"
      style={{ background: PAPER, borderRadius: 8, border: `1px solid ${BORDER}` }}
    >
      <defs>
        <marker id="kin-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={INK} />
        </marker>
        <marker id="kin-arrow-teal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={TEAL} />
        </marker>
        <marker id="kin-arrow-brass" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={BRASS} />
        </marker>
        <marker id="kin-arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={RED} />
        </marker>
        <marker id="kin-dim-end" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={MUTE} />
        </marker>
        <marker id="kin-dim-start" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={MUTE} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

function Txt({
  x,
  y,
  children,
  size = 11.5,
  color = INK,
  bold = false,
  anchor = 'middle',
  italic = false,
  mono = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  bold?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  italic?: boolean;
  mono?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={bold ? 700 : 400}
      fontStyle={italic ? 'italic' : 'normal'}
      fill={color}
      fontFamily={mono ? MONO : SERIF}
    >
      {children}
    </text>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Motion graphs: displacement-time, velocity-time, acceleration-time.
//    A piecewise-linear path through {t,y} breakpoints (quadratic segments
//    rendered as sampled smooth curves when curved=true, e.g. a x-t graph
//    under constant non-zero acceleration).
// ─────────────────────────────────────────────────────────────────────────

export interface GraphPoint {
  t: number;
  y: number;
  /** For a curved segment starting here: the constant rate of change of y at this point (slope), used to sample a smooth quadratic arc to the next point. */
  slopeIn?: number;
}

export interface MotionGraphProps {
  points: GraphPoint[];
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xMax?: number;
  yMax?: number;
  yMin?: number;
  /** Shade the area under the curve between these two t values (area = the physical quantity the question asks about). */
  shade?: { t0: number; t1: number; label?: string };
  /** Draw a tangent line (and small gradient triangle) touching the curve at this t. */
  tangentAt?: number;
  /** Extra labelled points, drawn as small ringed markers. */
  markers?: { t: number; y: number; label: string; dy?: number }[];
  /** Dashed reference line(s) at these y values (e.g. "v = 0"). */
  hRefLines?: number[];
  width?: number;
  height?: number;
  curved?: boolean;
  caption?: string;
}

const PAD_L = 56;
const PAD_R = 22;
const PAD_T = 22;
const PAD_B = 46;

function niceStep(max: number): number {
  if (max <= 0) return 1;
  const raw = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return step * mag;
}

function fmtNum(v: number): string {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Evaluates the piecewise path at time t (linear between breakpoints, or the quadratic arc when the segment carries slopeIn). */
function evalAt(points: GraphPoint[], t: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) {
      const dt = b.t - a.t;
      if (dt === 0) return a.y;
      if (a.slopeIn !== undefined) {
        // constant-acceleration arc: y = a.y + slopeIn*(t-a.t) + 0.5*accel*(t-a.t)^2
        const accel = (2 * (b.y - a.y - a.slopeIn * dt)) / (dt * dt);
        const dtt = t - a.t;
        return a.y + a.slopeIn * dtt + 0.5 * accel * dtt * dtt;
      }
      return a.y + ((b.y - a.y) * (t - a.t)) / dt;
    }
  }
  return points[points.length - 1]?.y ?? 0;
}

function slopeAt(points: GraphPoint[], t: number): number {
  const h = 1e-4 * Math.max(1, points[points.length - 1].t);
  return (evalAt(points, t + h) - evalAt(points, t - h)) / (2 * h);
}

export function MotionGraph({
  points,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  xMax,
  yMax,
  yMin = 0,
  shade,
  tangentAt,
  markers,
  hRefLines,
  width = 460,
  height = 300,
  curved = false,
  caption,
}: MotionGraphProps) {
  const dataXMax = xMax ?? Math.max(...points.map((p) => p.t));
  const dataYMaxRaw = yMax ?? Math.max(...points.map((p) => p.y), 0);
  const dataYMin = Math.min(yMin, ...points.map((p) => p.y), 0);
  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const xStep = niceStep(dataXMax);
  const xTop = Math.ceil(dataXMax / xStep) * xStep;
  const yStep = niceStep(Math.max(dataYMaxRaw - dataYMin, 1e-9));
  const yTop = Math.ceil(dataYMaxRaw / yStep) * yStep;
  const yBot = dataYMin < 0 ? -Math.ceil(-dataYMin / yStep) * yStep : 0;

  const sx = (t: number) => PAD_L + (t / xTop) * plotW;
  const sy = (y: number) => PAD_T + plotH - ((y - yBot) / (yTop - yBot)) * plotH;
  const originY = sy(0);

  // Sample the path finely so curved (constant-acceleration) segments look smooth.
  const path: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const steps = curved && a.slopeIn !== undefined ? 16 : 1;
    for (let s = (i === 0 ? 0 : 1); s <= steps; s++) {
      const t = a.t + ((b.t - a.t) * s) / steps;
      path.push([t, evalAt(points, t)]);
    }
  }
  const pathD = path.map(([t, y], i) => `${i === 0 ? 'M' : 'L'}${sx(t).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');

  const xTicks: number[] = [];
  for (let v = 0; v <= xTop + 1e-9; v += xStep) xTicks.push(Math.round(v * 1000) / 1000);
  const yTicks: number[] = [];
  for (let v = yBot; v <= yTop + 1e-9; v += yStep) yTicks.push(Math.round(v * 1000) / 1000);

  let shadePath: string | null = null;
  if (shade) {
    const ts = [shade.t0, ...points.filter((p) => p.t > shade.t0 && p.t < shade.t1).map((p) => p.t), shade.t1];
    const top = ts.map((t) => `${sx(t).toFixed(1)},${sy(evalAt(points, t)).toFixed(1)}`).join(' L');
    shadePath = `M${sx(shade.t0).toFixed(1)},${originY.toFixed(1)} L${top} L${sx(shade.t1).toFixed(1)},${originY.toFixed(1)} Z`;
  }

  let tangentLine: ReactNode = null;
  if (tangentAt !== undefined) {
    const y0 = evalAt(points, tangentAt);
    const m = slopeAt(points, tangentAt);
    const dt = xTop * 0.16;
    const x1 = Math.max(0, tangentAt - dt);
    const x2 = Math.min(xTop, tangentAt + dt);
    const y1 = y0 + m * (x1 - tangentAt);
    const y2 = y0 + m * (x2 - tangentAt);
    tangentLine = (
      <g>
        <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke={RED} strokeWidth={1.8} strokeDasharray="6 3" />
        <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y1)} stroke={RED} strokeWidth={1} strokeDasharray="2 2" />
        <line x1={sx(x2)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke={RED} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={sx(tangentAt)} cy={sy(y0)} r={3.5} fill={RED} />
      </g>
    );
  }

  return (
    <Frame width={width} height={height}>
      {/* gridlines */}
      {xTicks.map((v) => (
        <line key={`gx${v}`} x1={sx(v)} y1={PAD_T} x2={sx(v)} y2={height - PAD_B} stroke={GRID} strokeWidth={1} />
      ))}
      {yTicks.map((v) => (
        <line key={`gy${v}`} x1={PAD_L} y1={sy(v)} x2={width - PAD_R} y2={sy(v)} stroke={GRID} strokeWidth={1} />
      ))}
      {hRefLines?.map((v) => (
        <line key={`ref${v}`} x1={PAD_L} y1={sy(v)} x2={width - PAD_R} y2={sy(v)} stroke={MUTE} strokeWidth={1} strokeDasharray="4 3" />
      ))}
      {/* axes */}
      <line x1={PAD_L} y1={height - PAD_B} x2={width - PAD_R + 6} y2={height - PAD_B} stroke={INK} strokeWidth={1.6} markerEnd="url(#kin-arrow)" />
      <line x1={PAD_L} y1={height - PAD_B} x2={PAD_L} y2={PAD_T - 6} stroke={INK} strokeWidth={1.6} markerEnd="url(#kin-arrow)" />
      {dataYMin < 0 && <line x1={PAD_L} y1={originY} x2={width - PAD_R} y2={originY} stroke={INK} strokeWidth={1} />}
      {xTicks.map((v) => (
        <Txt key={`xt${v}`} x={sx(v)} y={height - PAD_B + 16} size={10} color={MUTE} mono>
          {fmtNum(v)}
        </Txt>
      ))}
      {yTicks.map((v) => (
        <Txt key={`yt${v}`} x={PAD_L - 8} y={sy(v) + 3.5} size={10} color={MUTE} anchor="end" mono>
          {fmtNum(v)}
        </Txt>
      ))}
      {/* axis titles */}
      <Txt x={(PAD_L + width - PAD_R) / 2} y={height - 8} size={11.5} bold>
        {xLabel} {xUnit ? `/ ${xUnit}` : ''}
      </Txt>
      <text
        x={14}
        y={(PAD_T + height - PAD_B) / 2}
        textAnchor="middle"
        fontSize={11.5}
        fontWeight={700}
        fill={INK}
        fontFamily={SERIF}
        transform={`rotate(-90 14 ${(PAD_T + height - PAD_B) / 2})`}
      >
        {yLabel} {yUnit ? `/ ${yUnit}` : ''}
      </text>
      {/* shaded area */}
      {shadePath && <path d={shadePath} fill={BRASS} fillOpacity={0.28} stroke={BRASS} strokeWidth={1} />}
      {/* the curve itself */}
      <path d={pathD} fill="none" stroke={INK} strokeWidth={2.2} />
      {tangentLine}
      {markers?.map((m, i) => (
        <g key={i}>
          <circle cx={sx(m.t)} cy={sy(m.y)} r={4} fill={PAPER} stroke={TEAL} strokeWidth={2} />
          <Txt x={sx(m.t)} y={sy(m.y) + (m.dy ?? -10)} size={10.5} color={TEAL} bold>
            {m.label}
          </Txt>
        </g>
      ))}
      {shade?.label && (
        <Txt x={sx((shade.t0 + shade.t1) / 2)} y={Math.min(sy(evalAt(points, shade.t0)), sy(evalAt(points, shade.t1))) - 10} size={11} color={BRASS} bold>
          {shade.label}
        </Txt>
      )}
      {caption && (
        <Txt x={width / 2} y={PAD_T - 8} size={9.5} color={MUTE}>
          {caption}
        </Txt>
      )}
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Vector diagrams: vectors from an origin, or chained tip-to-tail, with
//    an optional dashed resultant. Degrees measured anticlockwise from East
//    unless compass=true (bearings, clockwise from North).
// ─────────────────────────────────────────────────────────────────────────

export interface VecSpec {
  magnitude: number;
  angleDeg: number;
  label: string;
  color?: string;
  dashed?: boolean;
}

export interface VectorDiagramProps {
  vectors: VecSpec[];
  mode?: 'fromOrigin' | 'tipToTail';
  resultant?: { label: string } | null;
  compass?: boolean;
  scale?: number;
  width?: number;
  height?: number;
  originLabel?: string;
}

function toXY(magnitude: number, angleDeg: number, compass: boolean): [number, number] {
  const rad = compass ? ((90 - angleDeg) * Math.PI) / 180 : (angleDeg * Math.PI) / 180;
  return [magnitude * Math.cos(rad), -magnitude * Math.sin(rad)];
}

export function VectorDiagram({
  vectors,
  mode = 'fromOrigin',
  resultant,
  compass = false,
  scale,
  width = 420,
  height = 320,
  originLabel,
}: VectorDiagramProps) {
  const maxMag = Math.max(...vectors.map((v) => v.magnitude), 1);
  const cx = mode === 'fromOrigin' ? width / 2 : width * 0.28;
  const cy = mode === 'fromOrigin' ? height / 2 + 10 : height * 0.68;
  const k = scale ?? (Math.min(width, height) * 0.36) / maxMag;

  let x = cx;
  let y = cy;
  let rx = cx;
  let ry = cy;
  const segs: { x1: number; y1: number; x2: number; y2: number; v: VecSpec }[] = [];
  for (const v of vectors) {
    const [dx, dy] = toXY(v.magnitude * k, v.angleDeg, compass);
    const x1 = mode === 'fromOrigin' ? cx : x;
    const y1 = mode === 'fromOrigin' ? cy : y;
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    segs.push({ x1, y1, x2, y2, v });
    if (mode === 'tipToTail') {
      x = x2;
      y = y2;
      rx = x2;
      ry = y2;
    }
  }

  return (
    <Frame width={width} height={height}>
      {compass && (
        <g>
          <line x1={cx} y1={cy + 60} x2={cx} y2={cy - 60} stroke={GRID} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={cx - 60} y1={cy} x2={cx + 60} y2={cy} stroke={GRID} strokeWidth={1} strokeDasharray="3 3" />
          <Txt x={cx} y={cy - 66} size={10} color={MUTE}>N</Txt>
        </g>
      )}
      {segs.map((s, i) => {
        const color = s.v.color ?? TEAL;
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        return (
          <g key={i}>
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={color}
              strokeWidth={2.4}
              strokeDasharray={s.v.dashed ? '6 4' : undefined}
              markerEnd={color === TEAL ? 'url(#kin-arrow-teal)' : color === BRASS ? 'url(#kin-arrow-brass)' : color === RED ? 'url(#kin-arrow-red)' : 'url(#kin-arrow)'}
            />
            <Txt x={mx + nx * 14} y={my + ny * 14 + 4} size={12} color={color} bold>
              {s.v.label}
            </Txt>
          </g>
        );
      })}
      {resultant && (
        <g>
          <line x1={cx} y1={cy} x2={rx} y2={ry} stroke={RED} strokeWidth={2.2} strokeDasharray="7 4" markerEnd="url(#kin-arrow-red)" />
          <Txt x={(cx + rx) / 2 + 14} y={(cy + ry) / 2 - 8} size={12} color={RED} bold>
            {resultant.label}
          </Txt>
        </g>
      )}
      <circle cx={cx} cy={cy} r={3} fill={INK} />
      {originLabel && (
        <Txt x={cx} y={cy + 18} size={10} color={MUTE}>
          {originLabel}
        </Txt>
      )}
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Projectile trajectory: a parabola from a launch point, with velocity
//    component vectors shown at the launch and/or a marked later point.
// ─────────────────────────────────────────────────────────────────────────

export interface ProjectileProps {
  /** Launch speed (m/s) and angle above horizontal (deg). angle=0 for a horizontal launch from height. */
  u: number;
  angleDeg: number;
  /** Launch height above the landing plane (m). 0 for ground-to-ground. */
  launchHeight?: number;
  g?: number;
  /** Mark the velocity components at this time (s). */
  markAt?: number;
  showLaunchComponents?: boolean;
  width?: number;
  height?: number;
  caption?: string;
}

export function ProjectileTrajectory({
  u,
  angleDeg,
  launchHeight = 0,
  g = 9.81,
  markAt,
  showLaunchComponents = true,
  width = 460,
  height = 260,
  caption,
}: ProjectileProps) {
  const th = (angleDeg * Math.PI) / 180;
  const ux = u * Math.cos(th);
  const uy = u * Math.sin(th);
  // time of flight: solve launchHeight + uy*t - 0.5*g*t^2 = 0
  const disc = Math.max(uy * uy + 2 * g * launchHeight, 0);
  const tFlight = (uy + Math.sqrt(disc)) / g;
  const xRange = Math.max(ux * tFlight, 1e-6);
  const yMax = Math.max(launchHeight + (uy > 0 ? (uy * uy) / (2 * g) : 0), launchHeight, 1e-6);

  const plotW = width - PAD_L - 30;
  const plotH = height - PAD_T - PAD_B;
  const sx = (t: number) => PAD_L + (ux * t) / xRange * plotW;
  const sy = (yv: number) => PAD_T + plotH - (yv / (yMax * 1.15)) * plotH;

  const N = 40;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = (tFlight * i) / N;
    const yv = launchHeight + uy * t - 0.5 * g * t * t;
    pts.push([sx(t), sy(Math.max(yv, 0))]);
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const groundY = sy(0);

  const markVecs: ReactNode[] = [];
  const markTimes = markAt !== undefined ? [0, markAt] : [0];
  for (const t of showLaunchComponents ? markTimes : markAt !== undefined ? [markAt] : []) {
    const px = sx(t);
    const py = sy(Math.max(launchHeight + uy * t - 0.5 * g * t * t, 0));
    const vy = uy - g * t;
    const vxLen = 30;
    const vyLen = Math.max(Math.min(Math.abs(vy) * 2.2, 70), 14) * Math.sign(vy || 1);
    markVecs.push(
      <g key={`m${t}`}>
        <circle cx={px} cy={py} r={3} fill={INK} />
        <line x1={px} y1={py} x2={px + vxLen} y2={py} stroke={TEAL} strokeWidth={2} markerEnd="url(#kin-arrow-teal)" />
        <Txt x={px + vxLen + 14} y={py + 4} size={10} color={TEAL} bold>vx</Txt>
        <line x1={px} y1={py} x2={px} y2={py - vyLen} stroke={BRASS} strokeWidth={2} markerEnd="url(#kin-arrow-brass)" />
        <Txt x={px} y={py - vyLen - 6} size={10} color={BRASS} bold anchor="middle">vy</Txt>
      </g>
    );
  }

  return (
    <Frame width={width} height={height}>
      <line x1={PAD_L - 10} y1={groundY} x2={width - 16} y2={groundY} stroke={INK} strokeWidth={1.6} />
      {launchHeight > 0 && (
        <line x1={PAD_L - 10} y1={sy(launchHeight)} x2={sx(0)} y2={sy(launchHeight)} stroke={MUTE} strokeWidth={1} strokeDasharray="4 3" />
      )}
      <path d={d} fill="none" stroke={INK} strokeWidth={2.2} strokeDasharray={showLaunchComponents ? undefined : '1 0'} />
      {markVecs}
      <Txt x={(PAD_L + width - 16) / 2} y={height - 10} size={10.5} color={MUTE}>
        horizontal distance
      </Txt>
      {caption && (
        <Txt x={width / 2} y={PAD_T - 6} size={9.5} color={MUTE}>
          {caption}
        </Txt>
      )}
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Ticker-tape / strobe diagram: dots spaced by a list of gaps (mm or cm),
//    the time between dots fixed, so spacing shows speed changing.
// ─────────────────────────────────────────────────────────────────────────

export function TickerTape({
  gaps,
  unit,
  intervalLabel,
  width = 460,
  height = 130,
}: {
  gaps: number[];
  unit: string;
  intervalLabel: string;
  width?: number;
  height?: number;
}) {
  const total = gaps.reduce((a, b) => a + b, 0);
  const marginX = 26;
  const span = width - marginX * 2;
  const scale = span / total;
  let x = marginX;
  const y = height / 2;
  const dots: number[] = [x];
  for (const g of gaps) {
    x += g * scale;
    dots.push(x);
  }
  return (
    <Frame width={width} height={height}>
      <line x1={marginX - 6} y1={y} x2={width - marginX + 6} y2={y} stroke={GRID} strokeWidth={1} />
      {dots.map((dx, i) => (
        <circle key={i} cx={dx} cy={y} r={4.5} fill={INK} />
      ))}
      {gaps.map((g, i) => {
        const mid = (dots[i] + dots[i + 1]) / 2;
        return (
          <g key={i}>
            <line x1={dots[i] + 5} y1={y - 16} x2={dots[i + 1] - 5} y2={y - 16} stroke={MUTE} strokeWidth={1} markerStart="url(#kin-dim-start)" markerEnd="url(#kin-dim-end)" />
            <Txt x={mid} y={y - 22} size={10} color={MUTE} bold>
              {g} {unit}
            </Txt>
          </g>
        );
      })}
      <Txt x={width / 2} y={y + 28} size={11} color={INK}>
        {intervalLabel}
      </Txt>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Number line / path diagram for distance vs displacement questions.
// ─────────────────────────────────────────────────────────────────────────

export function DisplacementPath({
  legs,
  unit,
  width = 460,
  height = 150,
}: {
  legs: { distance: number; dir: 1 | -1; label: string }[];
  unit: string;
  width?: number;
  height?: number;
}) {
  const marginX = 36;
  const span = width - marginX * 2;
  const total = legs.reduce((a, l) => a + l.distance, 0) || 1;
  const scale = span / total;
  const y = height / 2 + 10;
  let pos = marginX;
  const segs = legs.map((l) => {
    const start = pos;
    pos += l.distance * scale * l.dir * (l.dir === -1 ? 1 : 1);
    return { start, end: pos, l };
  });
  // Normalise so the path never draws off-canvas when it reverses direction.
  const allX = segs.flatMap((s) => [s.start, s.end]);
  const minX = Math.min(...allX, marginX);
  const shift = minX < marginX ? marginX - minX : 0;

  return (
    <Frame width={width} height={height}>
      <line x1={8} y1={y} x2={width - 8} y2={y} stroke={GRID} strokeWidth={1} strokeDasharray="3 3" />
      {segs.map((s, i) => {
        const x1 = s.start + shift;
        const x2 = s.end + shift;
        const mid = (x1 + x2) / 2;
        const up = i % 2 === 0;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={i % 2 === 0 ? TEAL : BRASS} strokeWidth={2.6} markerEnd={i % 2 === 0 ? 'url(#kin-arrow-teal)' : 'url(#kin-arrow-brass)'} />
            <Txt x={mid} y={up ? y - 12 : y + 22} size={10.5} color={i % 2 === 0 ? TEAL : BRASS} bold>
              {s.l.label}
            </Txt>
          </g>
        );
      })}
      <circle cx={marginX + shift} cy={y} r={4} fill={INK} />
      <Txt x={marginX + shift} y={y + 38} size={10} color={MUTE}>start</Txt>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Measuring instruments, rendered at the actual reading given.
// ─────────────────────────────────────────────────────────────────────────

/** A ruler from 0 to maxCm, with an object's two edges marked. */
export function RulerReading({
  maxCm,
  edgeA,
  edgeB,
  width = 460,
  height = 130,
}: {
  maxCm: number;
  edgeA: number;
  edgeB: number;
  width?: number;
  height?: number;
}) {
  const marginX = 26;
  const span = width - marginX * 2;
  const scale = span / maxCm;
  const rulerY = 40;
  const objY = 86;
  const ticks = [];
  for (let mm = 0; mm <= maxCm * 10; mm++) {
    const cm = mm / 10;
    const x = marginX + cm * scale;
    const isCm = mm % 10 === 0;
    const isHalf = mm % 5 === 0;
    ticks.push(
      <line key={mm} x1={x} y1={rulerY} x2={x} y2={rulerY + (isCm ? 16 : isHalf ? 11 : 7)} stroke={INK} strokeWidth={isCm ? 1.4 : 0.8} />
    );
    if (isCm) {
      ticks.push(
        <Txt key={`l${mm}`} x={x} y={rulerY - 6} size={9.5} color={MUTE} mono>
          {cm}
        </Txt>
      );
    }
  }
  const xA = marginX + edgeA * scale;
  const xB = marginX + edgeB * scale;
  return (
    <Frame width={width} height={height}>
      <rect x={marginX - 10} y={rulerY} width={span + 20} height={26} fill="#f4efe0" stroke={INK} strokeWidth={1.2} />
      {ticks}
      <rect x={Math.min(xA, xB)} y={objY} width={Math.abs(xB - xA)} height={16} fill="#dbe7f0" stroke={TEAL} strokeWidth={1.8} />
      <line x1={xA} y1={rulerY} x2={xA} y2={objY + 22} stroke={RED} strokeWidth={1} strokeDasharray="3 2" />
      <line x1={xB} y1={rulerY} x2={xB} y2={objY + 22} stroke={RED} strokeWidth={1} strokeDasharray="3 2" />
      <Txt x={(xA + xB) / 2} y={objY + 36} size={10.5} color={RED} bold>
        object
      </Txt>
      <Txt x={width / 2} y={height - 10} size={10} color={MUTE}>
        ruler reading, cm (smallest division 1 mm)
      </Txt>
    </Frame>
  );
}

/** A micrometer screw gauge: main scale (mm) + thimble scale (0.01 mm divisions). */
export function MicrometerReading({ mainMm, thimbleHundredths, width = 460, height = 170 }: { mainMm: number; thimbleHundredths: number; width?: number; height?: number }) {
  const y = 60;
  const sleeveX = 70;
  const sleeveW = 260;
  const thimbleX = sleeveX + sleeveW - 30;
  return (
    <Frame width={width} height={height}>
      <rect x={20} y={y - 18} width={sleeveX - 10} height={36} fill="#e7e2d4" stroke={INK} strokeWidth={1.4} />
      <rect x={sleeveX} y={y - 14} width={sleeveW} height={28} fill="#f4efe0" stroke={INK} strokeWidth={1.4} />
      {Array.from({ length: 11 }).map((_, i) => (
        <g key={i}>
          <line x1={sleeveX + 14 + i * 20} y1={y - 14} x2={sleeveX + 14 + i * 20} y2={y - 14 + (i % 2 === 0 ? 10 : 6)} stroke={INK} strokeWidth={1} />
          {i % 2 === 0 && (
            <Txt x={sleeveX + 14 + i * 20} y={y - 18} size={8} color={MUTE} mono>
              {Math.round(mainMm) - 5 + i >= 0 ? Math.round(mainMm) - 5 + i : ''}
            </Txt>
          )}
        </g>
      ))}
      <line x1={sleeveX + 14 + 5 * 20} y1={y - 14} x2={sleeveX + 14 + 5 * 20} y2={y + 16} stroke={RED} strokeWidth={1.4} strokeDasharray="2 2" />
      <rect x={thimbleX} y={y - 36} width={90} height={72} rx={8} fill="#eee8d8" stroke={INK} strokeWidth={1.6} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Txt key={i} x={thimbleX + 45} y={y - 18 + i * 10} size={8} color={MUTE} mono>
          {((Math.round(thimbleHundredths / 5) * 5 - 10 + i * 5) % 50 + 50) % 50}
        </Txt>
      ))}
      <line x1={thimbleX} y1={y} x2={thimbleX + 90} y2={y} stroke={RED} strokeWidth={1.4} />
      <Txt x={width / 2} y={height - 14} size={10.5} color={MUTE}>
        main scale {mainMm.toFixed(1)} mm · thimble {thimbleHundredths.toFixed(0)}/100 mm
      </Txt>
    </Frame>
  );
}

/** A stopwatch face reading, for repeat-timing / reaction-time questions. */
export function StopwatchReading({ seconds, width = 300, height = 180 }: { seconds: number; width?: number; height?: number }) {
  const cx = width / 2;
  const cy = height / 2 - 6;
  const r = 60;
  const frac = (seconds % 60) / 60;
  const angle = frac * 2 * Math.PI - Math.PI / 2;
  return (
    <Frame width={width} height={height}>
      <circle cx={cx} cy={cy} r={r} fill="#f4efe0" stroke={INK} strokeWidth={2.2} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r - 8)}
            y1={cy + Math.sin(a) * (r - 8)}
            x2={cx + Math.cos(a) * (r - 2)}
            y2={cy + Math.sin(a) * (r - 2)}
            stroke={INK}
            strokeWidth={1.4}
          />
        );
      })}
      <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * (r - 14)} y2={cy + Math.sin(angle) * (r - 14)} stroke={RED} strokeWidth={2.2} />
      <circle cx={cx} cy={cy} r={3} fill={INK} />
      <Txt x={cx} y={cy + r + 24} size={12} bold mono>
        {seconds.toFixed(2)} s
      </Txt>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Data table (HTML, not SVG — tabular data reads better as a real table).
// ─────────────────────────────────────────────────────────────────────────

export function DataTable({ headers, rows, caption }: { headers: string[]; rows: (string | number)[][]; caption?: string }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-1 overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ fontFamily: SERIF }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-center font-semibold text-gray-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-300 px-3 py-1.5 text-center text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <p className="text-xs text-gray-400 mt-1 text-center">{caption}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Scatter plot with error bars + best-fit / worst-fit lines (uncertainty).
// ─────────────────────────────────────────────────────────────────────────

export function ScatterErrorBars({
  points,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  bestFit,
  worstFit,
  width = 460,
  height = 300,
}: {
  points: { x: number; y: number; err: number }[];
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  bestFit?: { m: number; c: number };
  worstFit?: { m: number; c: number };
  width?: number;
  height?: number;
}) {
  const xMax = Math.max(...points.map((p) => p.x)) * 1.12;
  const yMax = Math.max(...points.map((p) => p.y + p.err)) * 1.18;
  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const sx = (x: number) => PAD_L + (x / xMax) * plotW;
  const sy = (y: number) => PAD_T + plotH - (y / yMax) * plotH;
  const xStep = niceStep(xMax);
  const yStep = niceStep(yMax);
  const xTicks: number[] = [];
  for (let v = 0; v <= xMax; v += xStep) xTicks.push(Math.round(v * 1000) / 1000);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(Math.round(v * 1000) / 1000);
  const line = (fit: { m: number; c: number }) => {
    const x1 = 0;
    const x2 = xMax;
    return `M${sx(x1)},${sy(fit.c)} L${sx(x2)},${sy(fit.m * x2 + fit.c)}`;
  };

  return (
    <Frame width={width} height={height}>
      {xTicks.map((v) => (
        <line key={`gx${v}`} x1={sx(v)} y1={PAD_T} x2={sx(v)} y2={height - PAD_B} stroke={GRID} strokeWidth={1} />
      ))}
      {yTicks.map((v) => (
        <line key={`gy${v}`} x1={PAD_L} y1={sy(v)} x2={width - PAD_R} y2={sy(v)} stroke={GRID} strokeWidth={1} />
      ))}
      <line x1={PAD_L} y1={height - PAD_B} x2={width - PAD_R + 6} y2={height - PAD_B} stroke={INK} strokeWidth={1.6} markerEnd="url(#kin-arrow)" />
      <line x1={PAD_L} y1={height - PAD_B} x2={PAD_L} y2={PAD_T - 6} stroke={INK} strokeWidth={1.6} markerEnd="url(#kin-arrow)" />
      {xTicks.map((v) => (
        <Txt key={`xt${v}`} x={sx(v)} y={height - PAD_B + 16} size={10} color={MUTE} mono>{fmtNum(v)}</Txt>
      ))}
      {yTicks.map((v) => (
        <Txt key={`yt${v}`} x={PAD_L - 8} y={sy(v) + 3.5} size={10} color={MUTE} anchor="end" mono>{fmtNum(v)}</Txt>
      ))}
      <Txt x={(PAD_L + width - PAD_R) / 2} y={height - 8} size={11.5} bold>{xLabel} {xUnit ? `/ ${xUnit}` : ''}</Txt>
      <text x={14} y={(PAD_T + height - PAD_B) / 2} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={INK} fontFamily={SERIF} transform={`rotate(-90 14 ${(PAD_T + height - PAD_B) / 2})`}>
        {yLabel} {yUnit ? `/ ${yUnit}` : ''}
      </text>
      {worstFit && <path d={line(worstFit)} stroke={RED} strokeWidth={1.6} strokeDasharray="7 4" fill="none" />}
      {bestFit && <path d={line(bestFit)} stroke={TEAL} strokeWidth={1.8} fill="none" />}
      {points.map((p, i) => (
        <g key={i}>
          <line x1={sx(p.x)} y1={sy(p.y - p.err)} x2={sx(p.x)} y2={sy(p.y + p.err)} stroke={INK} strokeWidth={1.3} />
          <line x1={sx(p.x) - 4} y1={sy(p.y - p.err)} x2={sx(p.x) + 4} y2={sy(p.y - p.err)} stroke={INK} strokeWidth={1.3} />
          <line x1={sx(p.x) - 4} y1={sy(p.y + p.err)} x2={sx(p.x) + 4} y2={sy(p.y + p.err)} stroke={INK} strokeWidth={1.3} />
          <circle cx={sx(p.x)} cy={sy(p.y)} r={3.6} fill={PAPER} stroke={INK} strokeWidth={1.6} />
        </g>
      ))}
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Simple apparatus sketches: trolley-on-ramp with light gates; ball drop.
// ─────────────────────────────────────────────────────────────────────────

export function LightGateRamp({ gateDistanceCm, cardLengthCm, width = 460, height = 220 }: { gateDistanceCm: number; cardLengthCm: number; width?: number; height?: number }) {
  const rampX1 = 70;
  const rampY1 = 40;
  const rampX2 = 380;
  const rampY2 = 150;
  const gate1 = 0.42;
  const gate2 = 0.78;
  const gx = (f: number) => rampX1 + (rampX2 - rampX1) * f;
  const gy = (f: number) => rampY1 + (rampY2 - rampY1) * f;
  return (
    <Frame width={width} height={height}>
      <line x1={rampX1} y1={rampY1} x2={rampX2} y2={rampY2} stroke={INK} strokeWidth={3} />
      <line x1={rampX1} y1={rampY1} x2={rampX1 - 24} y2={rampY1 + 60} stroke={INK} strokeWidth={3} />
      <line x1={rampX2 - 40} y1={rampY2} x2={width - 40} y2={rampY2} stroke={INK} strokeWidth={3} />
      {[gate1, gate2].map((f, i) => (
        <g key={i}>
          <line x1={gx(f)} y1={gy(f) - 36} x2={gx(f)} y2={gy(f) + 6} stroke={BRASS} strokeWidth={2.4} />
          <rect x={gx(f) - 10} y={gy(f) - 44} width={20} height={10} fill={BRASS} />
          <Txt x={gx(f)} y={gy(f) - 50} size={9.5} color={BRASS} bold>
            gate {i + 1}
          </Txt>
        </g>
      ))}
      <rect x={gx(0.58) - 16} y={gy(0.58) - 13} width={32} height={13} fill="#dbe7f0" stroke={TEAL} strokeWidth={1.6} transform={`rotate(${(Math.atan2(rampY2 - rampY1, rampX2 - rampX1) * 180) / Math.PI} ${gx(0.58)} ${gy(0.58)})`} />
      <line x1={gx(gate1)} y1={gy(gate1) + 20} x2={gx(gate2)} y2={gy(gate2) + 20} stroke={MUTE} strokeWidth={1} markerStart="url(#kin-dim-start)" markerEnd="url(#kin-dim-end)" />
      <Txt x={(gx(gate1) + gx(gate2)) / 2} y={(gy(gate1) + gy(gate2)) / 2 + 34} size={10.5} bold>
        {gateDistanceCm} cm
      </Txt>
      <Txt x={width - 110} y={height - 20} size={10} color={MUTE}>
        card length {cardLengthCm} cm
      </Txt>
    </Frame>
  );
}

export function BallDropSetup({ heights, width = 300, height = 320 }: { heights: number[]; width?: number; height?: number }) {
  const topY = 30;
  const groundY = height - 36;
  const scale = (groundY - topY) / Math.max(...heights, 1);
  return (
    <Frame width={width} height={height}>
      <line x1={40} y1={groundY} x2={width - 20} y2={groundY} stroke={INK} strokeWidth={2.2} />
      <circle cx={100} cy={topY - 6} r={10} fill="#dbe7f0" stroke={INK} strokeWidth={1.6} />
      <line x1={100} y1={topY + 4} x2={100} y2={groundY} stroke={MUTE} strokeWidth={1} strokeDasharray="4 3" />
      {heights.map((h, i) => {
        const y = groundY - h * scale;
        return (
          <g key={i}>
            <line x1={100} y1={y} x2={160 + i * 4} y2={y} stroke={TEAL} strokeWidth={1} markerEnd="url(#kin-dim-end)" />
            <Txt x={190 + i * 4} y={y + 4} size={10} color={TEAL} bold anchor="start">
              {h.toFixed(2)} m
            </Txt>
          </g>
        );
      })}
      <Txt x={width / 2} y={height - 14} size={10} color={MUTE}>
        electromagnet release · trapdoor timer
      </Txt>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────

import { KINEMATICS_DIAGRAM_DATA } from './kinematicsDiagramData';

function renderKinematicsDiagram(spec: (typeof KINEMATICS_DIAGRAM_DATA)[string]): ReactNode {
  switch (spec.kind) {
    case 'motion':
      return <MotionGraph {...spec.props} />;
    case 'vector':
      return <VectorDiagram {...spec.props} />;
    case 'projectile':
      return <ProjectileTrajectory {...spec.props} />;
    case 'ticker':
      return <TickerTape {...spec.props} />;
    case 'path':
      return <DisplacementPath {...spec.props} />;
    case 'ruler':
      return <RulerReading {...spec.props} />;
    case 'micrometer':
      return <MicrometerReading {...spec.props} />;
    case 'stopwatch':
      return <StopwatchReading {...spec.props} />;
    case 'table':
      return <DataTable {...spec.props} />;
    case 'scatter':
      return <ScatterErrorBars {...spec.props} />;
    case 'lightgate':
      return <LightGateRamp {...spec.props} />;
    case 'balldrop':
      return <BallDropSetup {...spec.props} />;
    default:
      return null;
  }
}

export const KINEMATICS_DIAGRAMS: Record<string, ReactNode> = Object.fromEntries(
  Object.entries(KINEMATICS_DIAGRAM_DATA).map(([key, spec]) => [key, renderKinematicsDiagram(spec)])
);
