'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { coulombForce, K, netForce, type PointCharge } from '@/lib/physics/coulomb';
import { sci, signed } from '@/lib/physics/format';
import type { ChargeSpec, CoulombInfo, CoulombMode, CoulombParams, CoulombScene, CoulombView, FieldLineMode } from './coulomb/CoulombScene';

type Unit = 'nC' | 'µC' | 'mC';
const UNIT: Record<Unit, number> = { nC: 1e-9, 'µC': 1e-6, mC: 1e-3 };
const UNIT_POWER: Record<Unit, string> = { nC: '10⁻⁹', 'µC': '10⁻⁶', mC: '10⁻³' };

interface PairState {
  q1: number;
  q2: number;
  unit: Unit;
  /** Separation, m. */
  r: number;
}

interface NetCharge {
  name: string;
  /** In the preset's unit. */
  q: number;
  x: number;
  y: number;
}

interface NetState {
  preset: string;
  unit: Unit;
  target: number;
  charges: NetCharge[];
  /** Size of the arrangement when it was loaded, m: fixes the drawing scale. */
  span: number;
}

interface PairPreset {
  label: string;
  detail: string;
  set: PairState;
}

// Numbers from the 17.4 practice questions; each preset shows the situation with the unknown already found.
const PAIR_PRESETS: PairPreset[] = [
  { label: '+5.0 µC and +8.0 µC repel with 0.90 N', detail: 'r = 0.632 m', set: { q1: 5, q2: 8, unit: 'µC', r: Math.sqrt((K * 5e-6 * 8e-6) / 0.9) } },
  { label: '25 mC and 5.0 mC, 1000 N', detail: 'r = 1.06 m', set: { q1: 25, q2: 5, unit: 'mC', r: Math.sqrt((K * 25e-3 * 5e-3) / 1000) } },
  { label: '4.0 × 10⁻⁵ C, 1.08 N at 1.0 m', detail: 'q₂ = 3.0 µC', set: { q1: 40, q2: 3, unit: 'µC', r: 1 } },
  { label: '−1.5 µC attracts qx with 3.375 N', detail: 'r = 0.20 m, qx = +10 µC', set: { q1: -1.5, q2: 10, unit: 'µC', r: 0.2 } },
  { label: 'Identical spheres, 0.050 N', detail: 'r = 0.15 m, q = 0.354 µC', set: { q1: 0.354, q2: 0.354, unit: 'µC', r: 0.15 } },
];

interface NetPreset {
  id: string;
  label: string;
  detail: string;
  unit: Unit;
  target: number;
  charges: NetCharge[];
}

const NET_PRESETS: NetPreset[] = [
  {
    id: 'l-shape',
    label: 'L-shape',
    detail: 'force on q₁, µC',
    unit: 'µC',
    target: 0,
    charges: [
      { name: 'q₁', q: 2, x: 0, y: 0 },
      { name: 'q₂', q: -3, x: 0.4, y: 0 },
      { name: 'q₃', q: 1, x: 0, y: 0.3 },
    ],
  },
  {
    id: 'l-mc',
    label: 'L-shape in mC',
    detail: 'force on qA',
    unit: 'mC',
    target: 0,
    charges: [
      { name: 'qA', q: 5, x: 0, y: 0 },
      { name: 'qB', q: -8, x: 3, y: 0 },
      { name: 'qC', q: 1, x: 0, y: 4 },
    ],
  },
  {
    id: 'right-angle',
    label: 'Right angle at qa',
    detail: 'force on qc, nC',
    unit: 'nC',
    target: 2,
    charges: [
      { name: 'qa', q: -4, x: 0, y: 0 },
      { name: 'qb', q: 5, x: 0.2, y: 0 },
      { name: 'qc', q: 2, x: 0, y: 0.1 },
    ],
  },
  {
    id: 'xyz',
    label: 'qx, qy and qz',
    detail: 'force on qx, nC',
    unit: 'nC',
    target: 0,
    charges: [
      { name: 'qx', q: 10, x: 0, y: 0 },
      { name: 'qy', q: 5, x: 1, y: 0 },
      { name: 'qz', q: -10, x: 0, y: 1 },
    ],
  },
  {
    id: 'equilateral',
    label: 'Equilateral triangle',
    detail: 'force on qC, µC',
    unit: 'µC',
    target: 2,
    charges: [
      { name: 'qA', q: 4, x: 0, y: 0 },
      { name: 'qB', q: -6, x: 0.5, y: 0 },
      { name: 'qC', q: 2, x: 0.25, y: (0.5 * Math.sqrt(3)) / 2 },
    ],
  },
  {
    id: 'on-q2',
    label: 'Force on q₂',
    detail: 'q₃ 0.50 m from q₁, 0.70 m from q₂',
    unit: 'nC',
    target: 1,
    charges: [
      { name: 'q₁', q: 8, x: 0, y: 0 },
      { name: 'q₂', q: -5, x: 0.3, y: 0 },
      { name: 'q₃', q: 6, x: -0.25, y: Math.sqrt(0.25 - 0.0625) },
    ],
  },
];

const PAIR_SCALE = 3; // world units per metre
const PAIR_GRID = 0.05; // m
const R_MIN = 0.05;
const R_MAX = 1.2;

function spanOf(cs: { x: number; y: number }[]) {
  let s = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) s = Math.max(s, Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y));
  return s;
}

function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function loadNet(p: NetPreset): NetState {
  return { preset: p.id, unit: p.unit, target: p.target, charges: p.charges.map((c) => ({ ...c })), span: spanOf(p.charges) };
}

const lengthText = (m: number) => (m < 1 ? `${+(m * 100).toFixed(1)} cm` : `${+m.toFixed(2)} m`);

export function CoulombLab() {
  const [mode, setMode] = useState<CoulombMode>('pair');
  const [pair, setPair] = useState<PairState>({ q1: 2, q2: -3, unit: 'µC', r: 0.4 });
  const [net, setNet] = useState<NetState>(() => loadNet(NET_PRESETS[0]));
  const [fieldLines, setFieldLines] = useState<FieldLineMode>('plane');
  const [showParallelogram, setShowParallelogram] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [info, setInfo] = useState<CoulombInfo>({ newtonsPerSquare: 0 });
  const [ratio, setRatio] = useState<{ action: string; before: number; after: number; why: string } | null>(null);
  const [activePair, setActivePair] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CoulombScene | null>(null);

  const params: CoulombParams = useMemo(() => {
    if (mode === 'pair') {
      const u = UNIT[pair.unit];
      const charges: ChargeSpec[] = [
        { name: 'q₁', q: pair.q1 * u, x: -pair.r / 2, y: 0, label: `q₁ = ${signed(pair.q1, 2)} ${pair.unit}` },
        { name: 'q₂', q: pair.q2 * u, x: pair.r / 2, y: 0, label: `q₂ = ${signed(pair.q2, 2)} ${pair.unit}` },
      ];
      return { mode, layout: 'pair', charges, target: 0, scale: PAIR_SCALE, grid: PAIR_GRID, fieldLines, showParallelogram, frameBox: [R_MAX / 2 + 0.12, 0.3] };
    }
    const u = UNIT[net.unit];
    const charges: ChargeSpec[] = net.charges.map((c) => ({ name: c.name, q: c.q * u, x: c.x, y: c.y, label: `${c.name} = ${signed(c.q)} ${net.unit}` }));
    return { mode, layout: net.preset, charges, target: net.target, scale: 3.2 / net.span, grid: niceStep(net.span / 8), fieldLines, showParallelogram };
  }, [mode, pair, net, fieldLines, showParallelogram]);

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
    sceneRef.current?.setParams(params);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const onInfo = (next: CoulombInfo) => setInfo((prev) => (Math.abs(prev.newtonsPerSquare - next.newtonsPerSquare) > 1e-12 * Math.max(1, next.newtonsPerSquare) ? next : prev));
    const onDrag = (index: number, x: number, y: number) =>
      setNet((prev) => ({ ...prev, charges: prev.charges.map((c, i) => (i === index ? { ...c, x, y } : c)) }));
    import('./coulomb/CoulombScene')
      .then(({ CoulombScene }) => {
        if (cancelled || !mountRef.current) return;
        sceneRef.current = new CoulombScene(mountRef.current, paramsRef.current, onInfo, onDrag);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const pairForce = coulombForce(pair.q1 * UNIT[pair.unit], pair.q2 * UNIT[pair.unit], pair.r);
  const pairKind = pair.q1 * pair.q2 > 0 ? 'repel' : pair.q1 * pair.q2 < 0 ? 'attract' : 'none';

  const updatePair = (patch: Partial<PairState>) => {
    setActivePair(null);
    setRatio(null);
    setPair((p) => ({ ...p, ...patch }));
  };

  const experiment = (action: string, patch: Partial<PairState>, why: string) => {
    const next = { ...pair, ...patch };
    const after = coulombForce(next.q1 * UNIT[next.unit], next.q2 * UNIT[next.unit], next.r);
    setPair(next);
    setActivePair(null);
    setRatio({ action, before: pairForce, after, why });
  };

  const netResult = useMemo(() => {
    const u = UNIT[net.unit];
    const cs: PointCharge[] = net.charges.map((c) => ({ q: c.q * u, p: [c.x, c.y, 0] }));
    const others = cs.map((_, i) => i).filter((i) => i !== net.target);
    const res = netForce(cs[net.target], others.map((i) => cs[i]));
    return {
      others,
      res,
      distances: others.map((i) => Math.hypot(net.charges[i].x - net.charges[net.target].x, net.charges[i].y - net.charges[net.target].y)),
    };
  }, [net]);

  const loadPreset = (p: NetPreset) => {
    setNet(loadNet(p));
  };

  const view = (v: CoulombView) => sceneRef.current?.setView(v);
  const gridText = lengthText(params.grid);

  return (
    <div className="coulomb-lab">
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5">
        <div className="bg-white border border-[#e4ddcc] rounded overflow-hidden">
          <div className="flex justify-between items-baseline px-4 pt-3 pb-2">
            <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">3D Apparatus</span>
            <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">
              {mode === 'pair' ? (
                <>
                  F = <span className="text-[#7a4a8f] font-semibold normal-case">{sci(pairForce)} N</span>
                </>
              ) : (
                <>
                  Net F = <span className="text-[#8f6428] font-semibold normal-case">{sci(netResult.res.magnitude)} N</span>
                </>
              )}
            </span>
          </div>

          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-1 bg-[#faf7f0] border border-[#eee6d3] rounded p-1" role="tablist" aria-label="Arrangement">
              {(
                [
                  ['pair', 'Two charges'],
                  ['net', 'Three charges: net force'],
                ] as [CoulombMode, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={`text-[12.5px] sm:text-[13px] font-semibold px-2 py-1.5 rounded transition-colors ${
                    mode === id ? 'bg-[#1b2a41] text-white' : 'text-[#1b2a41] hover:bg-[#f0e9d8]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[360px] sm:h-[440px] border-y border-[#eee6d3] bg-[#faf7f0]">
            <div ref={mountRef} className="absolute inset-0" />
            {status !== 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#4a5a72]">
                {status === 'loading' ? 'Loading the 3D apparatus…' : 'This simulation needs WebGL, which your browser has turned off.'}
              </div>
            )}
            <div className="absolute top-2 left-2 flex gap-1">
              {(['3d', 'face'] as CoulombView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => view(v)}
                  className="bg-white/90 border border-[#d8cfb6] hover:bg-[#f5f0e2] text-[#1b2a41] text-[11.5px] font-semibold px-2 py-1 rounded"
                >
                  {v === '3d' ? '3D view' : 'Face on'}
                </button>
              ))}
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 pointer-events-none">
              <span className="text-[11px] text-[#4a5a72] bg-white/85 rounded px-1.5 py-0.5">
                {mode === 'net' ? 'Drag a charge to move it · ' : ''}drag the space to rotate · grid squares are {gridText}
              </span>
              {info.newtonsPerSquare > 0 && (
                <span className="text-[11px] text-[#4a5a72] bg-white/85 rounded px-1.5 py-0.5">arrows: one grid square = {sci(info.newtonsPerSquare)} N</span>
              )}
            </div>
          </div>

          <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <LegendDot color="#b34a3c" label="Positive charge" />
            <LegendDot color="#2e5a8f" label="Negative charge" />
            {mode === 'pair' ? (
              <LegendDot color="#7a4a8f" label="Force on each charge" />
            ) : (
              <>
                <LegendDot color="#7a4a8f" label={`Force from ${net.charges[netResult.others[0]].name}`} />
                <LegendDot color="#2e7d6b" label={`Force from ${net.charges[netResult.others[1]].name}`} />
                <LegendDot color="#b8823d" label="Net force" />
              </>
            )}
          </div>
          <p className="px-4 text-[11px] text-[#4a5a72] leading-snug">
            {mode === 'pair'
              ? 'The forces on the two charges are always equal in size and opposite in direction (Newton’s third law). Arrows are drawn beside the charges so they never overlap.'
              : 'Force arrows share one scale, so you can add them as vectors: the net force is the diagonal of the parallelogram.'}{' '}
            Field lines run from + to −; arrowheads show the direction of the field.
          </p>

          <div className="px-4 pb-5 pt-3 mt-2 border-t border-[#eee6d3]">
            {mode === 'pair' ? (
              <>
                <UnitPicker unit={pair.unit} onChange={(unit) => updatePair({ unit })} />
                <Slider label="Charge q₁" value={pair.q1} min={-50} max={50} step={0.01} display={`${signed(pair.q1, 2)} ${pair.unit}`} onChange={(v) => updatePair({ q1: v })} />
                <Slider label="Charge q₂" value={pair.q2} min={-50} max={50} step={0.01} display={`${signed(pair.q2, 2)} ${pair.unit}`} onChange={(v) => updatePair({ q2: v })} />
                <Slider label="Separation r" value={pair.r} min={R_MIN} max={R_MAX} step={0.005} display={`${pair.r.toFixed(3)} m`} onChange={(v) => updatePair({ r: v })} />
                <div className="text-[12px] text-[#4a5a72] mb-2 mt-1">Change one thing and watch the force:</div>
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  <Chip disabled={pair.r * 2 > R_MAX} onClick={() => experiment('Doubled r', { r: pair.r * 2 }, 'F ∝ 1/r², so twice the distance gives ¼ of the force.')}>
                    Double r
                  </Chip>
                  <Chip disabled={pair.r / 2 < R_MIN} onClick={() => experiment('Halved r', { r: pair.r / 2 }, 'F ∝ 1/r², so half the distance gives 4 times the force.')}>
                    Halve r
                  </Chip>
                  <Chip disabled={Math.abs(pair.q1 * 2) > 50} onClick={() => experiment('Doubled q₁', { q1: pair.q1 * 2 }, 'F ∝ q₁q₂, so doubling one charge doubles the force.')}>
                    Double q₁
                  </Chip>
                  <Chip
                    disabled={Math.abs(pair.q1 * 2) > 50 || Math.abs(pair.q2 * 2) > 50}
                    onClick={() => experiment('Doubled both charges', { q1: pair.q1 * 2, q2: pair.q2 * 2 }, 'Each doubling doubles the force: 2 × 2 = 4 times.')}
                  >
                    Double both
                  </Chip>
                  <Chip onClick={() => experiment('Flipped the sign of q₂', { q2: -pair.q2 }, 'The size of the force is the same; only its direction reverses.')}>Flip q₂’s sign</Chip>
                </div>
                {ratio && (
                  <div className="mb-3.5 bg-[#fbf5e8] border border-[#e6d9b8] rounded px-3 py-2 text-[12.5px] text-[#1b2a41] leading-snug">
                    <span className="font-semibold">{ratio.action}:</span> F went from {sci(ratio.before)} N to {sci(ratio.after)} N
                    {ratio.before > 0 && (
                      <>
                        {' '}
                        — <span className="font-mono font-semibold">× {+(ratio.after / ratio.before).toPrecision(3)}</span>
                      </>
                    )}
                    . {ratio.why}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[12px] text-[#4a5a72] mr-1">Forces on</span>
                  {net.charges.map((c, i) => (
                    <Chip key={c.name} active={net.target === i} onClick={() => setNet((p) => ({ ...p, target: i }))}>
                      {c.name}
                    </Chip>
                  ))}
                </div>
                {net.charges.map((c, i) => (
                  <Slider
                    key={c.name}
                    label={`Charge ${c.name}`}
                    value={c.q}
                    min={-12}
                    max={12}
                    step={0.5}
                    display={`${signed(c.q)} ${net.unit}`}
                    onChange={(v) => setNet((p) => ({ ...p, charges: p.charges.map((x, j) => (j === i ? { ...x, q: v } : x)) }))}
                  />
                ))}
                <div className="flex flex-wrap gap-1.5 mb-3.5 mt-1">
                  <Chip active={showParallelogram} onClick={() => setShowParallelogram((v) => !v)}>
                    {showParallelogram ? '✓ ' : ''}Parallelogram
                  </Chip>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-[#4a5a72] mr-1">Field lines</span>
              {(
                [
                  ['off', 'Off'],
                  ['plane', 'In the plane'],
                  ['3d', 'All round (3D)'],
                ] as [FieldLineMode, string][]
              ).map(([id, label]) => (
                <Chip key={id} active={fieldLines === id} onClick={() => setFieldLines(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="px-4 pb-5">
            <h3 className="font-mono text-[11px] tracking-wide uppercase text-[#8f6428] mb-2">From the practice questions</h3>
            <div className="flex flex-wrap gap-1.5">
              {mode === 'pair'
                ? PAIR_PRESETS.map((p) => (
                    <PresetButton
                      key={p.label}
                      active={activePair === p.label}
                      label={p.label}
                      detail={p.detail}
                      onClick={() => {
                        setPair(p.set);
                        setRatio(null);
                        setActivePair(p.label);
                      }}
                    />
                  ))
                : NET_PRESETS.map((p) => <PresetButton key={p.id} active={net.preset === p.id} label={p.label} detail={p.detail} onClick={() => loadPreset(p)} />)}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">Readouts</h2>

          {mode === 'pair' ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <Readout label="Force on each charge" value={`${sci(pairForce)} N`} color="#7a4a8f" />
                <Readout
                  label="The charges…"
                  value={pairKind === 'repel' ? 'repel' : pairKind === 'attract' ? 'attract' : 'no force'}
                  color={pairKind === 'repel' ? '#b34a3c' : pairKind === 'attract' ? '#2e5a8f' : undefined}
                />
              </div>
              <div className="bg-[#faf7f0] border border-[#eee6d3] rounded px-3 py-2.5 mb-4 text-[12.5px] leading-relaxed text-[#1b2a41] font-mono break-words">
                F = (9.0 × 10⁹ × {sci(Math.abs(pair.q1) * UNIT[pair.unit], 2)} × {sci(Math.abs(pair.q2) * UNIT[pair.unit], 2)}) ÷ {pair.r.toFixed(3)}²
                <br />= {sci(pairForce)} N
              </div>
              <ForceGraph q1={pair.q1 * UNIT[pair.unit]} q2={pair.q2 * UNIT[pair.unit]} r={pair.r} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <Readout label={`Net force on ${net.charges[net.target].name}`} value={`${sci(netResult.res.magnitude)} N`} color="#8f6428" />
                <Readout label="Direction (anticlockwise from +x)" value={`${netResult.res.angleDeg.toFixed(1)}°`} />
              </div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="text-[#4a5a72] text-left">
                      <th className="font-normal py-1 pr-2">from</th>
                      <th className="font-normal py-1 pr-2">r / m</th>
                      <th className="font-normal py-1 pr-2">F / N</th>
                      <th className="font-normal py-1 pr-2">Fx / N</th>
                      <th className="font-normal py-1">Fy / N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netResult.others.map((i, k) => {
                      const f = netResult.res.parts[k];
                      return (
                        <tr key={i} className="border-t border-[#eee6d3]" style={{ color: k === 0 ? '#7a4a8f' : '#2e7d6b' }}>
                          <td className="py-1 pr-2 font-semibold">{net.charges[i].name}</td>
                          <td className="py-1 pr-2">{netResult.distances[k].toFixed(3)}</td>
                          <td className="py-1 pr-2">{sci(Math.hypot(f[0], f[1]))}</td>
                          <td className="py-1 pr-2">{sci(f[0])}</td>
                          <td className="py-1">{sci(f[1])}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-[#e6d9b8] text-[#8f6428] font-semibold">
                      <td className="py-1 pr-2">net</td>
                      <td className="py-1 pr-2" />
                      <td className="py-1 pr-2">{sci(netResult.res.magnitude)}</td>
                      <td className="py-1 pr-2">{sci(netResult.res.net[0])}</td>
                      <td className="py-1">{sci(netResult.res.net[1])}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-[#4a5a72] mt-1.5 leading-snug">
                  Add the x parts and the y parts separately, then F = √(Fx² + Fy²). Positions (m):{' '}
                  {net.charges.map((c) => `${c.name} (${+c.x.toFixed(3)}, ${+c.y.toFixed(3)})`).join(', ')}.
                </p>
              </div>
            </>
          )}

          <div className="bg-gradient-to-br from-[#fbf5e8] to-[#f6efdc] border border-[#e6d9b8] rounded px-4 py-3.5 text-center mb-4 space-y-1">
            <div className="italic text-[22px] text-[#8f6428]" style={{ fontFamily: 'Georgia, serif' }}>
              F = k q₁ q₂ / r²
            </div>
            <div className="text-[12px] text-[#4a5a72]">
              k = 9.0 × 10⁹ N·m²/C² · 1 {mode === 'pair' ? pair.unit : net.unit} = 1 × {UNIT_POWER[mode === 'pair' ? pair.unit : net.unit]} C
            </div>
          </div>

          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">Try This</h2>
          <ul className="space-y-2 mb-5">
            {(mode === 'pair' ? TRY_PAIR : TRY_NET).map((t) => (
              <li key={t} className="flex gap-2 text-[12.5px] text-[#1b2a41] leading-snug">
                <span className="text-[#b8823d] font-bold">→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">What Each Variable Means</h2>
          <div className="space-y-2.5">
            {VARIABLES.map((v) => (
              <div key={v.symbol} className="flex gap-3 items-start">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded bg-[#faf7f0] border border-[#eee6d3] flex items-center justify-center text-[15px] font-bold text-[#8f6428]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {v.symbol}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1b2a41]">{v.name}</div>
                  <div className="text-[12.5px] text-[#4a5a72] leading-snug">{v.def}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TRY_PAIR = [
  'Press “Double r”: the force drops to a quarter. That is the inverse-square law.',
  'Make q₁ much bigger than q₂: the two force arrows stay exactly the same length. Why?',
  'Flip the sign of one charge: the size of the force stays the same, only its direction changes.',
];

const TRY_NET = [
  'Load the L-shape and check the net force against your answer to the question.',
  'Drag the charge whose force is smallest closer to the target: which arrow grows fastest?',
  'Arrange the charges so the net force on the target is zero. Where must they be?',
];

const VARIABLES = [
  { symbol: 'F', name: 'Force', def: 'The electrostatic force between two charges, in newtons (N). Like charges repel; unlike charges attract.' },
  { symbol: 'q', name: 'Charge', def: 'In coulombs (C). Questions often use µC (× 10⁻⁶), nC (× 10⁻⁹) or mC (× 10⁻³): convert first.' },
  { symbol: 'r', name: 'Separation', def: 'Distance between the centres of the two charges, in metres (m). The force depends on 1/r².' },
  { symbol: 'k', name: 'Coulomb constant', def: '9.0 × 10⁹ N·m²/C². It sets how strong the electric force is.' },
];

function ForceGraph({ q1, q2, r }: { q1: number; q2: number; r: number }) {
  const W = 320;
  const H = 150;
  const left = 46;
  const right = 8;
  const top = 10;
  const bottom = 26;
  const f = (d: number) => coulombForce(q1, q2, d);
  const yMax = f(0.25);
  const x = (d: number) => left + ((d - R_MIN) / (R_MAX - R_MIN)) * (W - left - right);
  const y = (F: number) => top + (1 - Math.min(F / (yMax || 1), 1.04)) * (H - top - bottom);
  if (!(yMax > 0)) {
    return <p className="text-[12px] text-[#4a5a72] mb-4">With a zero charge there is no force at any distance.</p>;
  }
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const d = R_MIN + (i / 160) * (R_MAX - R_MIN);
    if (f(d) <= yMax * 1.04) pts.push(`${x(d).toFixed(1)},${y(f(d)).toFixed(1)}`);
  }
  const off = f(r) > yMax * 1.04;
  return (
    <figure className="mb-4">
      <figcaption className="text-[12px] font-semibold text-[#1b2a41] mb-1">How the force falls off with distance</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graph of force against separation, an inverse-square curve">
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={left} x2={W - right} y1={y(yMax * k)} y2={y(yMax * k)} stroke={k === 0 ? '#1b2a41' : '#eee6d3'} strokeWidth={k === 0 ? 1 : 0.8} />
            <text x={left - 5} y={y(yMax * k) + 3.5} textAnchor="end" fontSize="9" fill="#4a5a72" fontFamily="ui-monospace, monospace">
              {k === 0 ? '0' : sci(yMax * k, 2)}
            </text>
          </g>
        ))}
        {[0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((d) => (
          <text key={d} x={x(d)} y={H - 10} textAnchor={d === 1.2 ? 'end' : 'middle'} fontSize="9.5" fill="#4a5a72">
            {d.toFixed(1)}
          </text>
        ))}
        <text x={W - right} y={H - 1} textAnchor="end" fontSize="9" fill="#4a5a72">
          r / m
        </text>
        <text x={4} y={top + 4} fontSize="9" fill="#4a5a72" transform={`rotate(-90 4 ${top + 4})`} textAnchor="end">
          F / N
        </text>
        <polyline points={pts.join(' ')} fill="none" stroke="#7a4a8f" strokeWidth={2} />
        <line x1={x(r)} x2={x(r)} y1={y(0)} y2={off ? top : y(f(r))} stroke="#7a4a8f" strokeDasharray="3 3" strokeWidth={1} />
        <circle cx={x(r)} cy={off ? top : y(f(r))} r={4.5} fill={off ? '#fff' : '#7a4a8f'} stroke="#7a4a8f" strokeWidth={1.5} />
      </svg>
      <p className="text-[11px] text-[#4a5a72] leading-snug">
        {off ? 'The force at this distance is off the top of the graph. ' : ''}Each time r doubles, F falls to a quarter.
      </p>
    </figure>
  );
}

function UnitPicker({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-[13px] text-[#4a5a72] w-24 sm:w-28 flex-shrink-0">Charge unit</span>
      {(Object.keys(UNIT) as Unit[]).map((u) => (
        <Chip key={u} active={unit === u} onClick={() => onChange(u)}>
          {u}
        </Chip>
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <label className="text-[13px] text-[#4a5a72] w-24 sm:w-28 flex-shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
        aria-label={label}
      />
      <span className="font-mono text-[13px] w-[84px] sm:w-24 text-right whitespace-nowrap">{display}</span>
    </div>
  );
}

function Chip({ children, onClick, active, disabled }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-transparent text-[#1b2a41] border-[#d8cfb6] hover:bg-[#f5f0e2]'
      }`}
    >
      {children}
    </button>
  );
}

function PresetButton({ label, detail, active, onClick }: { label: string; detail: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left text-[12px] px-2.5 py-1.5 rounded border leading-tight ${
        active ? 'bg-[#fbf5e8] border-[#b8823d] text-[#1b2a41]' : 'border-[#e4ddcc] hover:border-[#b8823d] text-[#1b2a41] bg-white'
      }`}
    >
      <span className="font-semibold block">{label}</span>
      <span className="text-[#4a5a72]">{detail}</span>
    </button>
  );
}

function Readout({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#faf7f0] border border-[#eee6d3] rounded px-3 py-2.5">
      <div className="text-[11px] text-[#4a5a72] mb-1 leading-tight">{label}</div>
      <div className="font-mono font-bold text-xl" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[#4a5a72]">
      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
