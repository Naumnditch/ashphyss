'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { conicalPendulum, G, horizontalCircle, verticalCircle, verticalTensionAt } from '@/lib/physics/circularMotion';
import type { CircularLive, CircularMode, CircularParams, CircularScene, CircularView, StringState } from './circular/CircularScene';

interface LabState {
  mode: CircularMode;
  mass: number;
  hRadius: number;
  period: number;
  vRadius: number;
  speed: number;
  length: number;
  angle: number;
  showVelocity: boolean;
  showForces: boolean;
  showResultant: boolean;
  showComponents: boolean;
  showTrail: boolean;
  timeScale: number;
  playing: boolean;
}

const INITIAL: LabState = {
  mode: 'horizontal',
  mass: 0.5,
  hRadius: 1.0,
  period: 1.5,
  vRadius: 0.9,
  speed: Math.PI,
  length: 1.5,
  angle: 35,
  showVelocity: true,
  showForces: true,
  showResultant: false,
  showComponents: false,
  showTrail: true,
  timeScale: 1,
  playing: true,
};

const toParams = (s: LabState): CircularParams => ({
  ...s,
  radius: s.mode === 'horizontal' ? s.hRadius : s.vRadius,
});

interface Preset {
  mode: CircularMode;
  label: string;
  detail: string;
  set: Partial<LabState>;
}

// Numbers from the 3.7 practice questions, so students can check their answers.
const PRESETS: Preset[] = [
  { mode: 'horizontal', label: '0.75 kg, 12 rev/min', detail: 'r = 1.1 m', set: { mass: 0.75, hRadius: 1.1, period: 5 } },
  { mode: 'horizontal', label: '0.100 kg, once every 0.80 s', detail: 'r = 0.75 m', set: { mass: 0.1, hRadius: 0.75, period: 0.8 } },
  { mode: 'horizontal', label: '0.50 kg, once every 0.50 s', detail: 'r = 1.0 m', set: { mass: 0.5, hRadius: 1.0, period: 0.5 } },
  { mode: 'horizontal', label: "Normie's ball, 120 rev/min", detail: 'r = 1.5 m', set: { hRadius: 1.5, period: 0.5 } },
  { mode: 'vertical', label: '0.50 kg, 1.8 s per turn', detail: 'r = 0.90 m', set: { mass: 0.5, vRadius: 0.9, speed: (2 * Math.PI * 0.9) / 1.8 } },
  { mode: 'vertical', label: '2.1 kg, 1.5 s per turn', detail: 'r = 1.2 m', set: { mass: 2.1, vRadius: 1.2, speed: (2 * Math.PI * 1.2) / 1.5 } },
  { mode: 'vertical', label: 'Bucket of water, 4.0 kg', detail: 'r = 1.5 m, 5.0 m/s', set: { mass: 4, vRadius: 1.5, speed: 5 } },
  { mode: 'vertical', label: 'Too slow for the top', detail: 'r = 1.0 m, 2.6 m/s', set: { mass: 0.5, vRadius: 1.0, speed: 2.6 } },
  { mode: 'conical', label: '0.50 kg on 1.5 m at 35°', detail: 'find T', set: { mass: 0.5, length: 1.5, angle: 35 } },
  { mode: 'conical', label: '0.90 m string at 25°', detail: 'find v', set: { length: 0.9, angle: 25 } },
  { mode: 'conical', label: '2.0 kg with T = 30 N', detail: 'θ = 49.2°', set: { mass: 2, angle: (Math.acos((2 * G) / 30) * 180) / Math.PI } },
  {
    mode: 'conical',
    label: 'Period 2.2 s, r = 0.70 m',
    detail: 'θ = 30.2°',
    set: (() => {
      const h = G * (2.2 / (2 * Math.PI)) ** 2;
      return { length: Math.hypot(h, 0.7), angle: (Math.atan(0.7 / h) * 180) / Math.PI };
    })(),
  },
  {
    mode: 'conical',
    label: 'Toy plane, 0.25 kg at 28°',
    detail: 'r = 0.80 m',
    set: { mass: 0.25, length: 0.8 / Math.sin((28 * Math.PI) / 180), angle: 28 },
  },
];

const MODES: { id: CircularMode; label: string }[] = [
  { id: 'horizontal', label: 'Horizontal circle' },
  { id: 'vertical', label: 'Vertical circle' },
  { id: 'conical', label: 'Conical pendulum' },
];

const f = (x: number, dp = 2) => (Number.isFinite(x) ? x.toFixed(dp) : '—');
const sig = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2));

export function CircularMotionLab() {
  const [s, setS] = useState<LabState>(INITIAL);
  const [stringState, setStringState] = useState<StringState>('attached');
  const [flightDistance, setFlightDistance] = useState(0);
  const [slackSeen, setSlackSeen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CircularScene | null>(null);
  const stateRef = useRef(s);
  const tensionNowRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const graphRef = useRef<{ x: (phi: number) => number; y: (t: number) => number } | null>(null);
  const stringRef = useRef<StringState>('attached');
  const slackRef = useRef(false);

  const update = (patch: Partial<LabState>) => {
    setActivePreset(null);
    setS((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    stateRef.current = s;
    sceneRef.current?.setParams(toParams(s));
  }, [s]);

  useEffect(() => {
    let cancelled = false;
    const onLive = (live: CircularLive) => {
      const el = tensionNowRef.current;
      if (el) {
        const text = live.string !== 'attached' ? 'string cut' : live.slack ? 'slack: 0 N' : `${sig(live.tension)} N`;
        if (el.textContent !== text) el.textContent = text;
      }
      const g = graphRef.current;
      const marker = markerRef.current;
      if (g && marker) {
        marker.setAttribute('cx', g.x(live.phase).toFixed(1));
        marker.setAttribute('cy', g.y(live.tension).toFixed(1));
        marker.setAttribute('fill', live.slack ? '#b34a3c' : '#7a4a8f');
        marker.style.opacity = live.string === 'attached' ? '1' : '0';
      }
      if (live.string !== stringRef.current) {
        stringRef.current = live.string;
        setStringState(live.string);
        if (live.string === 'landed') setFlightDistance(live.flight);
      }
      if (live.slack !== slackRef.current) {
        slackRef.current = live.slack;
        if (live.slack) setSlackSeen(true);
      }
    };
    import('./circular/CircularScene')
      .then(({ CircularScene }) => {
        if (cancelled || !mountRef.current) return;
        sceneRef.current = new CircularScene(mountRef.current, toParams(stateRef.current), onLive);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const setMode = (mode: CircularMode) => {
    if (mode === s.mode) return;
    stringRef.current = 'attached';
    setStringState('attached');
    setSlackSeen(false);
    update({ mode });
  };

  const applyPreset = (p: Preset) => {
    sceneRef.current?.reattach();
    stringRef.current = 'attached';
    setStringState('attached');
    setSlackSeen(false);
    setS((prev) => ({ ...prev, mode: p.mode, ...p.set, playing: true }));
    setActivePreset(p.label);
    // A preset changes the size of the apparatus: frame it straight away.
    setTimeout(() => sceneRef.current?.setView('3d'), 30);
  };

  const cutOrReattach = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (stringState === 'attached') {
      scene.cut();
      if (!s.playing) update({ playing: true });
    } else {
      scene.reattach();
    }
  };

  const view = (v: CircularView) => sceneRef.current?.setView(v);

  const h = useMemo(() => horizontalCircle(s.mass, s.hRadius, s.period), [s.mass, s.hRadius, s.period]);
  const vc = useMemo(() => verticalCircle(s.mass, s.vRadius, s.speed), [s.mass, s.vRadius, s.speed]);
  const cp = useMemo(() => conicalPendulum(s.mass, s.length, s.angle), [s.mass, s.length, s.angle]);

  const cutMessage =
    stringState === 'attached'
      ? null
      : s.mode === 'horizontal'
        ? 'No string, no centripetal force: the ball slides off in a straight line along the tangent, at a steady speed (Newton’s first law). It does not fly outwards.'
        : stringState === 'flying'
          ? 'No tension any more: gravity is the only force, so the mass leaves along the tangent and falls as a projectile.'
          : `The mass left along the tangent and landed ${f(flightDistance)} m (horizontally) from where the string was cut.`;

  return (
    <div className="circular-lab">
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5">
        <div className="bg-white border border-[#e4ddcc] rounded overflow-hidden">
          <div className="flex justify-between items-baseline px-4 pt-3 pb-2">
            <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">3D Apparatus</span>
            <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">
              Tension now: <span ref={tensionNowRef} className="text-[#7a4a8f] font-semibold normal-case" />
            </span>
          </div>

          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-1 bg-[#faf7f0] border border-[#eee6d3] rounded p-1" role="tablist" aria-label="Kind of circular motion">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={s.mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-[12.5px] sm:text-[13px] font-semibold px-2 py-1.5 rounded transition-colors ${
                    s.mode === m.id ? 'bg-[#1b2a41] text-white' : 'text-[#1b2a41] hover:bg-[#f0e9d8]'
                  }`}
                >
                  {m.label}
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
              {(['3d', 'side', 'top'] as CircularView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => view(v)}
                  className="bg-white/90 border border-[#d8cfb6] hover:bg-[#f5f0e2] text-[#1b2a41] text-[11.5px] font-semibold px-2 py-1 rounded"
                >
                  {v === '3d' ? '3D view' : v === 'side' ? 'Side' : 'Top'}
                </button>
              ))}
            </div>
            {cutMessage ? (
              <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-[360px] bg-white/95 border border-[#e6d9b8] rounded px-3 py-2 text-[12px] text-[#1b2a41] leading-snug shadow-sm">
                <span className="font-semibold text-[#8f6428]">String cut. </span>
                {cutMessage}
              </div>
            ) : (
              <div className="absolute bottom-2 left-2 text-[11px] text-[#4a5a72] bg-white/80 rounded px-1.5 py-0.5 pointer-events-none">
                Drag to rotate · scroll or pinch to zoom · grid squares are 25 cm
              </div>
            )}
          </div>

          <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <LegendDot color="#2e7d6b" label="Velocity v" />
            <LegendDot color="#7a4a8f" label="Tension T" />
            <LegendDot color="#2e5a8f" label="Weight mg" />
            {s.mode === 'horizontal' && <LegendDot color="#5d6b80" label="Normal force N" />}
            <LegendDot color="#b8823d" label="Resultant (centripetal) force" />
          </div>
          <p className="px-4 text-[11px] text-[#4a5a72] leading-snug">
            Force arrows are drawn to the same scale as each other.
            {s.mode === 'vertical' && ' The path is shaded by tension: darker where the string pulls harder, red where it would go slack.'}
          </p>

          <div className="px-4 pb-5 pt-3 mt-2 border-t border-[#eee6d3]">
            {s.mode === 'horizontal' && (
              <>
                <Slider label="Radius r" value={s.hRadius} min={0.3} max={2} step={0.05} unit="m" onChange={(v) => update({ hRadius: v })} />
                <Slider label="Time per turn" value={s.period} min={0.4} max={6} step={0.05} unit="s" onChange={(v) => update({ period: v })} />
              </>
            )}
            {s.mode === 'vertical' && (
              <>
                <Slider label="Radius r" value={s.vRadius} min={0.3} max={2} step={0.05} unit="m" onChange={(v) => update({ vRadius: v })} />
                <Slider label="Speed v" value={s.speed} min={0.5} max={10} step={0.05} unit="m/s" onChange={(v) => update({ speed: v })} />
              </>
            )}
            {s.mode === 'conical' && (
              <>
                <Slider label="String length L" value={s.length} min={0.3} max={2} step={0.05} unit="m" onChange={(v) => update({ length: v })} />
                <Slider label="Angle θ" value={s.angle} min={5} max={75} step={0.5} unit="°" dp={1} onChange={(v) => update({ angle: v })} />
              </>
            )}
            <Slider label="Mass m" value={s.mass} min={0.1} max={5} step={0.05} unit="kg" onChange={(v) => update({ mass: v })} />

            <div className="flex flex-wrap gap-1.5 mb-3.5 mt-1">
              <Toggle on={s.showVelocity} onClick={() => update({ showVelocity: !s.showVelocity })} label="Velocity" />
              <Toggle on={s.showForces} onClick={() => update({ showForces: !s.showForces })} label="Forces" />
              <Toggle on={s.showResultant} onClick={() => update({ showResultant: !s.showResultant })} label="Resultant force" />
              {s.mode === 'conical' && (
                <Toggle
                  on={s.showComponents}
                  onClick={() => update({ showComponents: !s.showComponents, showForces: true })}
                  label="Resolve T"
                />
              )}
              <Toggle on={s.showTrail} onClick={() => update({ showTrail: !s.showTrail })} label="Trail" />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => update({ playing: !s.playing })}
                className="bg-[#b8823d] hover:bg-[#8f6428] text-white text-[13.5px] font-semibold px-3.5 py-2 rounded"
              >
                {s.playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={cutOrReattach}
                className={`text-[13.5px] font-semibold px-3.5 py-2 rounded border ${
                  stringState === 'attached'
                    ? 'bg-transparent border-[#b34a3c] text-[#b34a3c] hover:bg-[#fbeeec]'
                    : 'bg-transparent border-[#d8cfb6] hover:bg-[#f5f0e2] text-[#1b2a41]'
                }`}
              >
                {stringState === 'attached' ? '✂ Cut the string' : '⟲ Tie it back on'}
              </button>
              <div className="flex items-center gap-1 ml-auto" role="group" aria-label="Playback speed">
                <span className="text-[12px] text-[#4a5a72] mr-1">Speed</span>
                {[1, 0.5, 0.25].map((k) => (
                  <button
                    key={k}
                    onClick={() => update({ timeScale: k })}
                    className={`font-mono text-[12px] px-2 py-1 rounded border ${
                      s.timeScale === k ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'border-[#d8cfb6] text-[#1b2a41] hover:bg-[#f5f0e2]'
                    }`}
                  >
                    {k === 1 ? '1×' : k === 0.5 ? '½×' : '¼×'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pb-5">
            <h3 className="font-mono text-[11px] tracking-wide uppercase text-[#8f6428] mb-2">From the practice questions</h3>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.filter((p) => p.mode === s.mode).map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`text-left text-[12px] px-2.5 py-1.5 rounded border leading-tight ${
                    activePreset === p.label
                      ? 'bg-[#fbf5e8] border-[#b8823d] text-[#1b2a41]'
                      : 'border-[#e4ddcc] hover:border-[#b8823d] text-[#1b2a41] bg-white'
                  }`}
                >
                  <span className="font-semibold block">{p.label}</span>
                  <span className="text-[#4a5a72]">{p.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">Readouts</h2>

          {s.mode === 'horizontal' && (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Readout label="Speed v = 2πr / t" value={`${f(h.v)} m/s`} color="#2e7d6b" />
              <Readout label="Turns per minute" value={f(h.rpm, 1)} />
              <Readout label="Centripetal acceleration v²/r" value={`${sig(h.a)} m/s²`} />
              <Readout label="Tension T = mv²/r" value={`${sig(h.force)} N`} color="#7a4a8f" />
              <Readout label="Angular speed ω" value={`${f(h.omega)} rad/s`} small />
              <Readout label="Weight mg (balanced by N)" value={`${sig(s.mass * G)} N`} small />
            </div>
          )}

          {s.mode === 'vertical' && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <Readout label="Time per turn 2πr / v" value={`${f((2 * Math.PI * s.vRadius) / s.speed)} s`} />
                <Readout label="Centripetal force mv²/r" value={`${sig(s.mass * vc.a)} N`} color="#8f6428" />
                <Readout label="Tension at the bottom" value={`${sig(vc.tensionBottom)} N`} color="#7a4a8f" />
                <Readout
                  label="Tension at the top"
                  value={vc.tensionTop >= 0 ? `${sig(vc.tensionTop)} N` : 'slack'}
                  color={vc.tensionTop >= 0 ? '#7a4a8f' : '#b34a3c'}
                />
                <Readout label="Minimum speed √(gr)" value={`${f(vc.minSpeed)} m/s`} small />
                <Readout label="Weight mg" value={`${sig(s.mass * G)} N`} small />
              </div>
              {(vc.tensionTop < 0 || slackSeen) && (
                <p className="text-[12px] text-[#b34a3c] bg-[#fbeeec] border border-[#f0d4cf] rounded px-3 py-2 mb-3 leading-snug">
                  {vc.tensionTop < 0
                    ? `${f(s.speed)} m/s is below the minimum speed of ${f(vc.minSpeed)} m/s. Near the top, gravity alone pulls harder than the circle needs, so the string goes slack and the mass falls inside the circle.`
                    : 'Above the minimum speed the string stays tight all the way round.'}
                </p>
              )}
              <TensionGraph mass={s.mass} r={s.vRadius} v={s.speed} markerRef={markerRef} graphRef={graphRef} />
            </>
          )}

          {s.mode === 'conical' && (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Readout label="Radius r = L sin θ" value={`${f(cp.r)} m`} />
              <Readout label="Height h = L cos θ" value={`${f(cp.h)} m`} />
              <Readout label="Speed v = √(g r tan θ)" value={`${f(cp.v)} m/s`} color="#2e7d6b" />
              <Readout label="Time per turn 2π√(h/g)" value={`${f(cp.period)} s`} />
              <Readout label="Tension T = mg / cos θ" value={`${sig(cp.tension)} N`} color="#7a4a8f" />
              <Readout label="Centripetal force mg tan θ" value={`${sig(cp.centripetal)} N`} color="#8f6428" />
            </div>
          )}

          <div className="bg-gradient-to-br from-[#fbf5e8] to-[#f6efdc] border border-[#e6d9b8] rounded px-4 py-3.5 text-center mb-4 space-y-1">
            {s.mode === 'horizontal' && (
              <>
                <Formula>F = mv² / r</Formula>
                <div className="text-[12px] text-[#4a5a72]">with v = 2πr / t, where t is the time for one turn</div>
              </>
            )}
            {s.mode === 'vertical' && (
              <>
                <Formula>bottom: T − mg = mv² / r</Formula>
                <Formula>top: T + mg = mv² / r</Formula>
              </>
            )}
            {s.mode === 'conical' && (
              <>
                <Formula>T cos θ = mg</Formula>
                <Formula>T sin θ = mv² / r</Formula>
                <div className="text-[12px] text-[#4a5a72]">so tan θ = v² / (r g), whatever the mass</div>
              </>
            )}
          </div>

          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">Try This</h2>
          <ul className="space-y-2 mb-5">
            {TRY_THIS[s.mode].map((t) => (
              <li key={t} className="flex gap-2 text-[12.5px] text-[#1b2a41] leading-snug">
                <span className="text-[#b8823d] font-bold">→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="font-mono text-[15px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3.5">What Each Variable Means</h2>
          <div className="space-y-2.5">
            {VARIABLES[s.mode].map((v) => (
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

const TRY_THIS: Record<CircularMode, string[]> = {
  horizontal: [
    'Cut the string. Does the ball fly outwards, or carry on along the tangent?',
    'Halve the time per turn: the speed doubles and the tension goes up four times.',
    'Double the mass: the motion looks the same, but the string must pull twice as hard.',
  ],
  vertical: [
    'Watch “Tension now”: it is largest at the bottom and smallest at the top. Why?',
    'Lower the speed below √(gr) and watch the string go slack near the top.',
    'Try the bucket preset: at the bottom the rope must hold the weight and supply mv²/r.',
  ],
  conical: [
    'Change the mass: the angle, speed and time per turn stay the same — only the tension changes.',
    'Turn on “Resolve T”: T cos θ balances the weight, and T sin θ is the centripetal force.',
    'Increase θ: the circle widens, the mass speeds up and each turn takes less time.',
  ],
};

const VARIABLES: Record<CircularMode, { symbol: string; name: string; def: string }[]> = {
  horizontal: [
    { symbol: 'r', name: 'Radius', def: 'Distance from the centre of the circle to the mass, in metres (m).' },
    { symbol: 'v', name: 'Speed', def: 'Distance round the circle each second (m/s). The direction keeps changing, so the velocity does too.' },
    { symbol: 't', name: 'Time for one turn', def: 'The period of the motion, in seconds (s). One turn covers the circumference, 2πr.' },
    { symbol: 'T', name: 'Tension', def: 'The pull of the string, in newtons (N). Here it is the only horizontal force, so it is the centripetal force.' },
    { symbol: 'F', name: 'Centripetal force', def: 'The resultant force towards the centre that keeps the mass on the circle: F = mv²/r.' },
  ],
  vertical: [
    { symbol: 'v', name: 'Speed', def: 'Kept constant here, as in the questions (imagine a motor turning the string).' },
    { symbol: 'T', name: 'Tension', def: 'Pull of the string towards the centre, in newtons (N). It changes as the mass goes round.' },
    { symbol: 'mg', name: 'Weight', def: 'Always straight down: it adds to the centripetal force at the top and works against it at the bottom.' },
    { symbol: 'F', name: 'Centripetal force', def: 'The resultant force towards the centre, mv²/r. It is the same size all the way round.' },
    { symbol: '√gr', name: 'Minimum speed', def: 'At the top, if mv²/r is less than mg, gravity alone is too much and the string goes slack.' },
  ],
  conical: [
    { symbol: 'L', name: 'String length', def: 'From the pivot to the centre of the mass, in metres (m).' },
    { symbol: 'θ', name: 'Angle to the vertical', def: 'The string sweeps out a cone; θ is the angle between the string and the vertical axis.' },
    { symbol: 'r', name: 'Radius', def: 'Radius of the horizontal circle, r = L sin θ.' },
    { symbol: 'h', name: 'Height', def: 'Height of the pivot above the circle, h = L cos θ. The period depends only on h: 2π√(h/g).' },
    { symbol: 'T', name: 'Tension', def: 'Along the string. Its vertical part holds up the weight; its horizontal part is the centripetal force.' },
  ],
};

function TensionGraph({
  mass,
  r,
  v,
  markerRef,
  graphRef,
}: {
  mass: number;
  r: number;
  v: number;
  markerRef: React.RefObject<SVGCircleElement>;
  graphRef: React.MutableRefObject<{ x: (phi: number) => number; y: (t: number) => number } | null>;
}) {
  const W = 320;
  const H = 150;
  const left = 38;
  const right = 8;
  const top = 10;
  const bottom = 26;
  const c = verticalCircle(mass, r, v);
  const lo = Math.min(0, c.tensionTop);
  const hi = c.tensionBottom;
  const step = niceStep((hi - lo) / 4);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const x = (phi: number) => left + (phi / (2 * Math.PI)) * (W - left - right);
  const y = (t: number) => top + ((yMax - t) / (yMax - yMin || 1)) * (H - top - bottom);
  graphRef.current = { x, y };

  const pts: string[] = [];
  const slackPts: string[][] = [];
  let run: string[] | null = null;
  for (let i = 0; i <= 120; i++) {
    const phi = (i / 120) * Math.PI * 2;
    const t = verticalTensionAt(mass, r, v, phi);
    const pt = `${x(phi).toFixed(1)},${y(t).toFixed(1)}`;
    pts.push(pt);
    if (t < 0) {
      if (!run) slackPts.push((run = []));
      run.push(pt);
    } else run = null;
  }
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t += step) ticks.push(t);

  return (
    <figure className="mb-4">
      <figcaption className="text-[12px] font-semibold text-[#1b2a41] mb-1">Tension round the circle</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graph of string tension against position round the vertical circle">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#1b2a41' : '#eee6d3'} strokeWidth={t === 0 ? 1 : 0.8} />
            <text x={left - 5} y={y(t) + 3.5} textAnchor="end" fontSize="9.5" fill="#4a5a72" fontFamily="ui-monospace, monospace">
              {sig(t)}
            </text>
          </g>
        ))}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI].map((phi, i) => (
          <text key={phi} x={x(phi)} y={H - 10} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} fontSize="9.5" fill="#4a5a72">
            {['bottom', 'side', 'top', 'side', 'bottom'][i]}
          </text>
        ))}
        <text x={4} y={top + 4} fontSize="9.5" fill="#4a5a72" transform={`rotate(-90 4 ${top + 4})`} textAnchor="end">
          T / N
        </text>
        <polyline points={pts.join(' ')} fill="none" stroke="#7a4a8f" strokeWidth={2} />
        {slackPts.map((run, i) => (
          <polyline key={i} points={run.join(' ')} fill="none" stroke="#b34a3c" strokeWidth={2.5} />
        ))}
        <circle ref={markerRef} r={4.5} fill="#7a4a8f" stroke="#fff" strokeWidth={1.5} cx={x(0)} cy={y(c.tensionBottom)} />
      </svg>
      <p className="text-[11px] text-[#4a5a72] leading-snug">
        The dot follows the mass. Below the zero line the string would have to push, which it cannot, so it goes slack.
      </p>
    </figure>
  );
}

function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  dp = 2,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  dp?: number;
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
      <span className="font-mono text-[13px] w-[76px] sm:w-20 text-right whitespace-nowrap">
        {value.toFixed(dp)} {unit}
      </span>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${
        on ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-transparent text-[#1b2a41] border-[#d8cfb6] hover:bg-[#f5f0e2]'
      }`}
    >
      {on ? '✓ ' : ''}
      {label}
    </button>
  );
}

function Readout({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div className="bg-[#faf7f0] border border-[#eee6d3] rounded px-3 py-2.5">
      <div className="text-[11px] text-[#4a5a72] mb-1 leading-tight">{label}</div>
      <div className={`font-mono font-bold ${small ? 'text-base' : 'text-xl'}`} style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="italic text-[20px] text-[#8f6428]" style={{ fontFamily: 'Georgia, serif' }}>
      {children}
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
