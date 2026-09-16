'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type Vec2,
  add,
  subtract,
  scaleVec,
  negate,
  sum,
  magnitude,
  angleDeg,
  toPolar,
  fromPolar,
  cumulativeChain,
  angleDiff,
  fmtMag,
  fmtAngle,
  round2,
  clamp,
  snapToGrid,
} from '@/lib/vectors';

/**
 * Vector Addition sandbox — six modes across one tab bar, all sharing the
 * same lib/vectors.ts math (verified independently in Node: 30,011 checks,
 * polar/cartesian round-trips, tip-to-tail == component sum, parallelogram
 * diagonal, commutativity, a-b == a+(-b), every quadrant, before any of
 * this UI existed).
 *
 * 1D: vectors on a number line. 2D Sandbox: the core free-form canvas.
 * Methods: tip-to-tail / parallelogram / components, manually stepped
 * (no auto-play — Back/Next only, same pattern as the Equation
 * Rearranger's stepping). Equations: c = s1*a + s2*b with sliders, plus a
 * stepped a-(-b) demo. Scale Drawing: the IGCSE exam skill itself, with a
 * virtual ruler and protractor. Challenges: randomly generated problems
 * with worked solutions and a streak counter.
 */

// ---------- shared visual language ----------
const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const RED = '#b34a3c';
const TEAL = '#2e7d6b';
const PAPER = '#faf7f0';
const GRID_LINE = 'rgba(27,42,65,0.08)';
const AXIS_LINE = 'rgba(27,42,65,0.4)';

const VECTOR_COLORS = ['#b8823d', '#2e7d6b', '#3d6b9e', '#a8478f', '#6b8e3d', '#c9702c'];
const RESULTANT_COLOR = '#1b2a41';
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

const cardCls = 'bg-white border border-[#e4ddcc] rounded overflow-hidden';
const labelCls = 'font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]';
const pillBtn = (active: boolean) =>
  `text-[12.5px] font-semibold px-4 py-1.5 rounded-full border transition-colors ${
    active ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-white text-[#4a5a72] border-[#d8cfb6] hover:bg-[#faf7f0]'
  }`;

// ---------- world <-> screen transform ----------
function makeTransform(originPx: Vec2, pxPerUnit: number) {
  const toScreen = (p: Vec2): Vec2 => ({ x: originPx.x + p.x * pxPerUnit, y: originPx.y - p.y * pxPerUnit });
  const toWorld = (p: Vec2): Vec2 => ({ x: (p.x - originPx.x) / pxPerUnit, y: -(p.y - originPx.y) / pxPerUnit });
  return { toScreen, toWorld };
}

function clientToLocal(svg: SVGSVGElement, clientX: number, clientY: number, viewW: number, viewH: number): Vec2 {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * viewW,
    y: ((clientY - rect.top) / rect.height) * viewH,
  };
}

// ---------- shared SVG pieces ----------
function ArrowHead({ tip, ux, uy, color, size = 13 }: { tip: Vec2; ux: number; uy: number; color: string; size?: number }) {
  const w = size * 0.62;
  const baseX = tip.x - ux * size;
  const baseY = tip.y - uy * size;
  const perpX = -uy;
  const perpY = ux;
  const p1 = { x: baseX + (perpX * w) / 2, y: baseY + (perpY * w) / 2 };
  const p2 = { x: baseX - (perpX * w) / 2, y: baseY - (perpY * w) / 2 };
  return <polygon points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} />;
}

/** A single vector arrow, drawn from screen-space tail to screen-space tip. */
function Arrow({
  tail,
  tip,
  color,
  width = 3.5,
  dashed = false,
  opacity = 1,
  className,
}: {
  tail: Vec2;
  tip: Vec2;
  color: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
  className?: string;
}) {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.min(14, Math.max(8, len * 0.22));
  const shaftEndX = tip.x - ux * headLen * 0.55;
  const shaftEndY = tip.y - uy * headLen * 0.55;
  return (
    <g opacity={opacity} className={className} style={{ transition: 'opacity 300ms ease' }}>
      <line
        x1={tail.x}
        y1={tail.y}
        x2={shaftEndX}
        y2={shaftEndY}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? '7 6' : undefined}
        strokeLinecap="round"
        style={{ transition: 'all 500ms ease' }}
      />
      <g style={{ transition: 'all 500ms ease' }}>
        <ArrowHead tip={tip} ux={ux} uy={uy} color={color} size={headLen} />
      </g>
    </g>
  );
}

function DragHandle({ p, onDown, r = 9, fill = '#fff', stroke = INK }: { p: Vec2; onDown: (e: React.PointerEvent) => void; r?: number; fill?: string; stroke?: string }) {
  return (
    <circle
      cx={p.x}
      cy={p.y}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
      className="cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onPointerDown={onDown}
    />
  );
}

/** Degree arc between two directions (from angle 0 measured at `center`), plus a numeric label. */
function AngleArc({ center, fromDeg, toDeg, radius, color = MUTE, showLabel = true }: { center: Vec2; fromDeg: number; toDeg: number; radius: number; color?: string; showLabel?: boolean }) {
  let a0 = fromDeg;
  let a1 = toDeg;
  let sweep = a1 - a0;
  while (sweep <= -180) sweep += 360;
  while (sweep > 180) sweep -= 360;
  a1 = a0 + sweep;
  const toXY = (deg: number) => ({ x: center.x + radius * Math.cos((-deg * Math.PI) / 180), y: center.y + radius * Math.sin((-deg * Math.PI) / 180) });
  const p0 = toXY(a0);
  const p1 = toXY(a1);
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 0 : 1;
  const mid = toXY(a0 + sweep / 2);
  return (
    <g>
      <path d={`M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${p1.x} ${p1.y}`} fill="none" stroke={color} strokeWidth={1.75} opacity={0.85} />
      {showLabel && (
        <text x={mid.x} y={mid.y} fontSize={11.5} fontFamily="monospace" fill={color} textAnchor="middle" dominantBaseline="middle" style={{ paintOrder: 'stroke', stroke: PAPER, strokeWidth: 3 }}>
          {fmtAngle(Math.abs(sweep))}°
        </text>
      )}
    </g>
  );
}

function GridAndAxes({ viewW, viewH, origin, pxPerUnit, showGrid }: { viewW: number; viewH: number; origin: Vec2; pxPerUnit: number; showGrid: boolean }) {
  const unitsLeft = Math.ceil(origin.x / pxPerUnit);
  const unitsRight = Math.ceil((viewW - origin.x) / pxPerUnit);
  const unitsUp = Math.ceil(origin.y / pxPerUnit);
  const unitsDown = Math.ceil((viewH - origin.y) / pxPerUnit);
  const lines: React.ReactNode[] = [];
  if (showGrid) {
    for (let i = -unitsLeft; i <= unitsRight; i++) {
      const x = origin.x + i * pxPerUnit;
      lines.push(<line key={`gx${i}`} x1={x} y1={0} x2={x} y2={viewH} stroke={GRID_LINE} strokeWidth={1} />);
    }
    for (let i = -unitsUp; i <= unitsDown; i++) {
      const y = origin.y + i * pxPerUnit;
      lines.push(<line key={`gy${i}`} x1={0} y1={y} x2={viewW} y2={y} stroke={GRID_LINE} strokeWidth={1} />);
    }
  }
  return (
    <g>
      {lines}
      <line x1={0} y1={origin.y} x2={viewW} y2={origin.y} stroke={AXIS_LINE} strokeWidth={1.5} />
      <line x1={origin.x} y1={0} x2={origin.x} y2={viewH} stroke={AXIS_LINE} strokeWidth={1.5} />
    </g>
  );
}

// ---------- readout chip ----------
function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded bg-[#faf7f0] border border-[#eee6d3] min-w-[64px]">
      <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a8a196]">{label}</span>
      <span className="text-[13.5px] font-mono font-bold" style={{ color: color ?? INK }}>
        {value}
      </span>
    </div>
  );
}

type Tab = '1d' | '2d' | 'methods' | 'equations' | 'scale' | 'challenges';
const TABS: { id: Tab; label: string }[] = [
  { id: '1d', label: '1D' },
  { id: '2d', label: '2D Sandbox' },
  { id: 'methods', label: 'Methods' },
  { id: 'equations', label: 'Equations' },
  { id: 'scale', label: 'Scale Drawing' },
  { id: 'challenges', label: 'Challenges' },
];

export function VectorAdditionSimulator() {
  const [tab, setTab] = useState<Tab>('1d');

  return (
    <div className="vector-addition flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={pillBtn(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === '1d' && <Mode1D />}
      {tab === '2d' && <Mode2DSandbox />}
      {tab === 'methods' && <Mode3Methods />}
      {tab === 'equations' && <Mode4Equations />}
      {tab === 'scale' && <Mode5ScaleDrawing />}
      {tab === 'challenges' && <Mode6Challenges />}

      <HowToUse tab={tab} />
    </div>
  );
}

// ================= MODE 1: 1D =================

interface Vec1 {
  label: string;
  color: string;
  value: number; // signed magnitude along the line
}

const CONTEXTS_1D = [
  { id: 'displacement', name: 'Displacement', unit: 'm' },
  { id: 'force', name: 'Force', unit: 'N' },
  { id: 'velocity', name: 'Velocity', unit: 'm/s' },
];

function Mode1D() {
  const [context, setContext] = useState(0);
  const [vecs, setVecs] = useState<Vec1[]>([
    { label: 'a', color: VECTOR_COLORS[0], value: 4 },
    { label: 'b', color: VECTOR_COLORS[1], value: -2.5 },
  ]);
  const dragRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const unit = CONTEXTS_1D[context].unit;
  const W = 760;
  const H = 300;
  const originX = W / 2;
  const range = 8; // -8..8 units shown
  const pxPerUnit = (W / 2 - 40) / range;

  const total = vecs.reduce((s, v) => s + v.value, 0);
  const chainStarts: number[] = [];
  {
    let running = 0;
    for (const v of vecs) {
      chainStarts.push(running);
      running += v.value;
    }
  }

  const toX = (val: number) => originX + val * pxPerUnit;
  const toVal = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const localX = ((clientX - rect.left) / rect.width) * W;
    return clamp((localX - originX) / pxPerUnit, -range, range);
  };

  const onDown = (i: number) => (e: React.PointerEvent) => {
    dragRef.current = i;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragRef.current === null) return;
    const v = toVal(e.clientX);
    setVecs((prev) => prev.map((p, idx) => (idx === dragRef.current ? { ...p, value: round2(v) } : p)));
  };
  const onUp = () => {
    dragRef.current = null;
  };

  const addVec = () => {
    if (vecs.length >= 4) return;
    const idx = vecs.length;
    setVecs([...vecs, { label: LETTERS[idx], color: VECTOR_COLORS[idx], value: idx % 2 === 0 ? 3 : -3 }]);
  };
  const removeVec = () => {
    if (vecs.length <= 2) return;
    setVecs(vecs.slice(0, -1));
  };

  const rowH = 46;
  const individualTop = 46;
  const chainTop = individualTop + vecs.length * rowH + 30;
  const resultRow = chainTop + vecs.length * rowH + 6;

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
          <span className={labelCls}>1D — vectors on a line</span>
          <div className="flex items-center gap-1.5">
            {CONTEXTS_1D.map((c, i) => (
              <button key={c.id} onClick={() => setContext(i)} className={pillBtn(context === i)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none"
            style={{ minWidth: 500, display: 'block' }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* ticks */}
            {Array.from({ length: range * 2 + 1 }).map((_, i) => {
              const val = i - range;
              const x = toX(val);
              return (
                <g key={i}>
                  <line x1={x} y1={individualTop - 8} x2={x} y2={resultRow + rowH + 8} stroke={GRID_LINE} strokeWidth={1} />
                  <text x={x} y={resultRow + rowH + 24} fontSize={10.5} fontFamily="monospace" fill={MUTE} textAnchor="middle">
                    {val}
                  </text>
                </g>
              );
            })}

            <text x={8} y={individualTop - 16} fontSize={10} fontFamily="monospace" fill={MUTE}>
              INDIVIDUALLY (FROM 0)
            </text>
            {vecs.map((v, i) => {
              const y = individualTop + i * rowH;
              return (
                <g key={`ind${i}`}>
                  <line x1={40} y1={y} x2={W - 40} y2={y} stroke={GRID_LINE} strokeWidth={1} />
                  <Arrow tail={{ x: toX(0), y }} tip={{ x: toX(v.value), y }} color={v.color} width={4} />
                  <text x={toX(0) - 12} y={y + 4} fontSize={12} fontFamily="Georgia, serif" fontStyle="italic" fill={v.color} textAnchor="end">
                    {v.label}
                  </text>
                  <DragHandle p={{ x: toX(v.value), y }} onDown={onDown(i)} />
                </g>
              );
            })}

            <text x={8} y={chainTop - 16} fontSize={10} fontFamily="monospace" fill={MUTE}>
              tip-to-tail (order shown top to bottom)
            </text>
            {vecs.map((v, i) => {
              const y = chainTop + i * rowH;
              const start = chainStarts[i];
              const end = start + v.value;
              return (
                <g key={`chain${i}`}>
                  <line x1={40} y1={y} x2={W - 40} y2={y} stroke={GRID_LINE} strokeWidth={1} />
                  <Arrow tail={{ x: toX(start), y }} tip={{ x: toX(end), y }} color={v.color} width={4} />
                </g>
              );
            })}

            <line x1={toX(0)} y1={chainTop - 10} x2={toX(0)} y2={resultRow + 16} stroke={AXIS_LINE} strokeWidth={1.5} />
            <Arrow tail={{ x: toX(0), y: resultRow }} tip={{ x: toX(total), y: resultRow }} color={RESULTANT_COLOR} width={5} />
            <text x={toX(0) - 12} y={resultRow + 4} fontSize={13} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fill={RESULTANT_COLOR} textAnchor="end">
              R
            </text>
          </svg>
        </div>

        <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button onClick={addVec} disabled={vecs.length >= 4} className="text-[11.5px] font-semibold px-3 py-1 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0] disabled:opacity-35">
              + vector
            </button>
            <button onClick={removeVec} disabled={vecs.length <= 2} className="text-[11.5px] font-semibold px-3 py-1 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0] disabled:opacity-35">
              − vector
            </button>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {vecs.map((v, i) => (
              <span key={i} className="text-[12px] font-mono px-2 py-1 rounded" style={{ background: `${v.color}1a`, color: v.color }}>
                {v.label} = {fmtMag(v.value)} {unit}
              </span>
            ))}
            <span className="text-[12px] font-mono px-2 py-1 rounded bg-[#eef2ef]" style={{ color: RESULTANT_COLOR }}>
              R = {fmtMag(total)} {unit} ({total >= 0 ? 'positive' : 'negative'} direction)
            </span>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-[#4a5a72] leading-snug px-1">
        Drag any arrowhead to change its {CONTEXTS_1D[context].name.toLowerCase()}. Notice: when two vectors point in{' '}
        <strong className="text-[#1b2a41]">opposite directions</strong>, the tip-to-tail chain doubles back on itself —
        that's why opposite vectors <em>subtract</em>, not add, in size.
      </p>
    </div>
  );
}

// ================= MODE 2: 2D SANDBOX =================

interface SandboxVector {
  id: string;
  label: string;
  color: string;
  tail: Vec2;
  vx: number;
  vy: number;
}

type ComponentStyle = 'none' | 'each' | 'projected';

function defaultSandboxVectors(): SandboxVector[] {
  return [
    { id: 'v0', label: 'a', color: VECTOR_COLORS[0], tail: { x: -3, y: -1 }, vx: 4, vy: 3 },
    { id: 'v1', label: 'b', color: VECTOR_COLORS[1], tail: { x: -3, y: -1 }, vx: 2, vy: -3 },
  ];
}

function Mode2DSandbox() {
  const [vecs, setVecs] = useState<SandboxVector[]>(defaultSandboxVectors);
  const [nextId, setNextId] = useState(2);
  const [snap, setSnap] = useState(false);
  const [showSum, setShowSum] = useState(true);
  const [showAngles, setShowAngles] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [compStyle, setCompStyle] = useState<ComponentStyle>('none');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; part: 'tail' | 'tip' } | null>(null);

  const W = 760;
  const H = 560;
  const origin = { x: W / 2, y: H / 2 + 20 };
  const RANGE = 10;
  const pxPerUnit = Math.min((W / 2 - 30) / RANGE, (H / 2 - 40) / RANGE);
  const { toScreen, toWorld } = makeTransform(origin, pxPerUnit);

  const applySnap = (p: Vec2): Vec2 => (snap ? snapToGrid(p) : { x: round2(p.x), y: round2(p.y) });

  const worldFromClient = (clientX: number, clientY: number): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const local = clientToLocal(svg, clientX, clientY, W, H);
    return toWorld(local);
  };

  const onHandleDown = (id: string, part: 'tail' | 'tip') => (e: React.PointerEvent) => {
    dragRef.current = { id, part };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, part } = dragRef.current;
    const w = applySnap(worldFromClient(e.clientX, e.clientY));
    setVecs((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        if (part === 'tail') return { ...v, tail: w };
        return { ...v, vx: round2(w.x - v.tail.x), vy: round2(w.y - v.tail.y) };
      })
    );
  };
  const onUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.part !== 'tail') return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const outside = e.clientX < rect.left - 10 || e.clientX > rect.right + 10 || e.clientY < rect.top - 10 || e.clientY > rect.bottom + 10;
    if (outside) setVecs((prev) => prev.filter((v) => v.id !== drag.id));
  };

  const addVector = () => {
    if (vecs.length >= 6) return;
    const idx = vecs.length;
    const angle = 30 + idx * 47;
    const v = fromPolar(4, angle);
    setVecs([...vecs, { id: `v${nextId}`, label: LETTERS[idx], color: VECTOR_COLORS[idx], tail: { x: 0, y: 0 }, vx: round2(v.x), vy: round2(v.y) }]);
    setNextId(nextId + 1);
  };
  const removeVector = (id: string) => setVecs(vecs.filter((v) => v.id !== id));

  const updateVec = (id: string, patch: Partial<SandboxVector>) => setVecs(vecs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const setPolar = (id: string, r: number, theta: number) => {
    const p = fromPolar(r, theta);
    updateVec(id, { vx: round2(p.x), vy: round2(p.y) });
  };

  const resultantVec: Vec2 = sum(vecs.map((v) => ({ x: v.vx, y: v.vy })));
  const resultantPolar = toPolar(resultantVec);

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
          <span className={labelCls}>2D Sandbox — drag tails to move, tips to change</span>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip active={snap} onClick={() => setSnap(!snap)} label="Snap to grid" />
            <ToggleChip active={showGrid} onClick={() => setShowGrid(!showGrid)} label="Grid" />
            <ToggleChip active={showSum} onClick={() => setShowSum(!showSum)} label="Sum" />
            <ToggleChip active={showAngles} onClick={() => setShowAngles(!showAngles)} label="Angles" />
            <ToggleChip active={showValues} onClick={() => setShowValues(!showValues)} label="Values" />
          </div>
        </div>

        <div className="px-4 pt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-mono text-[#a8a196] mr-1">components:</span>
          {(['none', 'each', 'projected'] as ComponentStyle[]).map((s) => (
            <button key={s} onClick={() => setCompStyle(s)} className={pillBtn(compStyle === s)}>
              {s === 'none' ? 'None' : s === 'each' ? 'On each vector' : 'Projected on axes'}
            </button>
          ))}
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none"
            style={{ minWidth: 480, background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <GridAndAxes viewW={W} viewH={H} origin={origin} pxPerUnit={pxPerUnit} showGrid={showGrid} />

            {compStyle === 'projected' &&
              vecs.map((v) => {
                const tip = toScreen(add(v.tail, { x: v.vx, y: v.vy }));
                const axX = toScreen({ x: v.tail.x + v.vx, y: 0 });
                const axY = toScreen({ x: 0, y: v.tail.y + v.vy });
                return (
                  <g key={`proj${v.id}`} opacity={0.55}>
                    <line x1={tip.x} y1={tip.y} x2={axX.x} y2={origin.y} stroke={v.color} strokeWidth={1.5} strokeDasharray="4 4" />
                    <line x1={tip.x} y1={tip.y} x2={origin.x} y2={axY.y} stroke={v.color} strokeWidth={1.5} strokeDasharray="4 4" />
                    <circle cx={axX.x} cy={origin.y} r={3.5} fill={v.color} />
                    <circle cx={origin.x} cy={axY.y} r={3.5} fill={v.color} />
                  </g>
                );
              })}

            {compStyle === 'each' &&
              vecs.map((v) => {
                const tailPx = toScreen(v.tail);
                const cornerPx = toScreen({ x: v.tail.x + v.vx, y: v.tail.y });
                return (
                  <g key={`tri${v.id}`} opacity={0.55}>
                    <line x1={tailPx.x} y1={tailPx.y} x2={cornerPx.x} y2={cornerPx.y} stroke={v.color} strokeWidth={1.5} strokeDasharray="4 4" />
                    <line x1={cornerPx.x} y1={cornerPx.y} x2={toScreen(add(v.tail, { x: v.vx, y: v.vy })).x} y2={toScreen(add(v.tail, { x: v.vx, y: v.vy })).y} stroke={v.color} strokeWidth={1.5} strokeDasharray="4 4" />
                  </g>
                );
              })}

            {vecs.map((v) => {
              const tailPx = toScreen(v.tail);
              const tipPx = toScreen(add(v.tail, { x: v.vx, y: v.vy }));
              const theta = angleDeg({ x: v.vx, y: v.vy });
              return (
                <g key={v.id}>
                  {showAngles && <AngleArc center={tailPx} fromDeg={0} toDeg={theta} radius={Math.min(46, 22 + magnitude({ x: v.vx, y: v.vy }) * pxPerUnit * 0.18)} color={v.color} />}
                  <Arrow tail={tailPx} tip={tipPx} color={v.color} />
                  <text
                    x={tailPx.x + (tipPx.x - tailPx.x) * 0.5 - 14}
                    y={tailPx.y + (tipPx.y - tailPx.y) * 0.5 - 10}
                    fontSize={13.5}
                    fontFamily="Georgia, serif"
                    fontStyle="italic"
                    fontWeight={700}
                    fill={v.color}
                    style={{ paintOrder: 'stroke', stroke: PAPER, strokeWidth: 3 }}
                  >
                    {v.label}
                    {showValues ? ` (${fmtMag(magnitude({ x: v.vx, y: v.vy }))}, ${fmtAngle(theta)}°)` : ''}
                  </text>
                  <DragHandle p={tailPx} onDown={onHandleDown(v.id, 'tail')} fill={PAPER} stroke={v.color} r={7} />
                  <DragHandle p={tipPx} onDown={onHandleDown(v.id, 'tip')} fill={v.color} stroke={INK} />
                </g>
              );
            })}

            {showSum && (
              <g>
                {showAngles && <AngleArc center={toScreen({ x: 0, y: 0 })} fromDeg={0} toDeg={resultantPolar.theta} radius={54} color={RESULTANT_COLOR} />}
                <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(resultantVec)} color={RESULTANT_COLOR} width={5} />
                <text
                  x={toScreen(resultantVec).x + 10}
                  y={toScreen(resultantVec).y - 6}
                  fontSize={14.5}
                  fontFamily="Georgia, serif"
                  fontStyle="italic"
                  fontWeight={700}
                  fill={RESULTANT_COLOR}
                  style={{ paintOrder: 'stroke', stroke: PAPER, strokeWidth: 3 }}
                >
                  R
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="px-4 pb-4 flex flex-wrap items-center gap-2 border-t border-[#eee6d3] pt-3">
          <button onClick={addVector} disabled={vecs.length >= 6} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c] disabled:opacity-35">
            + Add vector
          </button>
          <span className="text-[11px] text-[#a8a196] italic">drag a tail off the canvas edge to delete it</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <StatChip label="Rx" value={fmtMag(resultantVec.x)} color={RESULTANT_COLOR} />
            <StatChip label="Ry" value={fmtMag(resultantVec.y)} color={RESULTANT_COLOR} />
            <StatChip label="|R|" value={fmtMag(resultantPolar.r)} color={RESULTANT_COLOR} />
            <StatChip label="θ" value={`${fmtAngle(resultantPolar.theta)}°`} color={RESULTANT_COLOR} />
          </div>
        </div>
      </div>

      <div className={cardCls + ' p-4'}>
        <span className={labelCls}>Vector values — edit either form, they stay in sync</span>
        <div className="mt-3 flex flex-col gap-2">
          {vecs.map((v) => {
            const polar = toPolar({ x: v.vx, y: v.vy });
            return (
              <div key={v.id} className="flex flex-wrap items-center gap-3 p-2 rounded border border-[#eee6d3]">
                <span className="italic font-bold text-[15px] w-5 text-center" style={{ color: v.color, fontFamily: 'Georgia, serif' }}>
                  {v.label}
                </span>
                <NumField label="|v|" value={polar.r} onChange={(val) => setPolar(v.id, val, polar.theta)} />
                <NumField label="θ°" value={polar.theta} onChange={(val) => setPolar(v.id, polar.r, val)} />
                <NumField label="vx" value={v.vx} onChange={(val) => updateVec(v.id, { vx: val })} />
                <NumField label="vy" value={v.vy} onChange={(val) => updateVec(v.id, { vy: val })} />
                <button onClick={() => removeVector(v.id)} className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#d8cfb6] text-[#b34a3c] hover:bg-[#faf2ef]">
                  ✕ delete
                </button>
              </div>
            );
          })}
          {vecs.length === 0 && <p className="text-[12px] text-[#a8a196] italic">No vectors — click "+ Add vector" to start.</p>}
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={pillBtn(active)}>
      {active ? '✓ ' : ''}
      {label}
    </button>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] font-mono text-[#4a5a72]">{label}=</span>
      <input
        type="number"
        value={round2(value)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-[70px] border border-gray-300 rounded px-1.5 py-0.5 text-[12px] font-mono"
        step="0.1"
      />
    </div>
  );
}
// ================= MODE 3: METHODS (manually stepped) =================

type Method = 'tiptotail' | 'parallelogram' | 'components';
const METHOD_INFO: { id: Method; label: string }[] = [
  { id: 'tiptotail', label: 'Tip-to-tail' },
  { id: 'parallelogram', label: 'Parallelogram' },
  { id: 'components', label: 'Components' },
];

interface MethodVec {
  label: string;
  color: string;
  r: number;
  theta: number;
}

function Mode3Methods() {
  const [method, setMethod] = useState<Method>('tiptotail');
  const [n, setN] = useState(2);
  const [vecs, setVecs] = useState<MethodVec[]>([
    { label: 'a', color: VECTOR_COLORS[0], r: 5, theta: 35 },
    { label: 'b', color: VECTOR_COLORS[1], r: 4, theta: 130 },
    { label: 'c', color: VECTOR_COLORS[2], r: 3, theta: 250 },
  ]);
  const [reversed, setReversed] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeVecs = vecs.slice(0, n);
  const orderedVecs = reversed ? [...activeVecs].reverse() : activeVecs;
  const cartesian = orderedVecs.map((v) => fromPolar(v.r, v.theta));

  const stepCount = method === 'parallelogram' ? 2 : method === 'components' ? 3 : n + 1;
  const isDone = stepIndex === stepCount - 1;

  useEffect(() => {
    setStepIndex(-1);
  }, [method, n, reversed]);

  const goNext = () => setStepIndex((i) => Math.min(stepCount - 1, i + 1));
  const goBack = () => setStepIndex((i) => Math.max(-1, i - 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, stepCount]);

  const W = 640;
  const H = 480;
  const origin = { x: W / 2, y: H / 2 + 10 };
  const RANGE = 9;
  const pxPerUnit = Math.min((W / 2 - 30) / RANGE, (H / 2 - 40) / RANGE);
  const { toScreen } = makeTransform(origin, pxPerUnit);

  const R = sum(cartesian);
  const Rpolar = toPolar(R);
  const chain = cumulativeChain(cartesian);

  let caption = 'Press Next to begin.';
  if (method === 'tiptotail') {
    if (stepIndex === -1) caption = 'Every vector starts drawn from the origin — same size and direction, just not yet combined.';
    else if (stepIndex < n) caption = `Slide ${orderedVecs[stepIndex].label}'s tail onto the tip of the chain so far — its size and direction don't change.`;
    else caption = `Draw R from the very first tail to the very last tip: R = ${orderedVecs.map((v) => v.label).join(' + ')}.`;
  } else if (method === 'parallelogram') {
    if (stepIndex === -1) caption = 'Both vectors start drawn from the same origin.';
    else if (stepIndex === 0) caption = "Copy b starting at a's tip, and a starting at b's tip (dashed) — this completes the parallelogram.";
    else caption = 'The diagonal from the origin to the far corner is the resultant: R = a + b.';
  } else {
    if (stepIndex === -1) caption = 'Every vector starts drawn from the origin.';
    else if (stepIndex === 0) caption = 'Split each vector into its x-component and y-component (dashed).';
    else if (stepIndex === 1) caption = 'Slide every x-component onto the x-axis, and every y-component onto the y-axis — their totals are Rx and Ry.';
    else caption = 'Rebuild R from the origin using Rx and Ry.';
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
          <span className={labelCls}>Methods — manually stepped, no auto-play</span>
          <div className="flex items-center gap-1.5">
            {METHOD_INFO.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)} className={pillBtn(method === m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-mono text-[#a8a196]">vectors:</span>
          <button onClick={() => setN(2)} disabled={method === 'parallelogram'} className={pillBtn(n === 2) + ' disabled:opacity-35'}>
            2
          </button>
          <button onClick={() => setN(3)} disabled={method === 'parallelogram'} className={pillBtn(n === 3) + ' disabled:opacity-35'}>
            3
          </button>
          {method === 'tiptotail' && (
            <button onClick={() => setReversed(!reversed)} className={pillBtn(reversed) + ' ml-2'}>
              {reversed ? `order: ${orderedVecs.map((v) => v.label).join('+')} (reversed)` : `order: ${orderedVecs.map((v) => v.label).join('+')}`}
            </button>
          )}
          {method === 'tiptotail' && <span className="text-[11px] text-[#a8a196] italic">— toggle to see the order doesn't change R</span>}
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ minWidth: 420, background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}>
            <GridAndAxes viewW={W} viewH={H} origin={origin} pxPerUnit={pxPerUnit} showGrid={true} />

            {method === 'tiptotail' && (
              <>
                {orderedVecs.map((v, i) => {
                  const placed = stepIndex >= i;
                  const tail = placed ? chain[i] : { x: 0, y: 0 };
                  const tip = placed ? chain[i + 1] : cartesian[i];
                  return <Arrow key={i} tail={toScreen(tail)} tip={toScreen(tip)} color={v.color} opacity={stepIndex === -1 || placed ? 1 : 0.35} />;
                })}
                {stepIndex >= n && <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(R)} color={RESULTANT_COLOR} width={5} />}
              </>
            )}

            {method === 'parallelogram' && n === 2 && (
              <>
                <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(cartesian[0])} color={orderedVecs[0].color} />
                <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(cartesian[1])} color={orderedVecs[1].color} />
                {stepIndex >= 0 && (
                  <>
                    <Arrow tail={toScreen(cartesian[0])} tip={toScreen(R)} color={orderedVecs[1].color} dashed opacity={0.6} />
                    <Arrow tail={toScreen(cartesian[1])} tip={toScreen(R)} color={orderedVecs[0].color} dashed opacity={0.6} />
                  </>
                )}
                {stepIndex >= 1 && <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(R)} color={RESULTANT_COLOR} width={5} />}
              </>
            )}

            {method === 'components' && (
              <>
                {orderedVecs.map((v, i) => (
                  <Arrow key={i} tail={toScreen({ x: 0, y: 0 })} tip={toScreen(cartesian[i])} color={v.color} opacity={stepIndex >= 1 ? 0.3 : 1} />
                ))}
                {stepIndex >= 0 &&
                  stepIndex < 2 &&
                  orderedVecs.map((v, i) => {
                    const corner = { x: cartesian[i].x, y: 0 };
                    return (
                      <g key={`dec${i}`} opacity={0.75}>
                        <line {...screenLine(toScreen({ x: 0, y: 0 }), toScreen(corner))} stroke={v.color} strokeWidth={2} strokeDasharray="5 4" />
                        <line {...screenLine(toScreen(corner), toScreen(cartesian[i]))} stroke={v.color} strokeWidth={2} strokeDasharray="5 4" />
                      </g>
                    );
                  })}
                {stepIndex >= 1 && (
                  <>
                    {(() => {
                      let rx = 0;
                      return orderedVecs.map((v, i) => {
                        const start = rx;
                        rx += cartesian[i].x;
                        return <Arrow key={`sx${i}`} tail={toScreen({ x: start, y: 0 })} tip={toScreen({ x: rx, y: 0 })} color={v.color} width={4.5} />;
                      });
                    })()}
                    {(() => {
                      let ry = 0;
                      return orderedVecs.map((v, i) => {
                        const start = ry;
                        ry += cartesian[i].y;
                        return <Arrow key={`sy${i}`} tail={toScreen({ x: 0, y: start })} tip={toScreen({ x: 0, y: ry })} color={v.color} width={4.5} />;
                      });
                    })()}
                  </>
                )}
                {stepIndex >= 2 && (
                  <>
                    <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen({ x: R.x, y: 0 })} color={MUTE} dashed opacity={0.5} />
                    <Arrow tail={toScreen({ x: R.x, y: 0 })} tip={toScreen(R)} color={MUTE} dashed opacity={0.5} />
                    <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(R)} color={RESULTANT_COLOR} width={5} />
                  </>
                )}
              </>
            )}
          </svg>
        </div>

        <div className="px-4 pb-4 text-center">
          <span className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full ${isDone ? 'bg-[#e6f2ee] text-[#1b5c4d]' : 'bg-[#f6efdc] text-[#8f6428]'}`}>{caption}</span>
        </div>

        <div className="px-4 pb-5 flex flex-col items-center gap-2.5 border-t border-[#eee6d3] pt-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={stepIndex <= -1} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0] disabled:opacity-35">
              ◀ Back
            </button>
            <span className="text-[11.5px] font-mono text-[#a8a196] min-w-[90px] text-center">{stepIndex === -1 ? 'Ready' : `Step ${stepIndex + 1} of ${stepCount}`}</span>
            <button onClick={goNext} disabled={isDone} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c] disabled:opacity-35">
              Next ▶
            </button>
          </div>
          {isDone && method === 'components' && (
            <div className="text-[12.5px] font-mono text-[#4a5a72] bg-[#faf7f0] border border-[#eee6d3] rounded px-3 py-2 max-w-md text-center leading-relaxed">
              |R| = √(Rx² + Ry²) = √({fmtMag(R.x)}² + {fmtMag(R.y)}²) = <strong className="text-[#1b2a41]">{fmtMag(Rpolar.r)}</strong>
              <br />θ = tan⁻¹(Ry / Rx) = tan⁻¹({fmtMag(R.y)} / {fmtMag(R.x)}) = <strong className="text-[#1b2a41]">{fmtAngle(Rpolar.theta)}°</strong>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <StatChip label="Rx" value={fmtMag(R.x)} color={RESULTANT_COLOR} />
            <StatChip label="Ry" value={fmtMag(R.y)} color={RESULTANT_COLOR} />
            <StatChip label="|R|" value={fmtMag(Rpolar.r)} color={RESULTANT_COLOR} />
            <StatChip label="θ" value={`${fmtAngle(Rpolar.theta)}°`} color={RESULTANT_COLOR} />
          </div>
        </div>
      </div>

      <div className={cardCls + ' p-4'}>
        <span className={labelCls}>Edit the vectors used in this method</span>
        <div className="mt-3 flex flex-wrap gap-3">
          {vecs.slice(0, n).map((v, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border border-[#eee6d3]">
              <span className="italic font-bold text-[14px] w-4 text-center" style={{ color: v.color, fontFamily: 'Georgia, serif' }}>
                {v.label}
              </span>
              <NumField label="|v|" value={v.r} onChange={(val) => setVecs(vecs.map((vv, ii) => (ii === i ? { ...vv, r: Math.max(0.1, val) } : vv)))} />
              <NumField label="θ°" value={v.theta} onChange={(val) => setVecs(vecs.map((vv, ii) => (ii === i ? { ...vv, theta: val } : vv)))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function screenLine(a: Vec2, b: Vec2) {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
// ================= MODE 4: EQUATIONS (subtraction & scaling) =================

function Mode4Equations() {
  const [a, setA] = useState<MethodVec>({ label: 'a', color: VECTOR_COLORS[0], r: 4, theta: 30 });
  const [b, setB] = useState<MethodVec>({ label: 'b', color: VECTOR_COLORS[1], r: 3, theta: 110 });
  const [s1, setS1] = useState(1);
  const [s2, setS2] = useState(1);

  const W = 620;
  const H = 460;
  const origin = { x: W / 2, y: H / 2 };
  const RANGE = 11;
  const pxPerUnit = Math.min((W / 2 - 30) / RANGE, (H / 2 - 30) / RANGE);
  const { toScreen } = makeTransform(origin, pxPerUnit);

  const av = fromPolar(a.r, a.theta);
  const bv = fromPolar(b.r, b.theta);
  const sa = scaleVec(av, s1);
  const sb = scaleVec(bv, s2);
  const c = add(sa, sb);
  const cPolar = toPolar(c);

  // ---- a - b stepped demo ----
  const [subStep, setSubStep] = useState(-1);
  const subStepCount = 3;
  const subDone = subStep === subStepCount - 1;
  const flip = subStep >= 1; // b has flipped to -b
  const built = subStep >= 2; // a + (-b) chain drawn
  const negB = negate(bv);
  const diff = subtract(av, bv);

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="px-4 pt-3">
          <span className={labelCls}>Equations — c = s₁·a + s₂·b</span>
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ minWidth: 400, background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}>
            <GridAndAxes viewW={W} viewH={H} origin={origin} pxPerUnit={pxPerUnit} showGrid={true} />
            <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(av)} color={a.color} width={2.5} dashed opacity={0.5} />
            <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(bv)} color={b.color} width={2.5} dashed opacity={0.5} />
            <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(sa)} color={a.color} width={4} />
            <Arrow tail={toScreen(sa)} tip={toScreen(c)} color={b.color} width={4} />
            <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(c)} color={RESULTANT_COLOR} width={5} />
            <text x={toScreen(c).x + 10} y={toScreen(c).y - 6} fontSize={14} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fill={RESULTANT_COLOR} style={{ paintOrder: 'stroke', stroke: PAPER, strokeWidth: 3 }}>
              c
            </text>
          </svg>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#eee6d3] pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <NumField label="|a|" value={a.r} onChange={(v) => setA({ ...a, r: Math.max(0.1, v) })} />
            <NumField label="θa°" value={a.theta} onChange={(v) => setA({ ...a, theta: v })} />
            <NumField label="|b|" value={b.r} onChange={(v) => setB({ ...b, r: Math.max(0.1, v) })} />
            <NumField label="θb°" value={b.theta} onChange={(v) => setB({ ...b, theta: v })} />
          </div>
          <SliderRow label="s₁" value={s1} onChange={setS1} color={a.color} />
          <SliderRow label="s₂" value={s2} onChange={setS2} color={b.color} />
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            <StatChip label="cx" value={fmtMag(c.x)} color={RESULTANT_COLOR} />
            <StatChip label="cy" value={fmtMag(c.y)} color={RESULTANT_COLOR} />
            <StatChip label="|c|" value={fmtMag(cPolar.r)} color={RESULTANT_COLOR} />
            <StatChip label="θ" value={`${fmtAngle(cPolar.theta)}°`} color={RESULTANT_COLOR} />
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <div className="px-4 pt-3">
          <span className={labelCls}>Subtraction as addition — a − b = a + (−b)</span>
        </div>
        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H * 0.75}`} className="w-full select-none" style={{ minWidth: 400, background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}>
            <GridAndAxes viewW={W} viewH={H * 0.75} origin={{ x: origin.x, y: (H * 0.75) / 2 }} pxPerUnit={pxPerUnit} showGrid={true} />
            {(() => {
              const org = { x: origin.x, y: (H * 0.75) / 2 };
              const { toScreen: ts2 } = makeTransform(org, pxPerUnit);
              const bShown = flip ? negB : bv;
              return (
                <>
                  <Arrow tail={ts2({ x: 0, y: 0 })} tip={ts2(av)} color={a.color} width={4} opacity={built ? 0.4 : 1} />
                  <Arrow tail={ts2({ x: 0, y: 0 })} tip={ts2(bShown)} color={b.color} width={4} opacity={built ? 0 : 1} />
                  {built && <Arrow tail={ts2(av)} tip={ts2(diff)} color={b.color} width={4} />}
                  {built && <Arrow tail={ts2({ x: 0, y: 0 })} tip={ts2(diff)} color={RESULTANT_COLOR} width={5} />}
                </>
              );
            })()}
          </svg>
        </div>
        <div className="px-4 pb-4 text-center">
          <span className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full ${subDone ? 'bg-[#e6f2ee] text-[#1b5c4d]' : 'bg-[#f6efdc] text-[#8f6428]'}`}>
            {subStep === -1 && 'a and b, both drawn from the origin.'}
            {subStep === 0 && 'a and b, both drawn from the origin.'}
            {subStep === 1 && '−b is b reversed: same length, opposite direction.'}
            {subStep === 2 && `Add a + (−b) tip-to-tail: the result is a − b = (${fmtMag(diff.x)}, ${fmtMag(diff.y)}).`}
          </span>
        </div>
        <div className="px-4 pb-5 flex items-center justify-center gap-3 border-t border-[#eee6d3] pt-4">
          <button onClick={() => setSubStep((s) => Math.max(-1, s - 1))} disabled={subStep <= -1} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0] disabled:opacity-35">
            ◀ Back
          </button>
          <span className="text-[11.5px] font-mono text-[#a8a196] min-w-[90px] text-center">{subStep === -1 ? 'Ready' : `Step ${subStep + 1} of ${subStepCount}`}</span>
          <button
            onClick={() => setSubStep((s) => Math.min(subStepCount - 1, s + 1))}
            disabled={subDone}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c] disabled:opacity-35"
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-mono w-6" style={{ color }}>
        {label}
      </span>
      <input
        type="range"
        min={-3}
        max={3}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
        style={{ accentColor: color }}
      />
      <span className="text-[12px] font-mono w-10 text-right text-[#1b2a41]">{value.toFixed(1)}</span>
    </div>
  );
}
// ================= MODE 5: SCALE DRAWING (IGCSE exam skill) =================

// Standard web convention: 1cm = 37.8px at 96dpi / 100% browser zoom. This
// canvas uses a FIXED pixel size (not responsive viewBox scaling, unlike
// every other mode) specifically so that convention holds — a scaled
// viewBox would silently break the ruler's real-world tick spacing.
const CM_PX = 37.8;

interface ScaleScenario {
  name: string;
  unit: string;
  scaleCmPerUnit: number; // e.g. 0.5 means "1 cm : 2 N"
  start: Vec2; // px, where vector A's tail sits
  vecA: { mag: number; theta: number };
  vecB: { mag: number; theta: number };
}

const SCALE_SCENARIOS: ScaleScenario[] = [
  {
    name: 'Two forces at a right angle',
    unit: 'N',
    scaleCmPerUnit: 0.5, // 1 cm : 2 N
    start: { x: 110, y: 400 },
    vecA: { mag: 6, theta: 0 },
    vecB: { mag: 8, theta: 90 },
  },
  {
    name: 'Two forces at a non-right angle',
    unit: 'N',
    scaleCmPerUnit: 1, // 1 cm : 1 N
    start: { x: 110, y: 400 },
    vecA: { mag: 5, theta: 20 },
    vecB: { mag: 7, theta: 100 },
  },
];

interface ToolState {
  pos: Vec2; // ruler: its start (grab) end. protractor: its centre.
  angle: number;
}

function Mode5ScaleDrawing() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario = SCALE_SCENARIOS[scenarioIdx];
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [ruler, setRuler] = useState<ToolState>({ pos: { x: 480, y: 90 }, angle: 0 });
  const [protractor, setProtractor] = useState<ToolState>({ pos: { x: 760, y: 130 }, angle: 0 });
  const dragRef = useRef<{ tool: 'ruler' | 'protractor'; part: 'move' | 'rotate' } | null>(null);

  const [magAnswer, setMagAnswer] = useState('');
  const [angleAnswer, setAngleAnswer] = useState('');
  const [checked, setChecked] = useState<null | { magOk: boolean; angleOk: boolean }>(null);

  const resetTools = () => {
    setRuler({ pos: { x: 480, y: 90 }, angle: 0 });
    setProtractor({ pos: { x: 760, y: 130 }, angle: 0 });
  };
  const switchScenario = (i: number) => {
    setScenarioIdx(i);
    setMagAnswer('');
    setAngleAnswer('');
    setChecked(null);
    resetTools();
  };

  const W = 980;
  const H = 460;

  const cmToPx = (cm: number) => cm * CM_PX;
  const scaleCmLen = (realMag: number) => realMag * scenario.scaleCmPerUnit;

  const aScreenVec = fromPolar(cmToPx(scaleCmLen(scenario.vecA.mag)), scenario.vecA.theta);
  const aTip = add(scenario.start, { x: aScreenVec.x, y: -aScreenVec.y });
  const bScreenVec = fromPolar(cmToPx(scaleCmLen(scenario.vecB.mag)), scenario.vecB.theta);
  const bTip = add(aTip, { x: bScreenVec.x, y: -bScreenVec.y });

  // True resultant, computed with the same lib the rest of the sim uses.
  const trueR = add(fromPolar(scenario.vecA.mag, scenario.vecA.theta), fromPolar(scenario.vecB.mag, scenario.vecB.theta));
  const trueRPolar = toPolar(trueR);

  const worldFromClient = (clientX: number, clientY: number): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H };
  };

  const onToolDown = (tool: 'ruler' | 'protractor', part: 'move' | 'rotate') => (e: React.PointerEvent) => {
    dragRef.current = { tool, part };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const w = worldFromClient(e.clientX, e.clientY);
    const setFn = drag.tool === 'ruler' ? setRuler : setProtractor;
    setFn((prev) => {
      if (drag.part === 'move') return { ...prev, pos: w };
      const ang = angleDeg({ x: w.x - prev.pos.x, y: -(w.y - prev.pos.y) });
      return { ...prev, angle: ang };
    });
  };
  const onUp = () => {
    dragRef.current = null;
  };

  const checkAnswer = () => {
    const mag = parseFloat(magAnswer);
    const ang = parseFloat(angleAnswer);
    if (isNaN(mag) || isNaN(ang)) return;
    const magOk = Math.abs(mag - trueRPolar.r) / trueRPolar.r <= 0.02;
    const angleOk = Math.abs(angleDiff(ang, trueRPolar.theta)) <= 2;
    setChecked({ magOk, angleOk });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
          <span className={labelCls}>Scale Drawing — the exam skill itself</span>
          <div className="flex items-center gap-1.5">
            {SCALE_SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => switchScenario(i)} className={pillBtn(scenarioIdx === i)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pt-2">
          <p className="text-[12px] text-[#4a5a72]">
            A and B are drawn tip-to-tail to scale (<strong>1 cm : {(1 / scenario.scaleCmPerUnit).toFixed(scenario.scaleCmPerUnit < 1 ? 0 : 1)} {scenario.unit}</strong>
            {scenario.scaleCmPerUnit !== 1 && scenario.scaleCmPerUnit < 1 ? '' : ''}
            ). Use the ruler to measure the straight-line distance from the start dot to the end dot, and the protractor to measure its angle from the dashed reference line — then convert the ruler length back to {scenario.unit} using the scale, and enter both below.
          </p>
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            className="touch-none select-none"
            style={{ background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* 0-degree reference line */}
            <line x1={scenario.start.x} y1={scenario.start.y} x2={scenario.start.x + 260} y2={scenario.start.y} stroke={MUTE} strokeWidth={1.25} strokeDasharray="5 5" opacity={0.6} />

            <Arrow tail={scenario.start} tip={aTip} color={VECTOR_COLORS[0]} width={4} />
            <text x={(scenario.start.x + aTip.x) / 2} y={(scenario.start.y + aTip.y) / 2 - 10} fontSize={13} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fill={VECTOR_COLORS[0]}>
              A
            </text>
            <Arrow tail={aTip} tip={bTip} color={VECTOR_COLORS[1]} width={4} />
            <text x={(aTip.x + bTip.x) / 2 + 8} y={(aTip.y + bTip.y) / 2} fontSize={13} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fill={VECTOR_COLORS[1]}>
              B
            </text>

            <circle cx={scenario.start.x} cy={scenario.start.y} r={5} fill={INK} />
            <text x={scenario.start.x - 8} y={scenario.start.y + 20} fontSize={10.5} fontFamily="monospace" fill={INK} textAnchor="end">
              start
            </text>
            <circle cx={bTip.x} cy={bTip.y} r={5} fill={INK} />
            <text x={bTip.x + 8} y={bTip.y - 8} fontSize={10.5} fontFamily="monospace" fill={INK}>
              end
            </text>

            <RulerTool state={ruler} onMoveDown={onToolDown('ruler', 'move')} onRotateDown={onToolDown('ruler', 'rotate')} />
            <ProtractorTool state={protractor} onMoveDown={onToolDown('protractor', 'move')} onRotateDown={onToolDown('protractor', 'rotate')} />
          </svg>
        </div>

        <div className="px-4 pb-4 flex flex-wrap items-center gap-3 border-t border-[#eee6d3] pt-3">
          <button onClick={resetTools} className="text-[11.5px] font-semibold px-3 py-1 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0]">
            ↺ reset tools
          </button>
          <span className="text-[11px] text-[#a8a196] italic">drag the ruler/protractor body to move, the small ring to rotate</span>
        </div>
      </div>

      <div className={cardCls + ' p-4'}>
        <span className={labelCls}>Your answer for the resultant R</span>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#4a5a72]">|R| ({scenario.unit})</span>
            <input type="number" value={magAnswer} onChange={(e) => setMagAnswer(e.target.value)} className="w-28 border border-gray-300 rounded px-2 py-1 text-[13px] font-mono" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#4a5a72]">θ (° from +x)</span>
            <input type="number" value={angleAnswer} onChange={(e) => setAngleAnswer(e.target.value)} className="w-28 border border-gray-300 rounded px-2 py-1 text-[13px] font-mono" />
          </label>
          <button onClick={checkAnswer} className="text-[12.5px] font-semibold px-4 py-2 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c]">
            Check answer
          </button>
        </div>
        {checked && (
          <div className={`mt-3 p-3 rounded border text-[12.5px] leading-relaxed ${checked.magOk && checked.angleOk ? 'bg-[#e6f2ee] border-[#bfe0d5] text-[#1b5c4d]' : 'bg-[#f6efdc] border-[#e6d9b8] text-[#8f6428]'}`}>
            <div>
              Magnitude: {checked.magOk ? '✓ within 2%' : '✗ off — check your ruler reading and scale conversion'} (you said {magAnswer} {scenario.unit})
            </div>
            <div>
              Angle: {checked.angleOk ? '✓ within 2°' : '✗ off — check the protractor baseline against the reference line'} (you said {angleAnswer}°)
            </div>
            <div className="mt-2 pt-2 border-t border-current/20 font-mono">
              Calculated answer: Rx = {fmtMag(trueR.x)}, Ry = {fmtMag(trueR.y)} → |R| = {fmtMag(trueRPolar.r)} {scenario.unit}, θ = {fmtAngle(trueRPolar.theta)}°
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RulerTool({ state, onMoveDown, onRotateDown }: { state: ToolState; onMoveDown: (e: React.PointerEvent) => void; onRotateDown: (e: React.PointerEvent) => void }) {
  const lengthCm = 16;
  const dir = fromPolar(1, state.angle);
  const end = { x: state.pos.x + dir.x * lengthCm * CM_PX, y: state.pos.y - dir.y * lengthCm * CM_PX };
  const perp = { x: -dir.y, y: -dir.x }; // screen-space perpendicular
  const halfW = 15;
  const corner = (t: number, side: number) => ({
    x: state.pos.x + dir.x * t * CM_PX + perp.x * side * halfW,
    y: state.pos.y - dir.y * t * CM_PX + perp.y * side * halfW,
  });
  const body = `${corner(0, -1).x},${corner(0, -1).y} ${corner(lengthCm, -1).x},${corner(lengthCm, -1).y} ${corner(lengthCm, 1).x},${corner(lengthCm, 1).y} ${corner(0, 1).x},${corner(0, 1).y}`;
  const ticks = Array.from({ length: lengthCm + 1 }, (_, i) => i);
  return (
    <g style={{ cursor: 'grab' }}>
      <polygon points={body} fill="rgba(184,130,61,0.16)" stroke={BRASS} strokeWidth={1.5} onPointerDown={onMoveDown} style={{ touchAction: 'none' }} />
      {ticks.map((i) => {
        const big = i % 5 === 0;
        const p0 = corner(i, -1);
        const p1 = corner(i, big ? 0.3 : 0.7);
        return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={INK} strokeWidth={big ? 1.5 : 1} pointerEvents="none" />;
      })}
      {ticks
        .filter((i) => i % 5 === 0)
        .map((i) => {
          const p = corner(i, -1.7);
          return (
            <text key={i} x={p.x} y={p.y} fontSize={9.5} fontFamily="monospace" fill={INK} textAnchor="middle" pointerEvents="none">
              {i}
            </text>
          );
        })}
      <circle cx={end.x} cy={end.y} r={8} fill="#fff" stroke={BRASS} strokeWidth={2} onPointerDown={onRotateDown} style={{ cursor: 'grab', touchAction: 'none' }} />
    </g>
  );
}

function ProtractorTool({ state, onMoveDown, onRotateDown }: { state: ToolState; onMoveDown: (e: React.PointerEvent) => void; onRotateDown: (e: React.PointerEvent) => void }) {
  const radius = 90;
  const toXY = (deg: number, r: number) => {
    const a = state.angle + deg;
    return { x: state.pos.x + r * Math.cos((-a * Math.PI) / 180), y: state.pos.y + r * Math.sin((-a * Math.PI) / 180) };
  };
  const rimStart = toXY(0, radius);
  const baselineEnd = toXY(0, radius);
  return (
    <g>
      <path
        d={`M ${toXY(0, radius).x} ${toXY(0, radius).y} A ${radius} ${radius} 0 1 0 ${toXY(180, radius).x} ${toXY(180, radius).y} L ${state.pos.x} ${state.pos.y} Z`}
        fill="rgba(61,107,158,0.14)"
        stroke={'#3d6b9e'}
        strokeWidth={1.5}
        onPointerDown={onMoveDown}
        style={{ cursor: 'grab', touchAction: 'none' }}
      />
      {Array.from({ length: 19 }, (_, i) => i * 10).map((deg) => {
        const big = deg % 30 === 0;
        const p0 = toXY(deg, radius);
        const p1 = toXY(deg, radius - (big ? 12 : 7));
        return <line key={deg} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={INK} strokeWidth={big ? 1.5 : 1} pointerEvents="none" />;
      })}
      {Array.from({ length: 7 }, (_, i) => i * 30).map((deg) => {
        const p = toXY(deg, radius - 24);
        return (
          <text key={deg} x={p.x} y={p.y} fontSize={9.5} fontFamily="monospace" fill={INK} textAnchor="middle" pointerEvents="none">
            {deg}
          </text>
        );
      })}
      <line x1={state.pos.x} y1={state.pos.y} x2={baselineEnd.x} y2={baselineEnd.y} stroke={'#3d6b9e'} strokeWidth={2} pointerEvents="none" />
      <circle cx={state.pos.x} cy={state.pos.y} r={5} fill={'#3d6b9e'} pointerEvents="none" />
      <circle cx={rimStart.x} cy={rimStart.y} r={8} fill="#fff" stroke={'#3d6b9e'} strokeWidth={2} onPointerDown={onRotateDown} style={{ cursor: 'grab', touchAction: 'none' }} />
    </g>
  );
}
// ================= MODE 6: CHALLENGES =================

interface ChallengeVec {
  label: string;
  color: string;
  mag: number;
  theta: number;
}
interface Challenge {
  kind: 'resultant' | 'missing' | 'equilibrium' | 'context';
  contextLabel?: string;
  unit: string;
  prompt: string;
  given: ChallengeVec[];
  answer: { mag: number; theta: number };
  targetLabel: string;
  explanation: string;
}

function toMagTheta(v: Vec2): { mag: number; theta: number } {
  const p = toPolar(v);
  return { mag: p.r, theta: p.theta };
}
function randNice(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}
function randAngleNice(): number {
  return Math.round(Math.random() * 71) * 5;
}
function listVecs(vs: ChallengeVec[], unit: string): string {
  return vs.map((v) => `${v.label} = ${v.mag} ${unit} at ${v.theta}°`).join(', ');
}
function breakdown(vs: ChallengeVec[]): string {
  return vs.map((v) => `${v.label}: (${fmtMag(fromPolar(v.mag, v.theta).x)}, ${fmtMag(fromPolar(v.mag, v.theta).y)})`).join('   ');
}
function finishExplain(resultVec: Vec2, targetLabel: string): string {
  const { r, theta } = toPolar(resultVec);
  return `Σx = ${fmtMag(resultVec.x)}, Σy = ${fmtMag(resultVec.y)}\n|${targetLabel}| = √(Σx² + Σy²) = ${fmtMag(r)}\nθ = atan2(Σy, Σx) = ${fmtAngle(theta)}° (quadrant-correct)`;
}

function genResultant(): Challenge {
  const n = Math.random() < 0.5 ? 2 : 3;
  const given = Array.from({ length: n }, (_, i) => ({ label: `F${i + 1}`, color: VECTOR_COLORS[i], mag: randNice(3, 9), theta: randAngleNice() }));
  const R = sum(given.map((g) => fromPolar(g.mag, g.theta)));
  const polar = toMagTheta(R);
  return {
    kind: 'resultant',
    unit: 'N',
    prompt: `Forces ${listVecs(given, 'N')} act on an object. Find the resultant's magnitude and direction.`,
    given,
    answer: polar,
    targetLabel: 'R',
    explanation: `${breakdown(given)}\n${finishExplain(R, 'R')}`,
  };
}

function genMissing(): Challenge {
  const known = [
    { label: 'F1', color: VECTOR_COLORS[0], mag: randNice(3, 8), theta: randAngleNice() },
    { label: 'F2', color: VECTOR_COLORS[1], mag: randNice(3, 8), theta: randAngleNice() },
  ];
  const target = { mag: randNice(4, 10), theta: randAngleNice() };
  const targetCart = fromPolar(target.mag, target.theta);
  const knownSum = sum(known.map((k) => fromPolar(k.mag, k.theta)));
  const missingCart = subtract(targetCart, knownSum);
  const missingPolar = toMagTheta(missingCart);
  return {
    kind: 'missing',
    unit: 'N',
    prompt: `Forces ${listVecs(known, 'N')} act on an object together with a third, unknown force F3. The resultant of all three is R = ${target.mag} N at ${target.theta}°. Find F3.`,
    given: known,
    answer: missingPolar,
    targetLabel: 'F3',
    explanation: `${breakdown(known)}\nR: (${fmtMag(targetCart.x)}, ${fmtMag(targetCart.y)})\nF3 = R − F1 − F2 = (${fmtMag(missingCart.x)}, ${fmtMag(missingCart.y)})\n${finishExplain(missingCart, 'F3')}`,
  };
}

function genEquilibrium(): Challenge {
  const n = Math.random() < 0.5 ? 1 : 2;
  const given = Array.from({ length: n }, (_, i) => ({ label: `F${i + 1}`, color: VECTOR_COLORS[i], mag: randNice(3, 9), theta: randAngleNice() }));
  const s = sum(given.map((g) => fromPolar(g.mag, g.theta)));
  const eq = negate(s);
  const polar = toMagTheta(eq);
  return {
    kind: 'equilibrium',
    unit: 'N',
    prompt: `An object is in equilibrium under forces ${listVecs(given, 'N')} plus one more force, Feq. Find Feq so that the resultant of every force is zero.`,
    given,
    answer: polar,
    targetLabel: 'Feq',
    explanation: `${breakdown(given)}\nΣ(given) = (${fmtMag(s.x)}, ${fmtMag(s.y)})\nFeq = −Σ(given) = (${fmtMag(eq.x)}, ${fmtMag(eq.y)})\n${finishExplain(eq, 'Feq')}`,
  };
}

function genContext(): Challenge {
  const flavor = ['boat', 'plane', 'tug'][Math.floor(Math.random() * 3)];
  if (flavor === 'boat') {
    const boatSpeed = randNice(3, 6);
    const currentSpeed = randNice(1, 4);
    const given = [
      { label: 'boat (relative to water)', color: VECTOR_COLORS[0], mag: boatSpeed, theta: 90 },
      { label: 'current', color: VECTOR_COLORS[1], mag: currentSpeed, theta: 0 },
    ];
    const R = sum(given.map((g) => fromPolar(g.mag, g.theta)));
    return {
      kind: 'context',
      contextLabel: 'Boat crossing a river',
      unit: 'm/s',
      prompt: `A boat is steered straight across a river at ${boatSpeed} m/s (90° to the bank), while the current flows at ${currentSpeed} m/s along the bank (0°). Find the boat's actual resultant velocity over the ground.`,
      given,
      answer: toMagTheta(R),
      targetLabel: 'v(actual)',
      explanation: `${breakdown(given)}\n${finishExplain(R, 'v')}`,
    };
  }
  if (flavor === 'plane') {
    const airspeed = randNice(60, 120);
    const windSpeed = randNice(10, 30);
    const windTheta = randAngleNice();
    const given = [
      { label: 'plane (airspeed)', color: VECTOR_COLORS[0], mag: airspeed, theta: 90 },
      { label: 'wind', color: VECTOR_COLORS[1], mag: windSpeed, theta: windTheta },
    ];
    const R = sum(given.map((g) => fromPolar(g.mag, g.theta)));
    return {
      kind: 'context',
      contextLabel: 'Plane in a crosswind',
      unit: 'km/h',
      prompt: `A plane flies with an airspeed of ${airspeed} km/h heading due north (90°), into a wind of ${windSpeed} km/h blowing at ${windTheta}°. Find the plane's actual resultant ground velocity.`,
      given,
      answer: toMagTheta(R),
      targetLabel: 'v(ground)',
      explanation: `${breakdown(given)}\n${finishExplain(R, 'v')}`,
    };
  }
  const t1 = randNice(4, 9);
  const t2 = randNice(4, 9);
  const a1 = randAngleNice() % 40;
  const a2 = -(randAngleNice() % 40);
  const given = [
    { label: 'tug 1', color: VECTOR_COLORS[0], mag: t1, theta: a1 },
    { label: 'tug 2', color: VECTOR_COLORS[1], mag: t2, theta: a2 },
  ];
  const R = sum(given.map((g) => fromPolar(g.mag, g.theta)));
  return {
    kind: 'context',
    contextLabel: 'Two tugboats pulling a ship',
    unit: 'kN',
    prompt: `Two tugboats pull a ship: tug 1 pulls with ${t1} kN at ${a1}° and tug 2 pulls with ${t2} kN at ${a2}°. Find the resultant pulling force on the ship.`,
    given,
    answer: toMagTheta(R),
    targetLabel: 'R',
    explanation: `${breakdown(given)}\n${finishExplain(R, 'R')}`,
  };
}

function generateChallenge(): Challenge {
  const pick = Math.random();
  if (pick < 0.3) return genResultant();
  if (pick < 0.55) return genMissing();
  if (pick < 0.75) return genEquilibrium();
  return genContext();
}

function Mode6Challenges() {
  const [challenge, setChallenge] = useState<Challenge>(generateChallenge);
  const [magAnswer, setMagAnswer] = useState('');
  const [angleAnswer, setAngleAnswer] = useState('');
  const [checked, setChecked] = useState<null | { magOk: boolean; angleOk: boolean }>(null);
  const [score, setScore] = useState({ attempted: 0, correct: 0, streak: 0, best: 0 });

  const nextChallenge = () => {
    setChallenge(generateChallenge());
    setMagAnswer('');
    setAngleAnswer('');
    setChecked(null);
  };

  const checkAnswer = () => {
    const mag = parseFloat(magAnswer);
    const ang = parseFloat(angleAnswer);
    if (isNaN(mag) || isNaN(ang)) return;
    const magOk = Math.abs(mag - challenge.answer.mag) / Math.max(0.01, challenge.answer.mag) <= 0.02;
    const angleOk = Math.abs(angleDiff(ang, challenge.answer.theta)) <= 2;
    setChecked({ magOk, angleOk });
    const pass = magOk && angleOk;
    setScore((s) => ({
      attempted: s.attempted + 1,
      correct: s.correct + (pass ? 1 : 0),
      streak: pass ? s.streak + 1 : 0,
      best: pass ? Math.max(s.best, s.streak + 1) : s.best,
    }));
  };

  const W = 560;
  const H = 380;
  const origin = { x: W / 2, y: H / 2 + 10 };
  const RANGE = 10;
  const pxPerUnit = Math.min((W / 2 - 30) / RANGE, (H / 2 - 30) / RANGE);
  const { toScreen } = makeTransform(origin, pxPerUnit);
  const maxMag = Math.max(...challenge.given.map((g) => g.mag), 1);
  const drawScale = RANGE * 0.75 / maxMag;

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
          <span className={labelCls}>Challenges{challenge.contextLabel ? ` — ${challenge.contextLabel}` : ''}</span>
          <div className="flex gap-2">
            <StatChip label="score" value={`${score.correct}/${score.attempted}`} />
            <StatChip label="streak" value={`${score.streak}`} color={score.streak > 0 ? TEAL : undefined} />
            <StatChip label="best" value={`${score.best}`} />
          </div>
        </div>

        <div className="px-4 pt-3">
          <p className="text-[13px] text-[#1b2a41] leading-relaxed">{challenge.prompt}</p>
        </div>

        <div className="px-2 sm:px-4 py-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ minWidth: 360, background: PAPER, borderRadius: 6, border: '1px solid #e4ddcc', display: 'block' }}>
            <GridAndAxes viewW={W} viewH={H} origin={origin} pxPerUnit={pxPerUnit} showGrid={true} />
            {challenge.given.map((g, i) => {
              const v = scaleVec(fromPolar(g.mag, g.theta), drawScale);
              return (
                <g key={i}>
                  <Arrow tail={toScreen({ x: 0, y: 0 })} tip={toScreen(v)} color={g.color} />
                  <text x={toScreen(v).x + 8} y={toScreen(v).y - 6} fontSize={12} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fill={g.color} style={{ paintOrder: 'stroke', stroke: PAPER, strokeWidth: 3 }}>
                    {g.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="px-4 pb-4 flex flex-wrap items-end gap-3 border-t border-[#eee6d3] pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#4a5a72]">|{challenge.targetLabel}| ({challenge.unit})</span>
            <input type="number" value={magAnswer} onChange={(e) => setMagAnswer(e.target.value)} className="w-32 border border-gray-300 rounded px-2 py-1 text-[13px] font-mono" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#4a5a72]">θ (° from +x)</span>
            <input type="number" value={angleAnswer} onChange={(e) => setAngleAnswer(e.target.value)} className="w-28 border border-gray-300 rounded px-2 py-1 text-[13px] font-mono" />
          </label>
          <button onClick={checkAnswer} className="text-[12.5px] font-semibold px-4 py-2 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c]">
            Check
          </button>
          <button onClick={nextChallenge} className="text-[12.5px] font-semibold px-4 py-2 rounded-full border border-[#b8823d] text-[#8f6428] bg-[#faf7f0] hover:bg-[#f0e5cc]">
            Next challenge →
          </button>
        </div>

        {checked && (
          <div className={`mx-4 mb-4 p-3 rounded border text-[12.5px] leading-relaxed whitespace-pre-line ${checked.magOk && checked.angleOk ? 'bg-[#e6f2ee] border-[#bfe0d5] text-[#1b5c4d]' : 'bg-[#f6efdc] border-[#e6d9b8] text-[#8f6428]'}`}>
            <div className="font-semibold mb-1">
              {checked.magOk && checked.angleOk ? '✓ Correct!' : `${checked.magOk ? 'Magnitude ✓' : 'Magnitude ✗'}, ${checked.angleOk ? 'angle ✓' : 'angle ✗'} — here is the worked solution:`}
            </div>
            <div className="font-mono">{challenge.explanation}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const HOW_TO_USE: Record<Tab, { how: string; goals: string[] }> = {
  '1d': {
    how: 'Drag any arrowhead left or right to change that vector along the line. The top row shows each vector from zero; the bottom row shows them chained tip-to-tail, ending at the signed resultant R. Switch context to relabel the same maths as displacement, force, or velocity.',
    goals: [
      'Represent a 1D vector as a signed number (magnitude + direction).',
      'Add collinear vectors by chaining them tip-to-tail.',
      'Explain why opposite directions subtract rather than add.',
    ],
  },
  '2d': {
    how: 'Drag a vector\'s tail to move it anywhere on the grid; drag its tip to change its size and direction. Add up to six vectors, edit any one\'s |v|/θ or vx/vy directly, and toggle the sum, angle arcs, on-canvas values, grid, and component style. Drag a tail off the canvas edge to delete that vector.',
    goals: [
      'Resolve a vector into perpendicular (x, y) components.',
      'Find a resultant from Rx = Σvx, Ry = Σvy, |R| = √(Rx²+Ry²), θ = atan2(Ry,Rx).',
      'Recognise that a vector\'s position on the page does not change its value.',
    ],
  },
  methods: {
    how: 'Pick a method and press Next to reveal it one legal step at a time — nothing plays on its own. Tip-to-tail slides each vector onto the previous one\'s tip; Parallelogram completes the parallelogram and draws its diagonal; Components splits every vector into x and y first. Toggle the order to see the same R either way.',
    goals: [
      'Carry out the tip-to-tail and parallelogram constructions correctly.',
      'Show that vector addition is commutative: a + b = b + a.',
      'Combine components with Pythagoras and tan⁻¹ to rebuild a resultant.',
    ],
  },
  equations: {
    how: 'Set s₁ and s₂ to scale a and b (negative values reverse them) and watch c = s₁·a + s₂·b update live. Below, step through a − b to see it built as a + (−b): b visibly reverses direction before the two are added tip-to-tail.',
    goals: [
      'Scale a vector by a number, including negative and fractional scalars.',
      'Show that subtracting a vector is the same as adding its reverse.',
      'Combine scaling and addition in one expression.',
    ],
  },
  scale: {
    how: 'Two vectors are drawn tip-to-tail to the stated scale. Drag the ruler to measure the straight-line distance from the start dot to the end dot (it rotates from its small ring), and the protractor to read the angle against the dashed 0° reference line. Convert your ruler reading back to real units with the scale, then type both answers in.',
    goals: [
      'Construct a scale vector diagram accurately.',
      'Use a ruler and protractor to take a physical measurement from a diagram.',
      'Convert a scale-drawing length back into a real physical quantity.',
    ],
  },
  challenges: {
    how: 'Read the question, enter the resultant\'s magnitude and direction, and press Check — answers within 2% of the length and 2° of the angle count as correct. Every question is freshly randomly generated, and a worked solution appears whether you\'re right or wrong. Press Next challenge whenever you\'re ready.',
    goals: [
      'Apply vector addition/subtraction to unfamiliar numeric problems under time pressure.',
      'Interpret real contexts (river crossings, crosswinds, equilibrium) as vector problems.',
      'Self-check working against a fully computed solution.',
    ],
  },
};

function HowToUse({ tab }: { tab: Tab }) {
  const info = HOW_TO_USE[tab];
  return (
    <div className={cardCls + ' p-4'}>
      <span className={labelCls}>How to use — {TABS.find((t) => t.id === tab)?.label}</span>
      <p className="text-[12px] text-[#4a5a72] mt-2 leading-relaxed">{info.how}</p>
      <span className={labelCls + ' block mt-3'}>Learning objectives</span>
      <ul className="mt-1.5 list-disc list-inside text-[12px] text-[#4a5a72] space-y-1">
        {info.goals.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
    </div>
  );
}
