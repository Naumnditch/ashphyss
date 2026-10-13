/**
 * Figures for the CHALLENGING tier of "17.4 Coulomb's law (extension)"
 * (Q60 onwards) — originals, drawn in the same style as Q38's
 * "coulomb-pith-balls": a hatched support, a dashed vertical, the thread
 * angle marked with an arc, the separation as a two-headed dimension, a brass
 * insulating rod, and every mass and charge labelled.
 *
 * Like the rest of the bank's figures they show only what the question states
 * — no force arrows, unknowns drawn as "?" or "θ" — so a figure never gives
 * the answer away. They are parametric: each entry in the generated
 * coulombChallengeDiagramData.ts is just the question's own numbers, so a
 * figure cannot drift from its question. Merged into getDiagram() in
 * MomentumDiagrams.tsx, so they render on the practice page and, through
 * toSvgMarkup + SVGtoPDF, in the worksheet PDF (no hooks, plain elements).
 */

import type { ReactNode } from 'react';
import { COULOMB_CHALLENGE_DIAGRAM_DATA } from './coulombChallengeDiagramData';

const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const TEAL = '#2e7d6b';
const PAPER = '#faf7f0';
const BORDER = '#e4ddcc';
const POS = '#f3d9d4';
const NEG = '#d6e6f2';
const NEUTRAL = '#f4f1ea';
const SERIF = 'Georgia, serif';

type Sign = '+' | '−' | '?' | '';

function fillFor(sign: Sign | string) {
  return sign === '+' ? POS : sign === '−' ? NEG : NEUTRAL;
}

function Figure({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto" style={{ background: PAPER, borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <defs>
        <marker id="cch-dim-end" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={MUTE} />
        </marker>
        <marker id="cch-dim-start" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={MUTE} />
        </marker>
        <marker id="cch-field" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={TEAL} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

function Label({
  x,
  y,
  children,
  size = 12,
  color = INK,
  bold = false,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
  color?: string;
  bold?: boolean;
  anchor?: 'start' | 'middle' | 'end';
}) {
  if (!children) return null;
  return (
    <text x={r1(x)} y={r1(y)} textAnchor={anchor} fontSize={size} fontWeight={bold ? 700 : 400} fill={color} fontFamily={SERIF}>
      {children}
    </text>
  );
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Horizontal two-headed measurement arrow, value written above the middle. */
function Dimension({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  if (!label) return null;
  return (
    <g>
      <line x1={r1(x1 + 2)} y1={r1(y)} x2={r1(x2 - 2)} y2={r1(y)} stroke={MUTE} strokeWidth={1.2} markerStart="url(#cch-dim-start)" markerEnd="url(#cch-dim-end)" />
      <line x1={r1(x1)} y1={r1(y - 6)} x2={r1(x1)} y2={r1(y + 6)} stroke={MUTE} strokeWidth={1} />
      <line x1={r1(x2)} y1={r1(y - 6)} x2={r1(x2)} y2={r1(y + 6)} stroke={MUTE} strokeWidth={1} />
      <Label x={(x1 + x2) / 2} y={y - 7} color={MUTE} bold>
        {label}
      </Label>
    </g>
  );
}

/** Vertical two-headed measurement arrow, value written to its right. */
function VDimension({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  return (
    <g>
      <line x1={r1(x)} y1={r1(y1 + 2)} x2={r1(x)} y2={r1(y2 - 2)} stroke={MUTE} strokeWidth={1.2} markerStart="url(#cch-dim-start)" markerEnd="url(#cch-dim-end)" />
      <line x1={r1(x - 6)} y1={r1(y1)} x2={r1(x + 6)} y2={r1(y1)} stroke={MUTE} strokeWidth={1} />
      <line x1={r1(x - 6)} y1={r1(y2)} x2={r1(x + 6)} y2={r1(y2)} stroke={MUTE} strokeWidth={1} />
      <Label x={x + 10} y={(y1 + y2) / 2 + 4} color={MUTE} bold anchor="start">
        {label}
      </Label>
    </g>
  );
}

/** The hatched ceiling bar every thread hangs from (as in Q38). */
function Support({ cx, y, half = 70 }: { cx: number; y: number; half?: number }) {
  const ticks: number[] = [];
  for (let x = cx - half + 10; x <= cx + half - 10; x += 20) ticks.push(x);
  return (
    <g>
      <line x1={cx - half} y1={y} x2={cx + half} y2={y} stroke={INK} strokeWidth={3} />
      {ticks.map((x) => (
        <line key={x} x1={x} y1={y} x2={x - 8} y2={y - 10} stroke={INK} strokeWidth={1} />
      ))}
    </g>
  );
}

function Ball({ x, y, sign = '', r = 9 }: { x: number; y: number; sign?: Sign | string; r?: number }) {
  return (
    <g>
      <circle cx={r1(x)} cy={r1(y)} r={r} fill={fillFor(sign)} stroke={INK} strokeWidth={1.5} />
      {sign && r >= 12 && (
        <text x={r1(x)} y={r1(y + r * 0.38)} textAnchor="middle" fontSize={Math.round(r * 1.05)} fontWeight={700} fill={INK} fontFamily={SERIF}>
          {sign}
        </text>
      )}
    </g>
  );
}

/**
 * An arc from the downward vertical to a thread at `deg` (positive = to the
 * right). The label sits just OUTSIDE the arc's thread end, so it never
 * overlaps the thread, the vertical or the other side's label.
 */
function AngleArc({ px, py, deg, label, radius = 40 }: { px: number; py: number; deg: number; label: string; radius?: number }) {
  if (!label) return null;
  const t = (deg * Math.PI) / 180;
  const ex = px + radius * Math.sin(t);
  const ey = py + radius * Math.cos(t);
  const sweep = deg < 0 ? 1 : 0;
  const lx = ex + (deg < 0 ? -7 : 7);
  const ly = ey + 3;
  return (
    <g>
      <path d={`M${px},${py + radius} A${radius},${radius} 0 0,${sweep} ${r1(ex)},${r1(ey)}`} fill="none" stroke={MUTE} strokeWidth={1.2} />
      <Label x={lx} y={ly} color={MUTE} bold anchor={deg < 0 ? 'end' : 'start'}>
        {label}
      </Label>
    </g>
  );
}

/** Stacked labels beside a ball: name (bold), then the other lines. */
function BallLabels({ x, y, lines, side }: { x: number; y: number; lines: string[]; side: 'left' | 'right' }) {
  const shown = lines.filter(Boolean);
  const anchor = side === 'left' ? 'end' : 'start';
  const lx = side === 'left' ? x - 15 : x + 15;
  const top = y - ((shown.length - 1) * 14) / 2 + 4;
  return (
    <g>
      {shown.map((text, i) => (
        <Label key={i} x={lx} y={top + i * 14} size={11.5} anchor={anchor}>
          {text}
        </Label>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One ball on a thread, a second on an insulating rod held level (Q38-style)
// ─────────────────────────────────────────────────────────────────────────

export interface FixedProps {
  theta: number;
  attract: boolean;
  angleLabel: string;
  sepLabel: string;
  hangLabel?: string;
  hangMass?: string;
  hangCharge?: string;
  fixedLabel?: string;
  fixedCharge?: string;
}

export function SuspendedAndFixed({ theta, attract, angleLabel, sepLabel, hangLabel = '', hangMass = '', hangCharge = '', fixedLabel = '', fixedCharge = '' }: FixedProps) {
  const drawn = Math.max(theta, 8);
  const L = 120;
  const t = (drawn * Math.PI) / 180;
  const px = attract ? 190 : 250;
  const py = 26;
  const dir = attract ? 1 : -1;
  const bx = px + dir * L * Math.sin(t);
  const by = py + L * Math.cos(t);
  const fx = bx + 92;
  const rodEnd = Math.min(fx + 140, 446);
  const height = by + 62;
  return (
    <Figure width={460} height={r1(height)}>
      <Support cx={px} y={py} />
      <line x1={px} y1={py} x2={px} y2={r1(by + 16)} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <AngleArc px={px} py={py} deg={dir * drawn} label={angleLabel} />
      <line x1={px} y1={py} x2={r1(bx)} y2={r1(by)} stroke={INK} strokeWidth={1.4} />
      <Ball x={bx} y={by} sign={hangCharge.startsWith('+') ? '+' : hangCharge.startsWith('−') ? '−' : ''} />
      <BallLabels x={bx} y={by - (attract ? 22 : 0)} side={attract ? 'right' : 'left'} lines={[hangLabel, hangMass, hangCharge]} />
      <Ball x={fx} y={by} sign={fixedCharge.startsWith('+') ? '+' : fixedCharge.startsWith('−') ? '−' : ''} />
      <line x1={r1(fx + 9)} y1={r1(by)} x2={r1(rodEnd)} y2={r1(by)} stroke={BRASS} strokeWidth={4} strokeLinecap="round" />
      <Label x={(fx + rodEnd) / 2 + 6} y={by - 10} size={10.5} color={MUTE}>
        insulating rod
      </Label>
      <Label x={fx} y={by + 26} size={11.5} bold={!!fixedLabel}>
        {[fixedLabel, fixedCharge].filter(Boolean).join('  ')}
      </Label>
      <Dimension x1={bx} x2={fx} y={by + 46} label={sepLabel} />
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Two balls from the same point
// ─────────────────────────────────────────────────────────────────────────

export interface PairBall {
  mass: string;
  charge: string;
}

export interface PairProps {
  theta1: number;
  theta2: number;
  level?: boolean;
  threadLabel: string;
  angle1: string;
  angle2: string;
  sepLabel: string;
  left: PairBall;
  right: PairBall;
}

export function SharedPivotPair({ theta1, theta2, level = false, threadLabel, angle1, angle2, sepLabel, left, right }: PairProps) {
  const d1 = Math.max(theta1, 8);
  const d2 = Math.max(theta2, 8);
  const t1 = (d1 * Math.PI) / 180;
  const t2 = (d2 * Math.PI) / 180;
  const px = 230;
  const py = 26;
  const H = 122;
  const L1 = level ? H / Math.cos(t1) : 132;
  const L2 = level ? H / Math.cos(t2) : 132;
  const x1 = px - L1 * Math.sin(t1);
  const y1 = py + L1 * Math.cos(t1);
  const x2 = px + L2 * Math.sin(t2);
  const y2 = py + L2 * Math.cos(t2);
  const low = Math.max(y1, y2);
  const signOf = (c: string): Sign => (c.includes('+') ? '+' : c.includes('−') ? '−' : '');
  return (
    <Figure width={460} height={r1(low + (sepLabel ? 58 : 34))}>
      <Support cx={px} y={py} />
      <line x1={px} y1={py} x2={px} y2={r1(low + 12)} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <AngleArc px={px} py={py} deg={-d1} label={angle1} radius={44} />
      <AngleArc px={px} py={py} deg={d2} label={angle2} radius={44} />
      <line x1={px} y1={py} x2={r1(x1)} y2={r1(y1)} stroke={INK} strokeWidth={1.4} />
      <line x1={px} y1={py} x2={r1(x2)} y2={r1(y2)} stroke={INK} strokeWidth={1.4} />
      {threadLabel && (
        <Label x={px - 0.66 * L1 * Math.sin(t1) - 8} y={py + 0.66 * L1 * Math.cos(t1)} size={11.5} color={MUTE} bold anchor="end">
          {threadLabel}
        </Label>
      )}
      <Ball x={x1} y={y1} sign={signOf(left.charge)} />
      <Ball x={x2} y={y2} sign={signOf(right.charge)} />
      <BallLabels x={x1} y={y1} side="left" lines={[left.mass, left.charge]} />
      <BallLabels x={x2} y={y2} side="right" lines={[right.mass, right.charge]} />
      {level && <line x1={r1(x1)} y1={r1(y1)} x2={r1(x2)} y2={r1(y2)} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 3" />}
      <Dimension x1={x1} x2={x2} y={low + 40} label={sepLabel} />
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A ball hanging directly above a fixed charged ball
// ─────────────────────────────────────────────────────────────────────────

export function VerticalPair({ hangMass, hangCharge, fixedCharge, sepLabel }: { hangMass: string; hangCharge: string; fixedCharge: string; sepLabel: string }) {
  const cx = 200;
  const top = 26;
  const yh = 104;
  const yf = 178;
  const sign = (c: string): Sign => (c.startsWith('+') ? '+' : c.startsWith('−') ? '−' : '');
  return (
    <Figure width={460} height={250}>
      <Support cx={cx} y={top} />
      <line x1={cx} y1={top} x2={cx} y2={yh - 9} stroke={INK} strokeWidth={1.4} />
      <Ball x={cx} y={yh} sign={sign(hangCharge)} />
      <BallLabels x={cx} y={yh} side="left" lines={[hangMass, hangCharge]} />
      <Ball x={cx} y={yf} sign={sign(fixedCharge)} />
      <line x1={cx} y1={yf + 9} x2={cx} y2={226} stroke={BRASS} strokeWidth={4} strokeLinecap="round" />
      <line x1={cx - 40} y1={228} x2={cx + 40} y2={228} stroke={INK} strokeWidth={3} />
      <Label x={cx - 16} y={212} size={10.5} color={MUTE} anchor="end">
        insulating stand
      </Label>
      <BallLabels x={cx} y={yf} side="left" lines={[fixedCharge]} />
      <VDimension x={cx + 44} y1={yh} y2={yf} label={sepLabel} />
      <line x1={cx + 10} y1={yh} x2={cx + 50} y2={yh} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 3" />
      <line x1={cx + 10} y1={yf} x2={cx + 50} y2={yf} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 3" />
      <Label x={cx + 18} y={top + 40} size={10.5} color={MUTE} anchor="start">
        insulating thread
      </Label>
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A ball on a thread in a uniform horizontal field
// ─────────────────────────────────────────────────────────────────────────

export function FieldPendulum({
  theta,
  angleLabel,
  fieldLabel,
  hangMass,
  hangCharge,
  plates = false,
}: {
  theta: number;
  angleLabel: string;
  fieldLabel: string;
  hangMass: string;
  hangCharge: string;
  plates?: boolean;
}) {
  const px = 200;
  const py = 30;
  const L = 124;
  const t = (Math.max(theta, 8) * Math.PI) / 180;
  const bx = px + L * Math.sin(t);
  const by = py + L * Math.cos(t);
  const rows = [66, 106, 192];
  return (
    <Figure width={460} height={214}>
      {plates && (
        <g>
          <rect x={60} y={20} width={8} height={170} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
          <rect x={372} y={20} width={8} height={170} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
          {[40, 80, 120, 160].map((y) => (
            <g key={y}>
              <Label x={50} y={y + 4} bold>
                +
              </Label>
              <Label x={392} y={y + 4} bold>
                −
              </Label>
            </g>
          ))}
        </g>
      )}
      {rows.map((y) => (
        <line key={y} x1={plates ? 80 : 30} y1={y} x2={plates ? 362 : 430} y2={y} stroke={TEAL} strokeWidth={1} strokeOpacity={0.55} markerEnd="url(#cch-field)" />
      ))}
      <Label x={plates ? 300 : 340} y={plates ? 46 : 22} size={11.5} color={TEAL} bold>
        {fieldLabel + '  →'}
      </Label>
      <Support cx={px} y={py} half={50} />
      <line x1={px} y1={py} x2={px} y2={r1(by + 14)} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <AngleArc px={px} py={py} deg={Math.max(theta, 8)} label={angleLabel} />
      <line x1={px} y1={py} x2={r1(bx)} y2={r1(by)} stroke={INK} strokeWidth={1.4} />
      <Ball x={bx} y={by} sign={hangCharge.startsWith('+') ? '+' : ''} />
      <BallLabels x={bx} y={by} side="right" lines={[hangMass, hangCharge]} />
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A table of readings, drawn in SVG so it prints with the question
// ─────────────────────────────────────────────────────────────────────────

export function ReadingsTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  const colW = 120;
  const rowH = 24;
  const width = 460;
  const x0 = (width - colW * columns.length) / 2;
  const y0 = 36;
  const height = y0 + rowH * (rows.length + 1) + 16;
  return (
    <Figure width={width} height={height}>
      <Label x={width / 2} y={22} size={11.5} color={MUTE} bold>
        {title}
      </Label>
      <rect x={x0} y={y0} width={colW * columns.length} height={rowH} fill="#efe7d4" stroke={INK} strokeWidth={1} />
      {columns.map((c, i) => (
        <Label key={c} x={x0 + colW * i + colW / 2} y={y0 + 16} size={12} bold>
          {c}
        </Label>
      ))}
      {rows.map((row, j) => (
        <g key={j}>
          <rect x={x0} y={y0 + rowH * (j + 1)} width={colW * columns.length} height={rowH} fill="#ffffff" stroke={INK} strokeWidth={0.8} />
          {row.map((cell, i) => (
            <Label key={i} x={x0 + colW * i + colW / 2} y={y0 + rowH * (j + 1) + 16} size={12}>
              {cell}
            </Label>
          ))}
        </g>
      ))}
      {columns.slice(1).map((_, i) => (
        <line key={i} x1={x0 + colW * (i + 1)} y1={y0} x2={x0 + colW * (i + 1)} y2={y0 + rowH * (rows.length + 1)} stroke={INK} strokeWidth={0.8} />
      ))}
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Charges on a line
// ─────────────────────────────────────────────────────────────────────────

interface LineCharge {
  x: number;
  name: string;
  value: string;
  sign: Sign;
  small?: boolean;
}

export function ChargesOnLine({
  charges,
  span,
  dims,
  point,
}: {
  charges: LineCharge[];
  span: [number, number];
  dims: [number, number, string][];
  point?: { x: number; label: string };
}) {
  const left = 30;
  const right = 430;
  const X = (v: number) => left + ((v - span[0]) / (span[1] - span[0])) * (right - left);
  const axisY = 96;
  return (
    <Figure width={460} height={160}>
      <line x1={18} y1={axisY} x2={444} y2={axisY} stroke={MUTE} strokeWidth={1.2} markerEnd="url(#cch-dim-end)" />
      <Label x={440} y={axisY + 20} size={11} color={MUTE}>
        x
      </Label>
      {dims.map(([a, b, label]) => (
        <Dimension key={`${a}-${b}`} x1={X(a)} x2={X(b)} y={40} label={label} />
      ))}
      {charges.map((c) => (
        <g key={`${c.x}-${c.name}`}>
          <line x1={r1(X(c.x))} y1={48} x2={r1(X(c.x))} y2={axisY - 18} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
          <Ball x={X(c.x)} y={axisY} sign={c.sign} r={c.small ? 11 : 16} />
          <Label x={X(c.x)} y={axisY + 34} bold>
            {c.name}
          </Label>
          <Label x={X(c.x)} y={axisY + 50} size={11}>
            {c.value}
          </Label>
        </g>
      ))}
      {point && (
        <g>
          <line x1={r1(X(point.x) - 6)} y1={axisY - 6} x2={r1(X(point.x) + 6)} y2={axisY + 6} stroke={INK} strokeWidth={1.6} />
          <line x1={r1(X(point.x) - 6)} y1={axisY + 6} x2={r1(X(point.x) + 6)} y2={axisY - 6} stroke={INK} strokeWidth={1.6} />
          <Label x={X(point.x)} y={axisY + 34} bold>
            {point.label}
          </Label>
        </g>
      )}
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Charges at the corners of a square or rectangle (and optionally the centre)
// ─────────────────────────────────────────────────────────────────────────

interface CornerCharge {
  name: string;
  value: string;
  sign: Sign;
}

export function CornerCharges({
  wLabel,
  hLabel,
  square,
  corners,
  centre,
}: {
  wLabel: string;
  hLabel: string;
  square: boolean;
  corners: { tl: CornerCharge; tr: CornerCharge; br: CornerCharge; bl: CornerCharge };
  centre?: CornerCharge;
}) {
  const w = square ? 150 : 200;
  const h = square ? 150 : 150;
  const x0 = (460 - w) / 2;
  const y0 = 36;
  const pts = {
    tl: [x0, y0],
    tr: [x0 + w, y0],
    br: [x0 + w, y0 + h],
    bl: [x0, y0 + h],
  } as const;
  return (
    <Figure width={460} height={y0 + h + 52}>
      <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      {centre && <line x1={x0} y1={y0} x2={x0 + w} y2={y0 + h} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 4" />}
      {centre && <line x1={x0 + w} y1={y0} x2={x0} y2={y0 + h} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 4" />}
      <Label x={x0 + w / 2} y={y0 + h + 40} color={MUTE} bold>
        {wLabel}
      </Label>
      <Label x={x0 + w + 14} y={y0 + h / 2 + 4} color={MUTE} bold anchor="start">
        {hLabel}
      </Label>
      {(Object.keys(pts) as (keyof typeof pts)[]).map((key) => {
        const [x, y] = pts[key];
        const c = corners[key];
        const side = key === 'tl' || key === 'bl' ? 'left' : 'right';
        const labelY = key === 'tl' || key === 'tr' ? y - 4 : y + 4;
        return (
          <g key={key}>
            <Ball x={x} y={y} sign={c.sign} r={15} />
            <BallLabels x={x + (side === 'left' ? -6 : 6)} y={labelY} side={side} lines={[c.name, c.value]} />
          </g>
        );
      })}
      {centre && (
        <g>
          <Ball x={x0 + w / 2} y={y0 + h / 2} sign={centre.sign} r={12} />
          <Label x={x0 + w / 2} y={y0 + h / 2 + 30} size={11}>
            {centre.value}
          </Label>
        </g>
      )}
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Oil drop between horizontal plates
// ─────────────────────────────────────────────────────────────────────────

export function OilDropPlates({ fieldLabel, dropLabel }: { fieldLabel: string; dropLabel: string }) {
  return (
    <Figure width={460} height={200}>
      <rect x={70} y={28} width={320} height={9} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
      <rect x={70} y={160} width={320} height={9} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
      {[100, 150, 230, 290, 360].map((x) => (
        <g key={x}>
          <Label x={x} y={22} bold>
            +
          </Label>
          <Label x={x} y={186} bold>
            −
          </Label>
          {(x < 200 || x > 320) && <line x1={x} y1={46} x2={x} y2={150} stroke={TEAL} strokeWidth={1} strokeOpacity={0.55} markerEnd="url(#cch-field)" />}
        </g>
      ))}
      <Ball x={206} y={92} r={7} />
      <Label x={218} y={96} size={11.5} anchor="start">
        {dropLabel}
      </Label>
      <Label x={402} y={102} size={11} color={TEAL} bold anchor="start">
        E ↓
      </Label>
      <Label x={262} y={128} size={11} color={TEAL}>
        {fieldLabel}
      </Label>
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A graph: a straight line through the origin, or a power-law curve
// ─────────────────────────────────────────────────────────────────────────

function niceStep(max: number) {
  const raw = max / 5;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p;
  return 10 * p;
}

function tickText(v: number) {
  if (v === 0) return '0';
  return Number(v.toPrecision(3)).toString();
}

export function ForceGraph({
  xLabel,
  yLabel,
  xMax,
  yMax,
  xTicks,
  line,
  curve,
  mark,
}: {
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMax: number;
  xTicks: number[];
  line?: { gradient: number };
  curve?: { A: number; power: number; xFrom: number };
  mark?: { x: number; y: number; label: string };
}) {
  const ox = 70;
  const oy = 200;
  const W = 340;
  const H = 168;
  const X = (v: number) => ox + (v / xMax) * W;
  const Y = (v: number) => oy - (v / yMax) * H;
  const step = niceStep(yMax);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-12; v += step) yTicks.push(Number(v.toPrecision(6)));
  let path = '';
  if (line) {
    const xEnd = Math.min(xMax, yMax / line.gradient);
    path = `M${ox},${oy} L${r1(X(xEnd))},${r1(Y(line.gradient * xEnd))}`;
  } else if (curve) {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const xv = curve.xFrom + ((xMax - curve.xFrom) * i) / 60;
      const yv = curve.A * Math.pow(xv, curve.power);
      if (yv > yMax) continue;
      pts.push(`${r1(X(xv))},${r1(Y(yv))}`);
    }
    path = `M${pts.join(' L')}`;
  }
  return (
    <Figure width={460} height={240}>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={ox} y1={r1(Y(v))} x2={ox + W} y2={r1(Y(v))} stroke="#d8cfb6" strokeWidth={0.6} />
          <Label x={ox - 6} y={Y(v) + 4} size={10} color={MUTE} anchor="end">
            {tickText(v)}
          </Label>
        </g>
      ))}
      {xTicks.map((v) => (
        <g key={`x${v}`}>
          <line x1={r1(X(v))} y1={oy - H} x2={r1(X(v))} y2={oy} stroke="#d8cfb6" strokeWidth={0.6} />
          <Label x={X(v)} y={oy + 15} size={10} color={MUTE}>
            {tickText(v)}
          </Label>
        </g>
      ))}
      <line x1={ox} y1={oy} x2={ox + W + 10} y2={oy} stroke={INK} strokeWidth={1.4} markerEnd="url(#cch-dim-end)" />
      <line x1={ox} y1={oy} x2={ox} y2={oy - H - 12} stroke={INK} strokeWidth={1.4} markerEnd="url(#cch-dim-end)" />
      <Label x={ox + W / 2} y={oy + 33} size={11.5} bold>
        {xLabel}
      </Label>
      <Label x={ox - 8} y={oy - H - 18} size={11.5} bold anchor="start">
        {yLabel}
      </Label>
      <path d={path} fill="none" stroke={TEAL} strokeWidth={2} />
      {mark && (
        <g>
          <line x1={r1(X(mark.x))} y1={r1(Y(mark.y))} x2={r1(X(mark.x))} y2={oy} stroke={MUTE} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={ox} y1={r1(Y(mark.y))} x2={r1(X(mark.x))} y2={r1(Y(mark.y))} stroke={MUTE} strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={r1(X(mark.x))} cy={r1(Y(mark.y))} r={3.5} fill={INK} />
          <Label x={X(mark.x) + (mark.x > 0.6 * xMax ? -8 : 8)} y={Y(mark.y) - 8} size={11} anchor={mark.x > 0.6 * xMax ? 'end' : 'start'} bold>
            {mark.label}
          </Label>
        </g>
      )}
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Two spheres of finite size: radius and surface gap marked
// ─────────────────────────────────────────────────────────────────────────

export function SpheresWithGap({ radiusLabel, gapLabel, charge }: { radiusLabel: string; gapLabel: string; charge: string }) {
  const R = 32;
  const c1 = 140;
  const c2 = 320;
  const y = 92;
  return (
    <Figure width={460} height={170}>
      <circle cx={c1} cy={y} r={R} fill={POS} stroke={INK} strokeWidth={1.6} />
      <circle cx={c2} cy={y} r={R} fill={POS} stroke={INK} strokeWidth={1.6} />
      <circle cx={c1} cy={y} r={2} fill={INK} />
      <circle cx={c2} cy={y} r={2} fill={INK} />
      <line x1={c1} y1={y} x2={c1 - R * 0.7} y2={y - R * 0.7} stroke={MUTE} strokeWidth={1.1} />
      <Label x={c1 - 34} y={y - 30} size={11} color={MUTE} bold anchor="end">
        {radiusLabel}
      </Label>
      <Dimension x1={c1 + R} x2={c2 - R} y={36} label={gapLabel} />
      <line x1={c1 + R} y1={44} x2={c1 + R} y2={y} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 3" />
      <line x1={c2 - R} y1={44} x2={c2 - R} y2={y} stroke={MUTE} strokeWidth={0.8} strokeDasharray="2 3" />
      <Label x={c1} y={y + R + 22} size={11.5}>
        {charge}
      </Label>
      <Label x={c2} y={y + R + 22} size={11.5}>
        {charge}
      </Label>
    </Figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────

function renderCoulombChallengeDiagram(spec: (typeof COULOMB_CHALLENGE_DIAGRAM_DATA)[string]): ReactNode {
  switch (spec.kind) {
    case 'fixed':
      return <SuspendedAndFixed {...spec.props} />;
    case 'pair':
      return <SharedPivotPair {...spec.props} />;
    case 'vertical':
      return <VerticalPair {...spec.props} />;
    case 'field':
      return <FieldPendulum {...spec.props} />;
    case 'table':
      return <ReadingsTable {...spec.props} />;
    case 'line':
      return <ChargesOnLine {...spec.props} />;
    case 'rect':
      return <CornerCharges {...spec.props} />;
    case 'plates':
      return <OilDropPlates {...spec.props} />;
    case 'graph':
      return <ForceGraph {...spec.props} />;
    case 'gap':
      return <SpheresWithGap {...spec.props} />;
    default:
      return null;
  }
}

export const COULOMB_CHALLENGE_DIAGRAMS: Record<string, ReactNode> = Object.fromEntries(
  Object.entries(COULOMB_CHALLENGE_DIAGRAM_DATA).map(([key, spec]) => [key, renderCoulombChallengeDiagram(spec)])
);
