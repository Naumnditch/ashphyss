'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Imported directly (not through next/dynamic, which drops refs): RevealDeck
// only loads reveal.js itself inside an effect, so this is safe to render on the server.
import { RevealDeck, type RevealDeckState } from '@/components/reveal/RevealDeck';
import { useRevealDeck } from '@/components/reveal/useRevealDeck';
import { getGlossaryEntry } from '@/lib/equation-stage/glossary';
import { GlossaryOverlay, type GlossaryEntry } from '@/components/equation-stage/GlossaryOverlay';
import { EQUATIONS, evalSide, isolateSteps, mirror, renderSideText, type EqState, type Move } from './rearranger/algebra';
import { TARGET_COLOR, VAR_COLORS } from './rearranger/palette';
import { operateCaption, plainCaption } from './rearranger/captions';
import { symbolTex } from './rearranger/texFromState';
import type { HoverHit, RearrangerScene } from './rearranger/RearrangerScene';

/**
 * Equation Rearranger, as a Manim-style lesson film you can steer.
 *
 * The equations are typeset by MathJax (Computer Modern, like a Manim
 * render) and drawn with three.js (lib/manim); every step is animated with
 * ports of Manim's own animations and rate functions — Write,
 * TransformMatchingTex, Indicate, Create, Circumscribe-style strikes,
 * SurroundingRectangle and Flash — by rearranger/RearrangerScene.ts.
 * reveal.js still owns the step navigation: each step of a derivation is
 * one fragment, so Next, Back, the arrow keys and the chapter timeline all
 * move through the same deck. The algebra (rearranger/algebra.ts) is the
 * verified engine this lesson has always used.
 */

type Tab = 'basic' | 'advanced';

function stepText(move: Move): string {
  switch (move.kind) {
    case 'root':
      return 'Square-root both sides';
    case 'square':
      return 'Square both sides';
    case 'negate':
      return 'Multiply both sides by −1';
    case 'additive':
      return move.movedGroup!.sign > 0 ? `Subtract ${move.symbol} from both sides` : `Add ${move.symbol} to both sides`;
    default:
      return move.op === 'divide' ? `Divide both sides by ${move.symbol}` : `Multiply both sides by ${move.symbol}`;
  }
}

const SPEEDS = [0.5, 1, 1.5, 2];

export function EquationRearrangerSimulator() {
  const [tab, setTab] = useState<Tab>('basic');
  const [eqIdx, setEqIdx] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [baseState, setBaseState] = useState<EqState>(EQUATIONS[0].initial);
  const [moves, setMoves] = useState<Move[]>([]);
  const [finalIsLeft, setFinalIsLeft] = useState(true);
  const [step, setStep] = useState(-1);
  const [animating, setAnimating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [hover, setHover] = useState<HoverHit | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [symbolSvgs, setSymbolSvgs] = useState<Record<string, string>>({});
  const [sampleVals, setSampleVals] = useState<Record<string, number>>(EQUATIONS[0].sample);
  const [glossary, setGlossary] = useState<{ entry: GlossaryEntry; anchorEl: HTMLElement; isTarget: boolean } | null>(null);
  const [announce, setAnnounce] = useState('');

  const eq = EQUATIONS[eqIdx];
  const total = moves.length + (finalIsLeft ? 0 : 1);
  const done = target !== null && step === total - 1 && !animating;

  // The stage lives inside the reveal.js deck, which mounts after a dynamic import: wait for it.
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RearrangerScene | null>(null);
  const deck = useRevealDeck();
  const prevFragment = useRef(-1);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const eqIdxRef = useRef(eqIdx);
  eqIdxRef.current = eqIdx;

  const settledState = useCallback(
    (f: number): EqState => {
      if (f < 0) return baseState;
      if (f < moves.length) return moves[f].stateAfter;
      const last = moves.length ? moves[moves.length - 1].stateAfter : baseState;
      return finalIsLeft ? last : mirror(last);
    },
    [baseState, moves, finalIsLeft]
  );

  // ── Scene ────────────────────────────────────────────────────────────
  const pickRef = useRef<(symbol: string) => void>(() => {});

  useEffect(() => {
    if (!stageEl) return;
    let cancelled = false;
    import('./rearranger/RearrangerScene')
      .then(async ({ RearrangerScene }) => {
        if (cancelled) return;
        const scene = await RearrangerScene.create(stageEl, {
          onHover: setHover,
          onPick: (s) => pickRef.current(s),
        });
        if (cancelled) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          scene.setSpeed(2);
          setSpeed(2);
        }
        const p: Record<string, string> = {};
        const sy: Record<string, string> = {};
        for (const e of EQUATIONS) {
          p[e.id] = scene.previewSvg(e.initial);
          e.vars.forEach((v) => (sy[v.symbol] ??= scene.symbolSvg(v.symbol)));
        }
        setPreviews(p);
        setSymbolSvgs(sy);
        setStatus('ready');
        scene.showEquation(EQUATIONS[eqIdxRef.current], EQUATIONS[eqIdxRef.current].initial, { intro: true });
      })
      .catch((err) => {
        console.error(err);
        setStatus('failed');
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [stageEl]);

  // ── Choosing what to solve for ───────────────────────────────────────
  const solveFor = useCallback(
    (symbol: string) => {
      const scene = sceneRef.current;
      if (!scene || animating) return;
      // Continue from whatever is on screen: the original, or the last answer.
      const from = settledState(step);
      const { moves: m, finalIsLeft: fl } = isolateSteps(from, symbol);
      const n = m.length + (fl ? 0 : 1);
      setBaseState(from);
      setMoves(m);
      setFinalIsLeft(fl);
      setTarget(symbol);
      setStep(-1);
      prevFragment.current = -1;
      setPlaying(false);
      setFrozen(false);
      scene.setPaused(false);
      scene.chooseTarget(symbol, n);
      setAnnounce(n === 0 ? `${symbol} is already on its own.` : `Solving for ${symbol} in ${n} step${n === 1 ? '' : 's'}.`);
    },
    [animating, settledState, step]
  );
  pickRef.current = solveFor;

  // The deck's fragments follow the derivation's steps.
  useEffect(() => {
    deck.syncFragments(0);
    deck.goTo(0, -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, finalIsLeft, target]);

  // ── Stepping ─────────────────────────────────────────────────────────
  const playForward = useCallback(
    async (f: number) => {
      const scene = sceneRef.current;
      if (!scene || !target) return;
      setAnimating(true);
      scene.pickable = false;
      setStep(f);
      let ok: boolean;
      if (f < moves.length) {
        setAnnounce(`Step ${f + 1}: ${stepText(moves[f])}.`);
        ok = await scene.playMove(moves[f], f === 0 ? baseState : moves[f - 1].stateAfter, target);
      } else {
        setAnnounce(`Step ${f + 1}: swap the sides.`);
        const last = moves.length ? moves[moves.length - 1].stateAfter : baseState;
        ok = await scene.playFlip(last, mirror(last), target);
      }
      if (!ok) return;
      const last = f === total - 1;
      if (last) {
        ok = await scene.finale(target);
        if (!ok) return;
        setAnnounce(`Solved for ${target}.`);
        setPlaying(false);
      }
      setAnimating(false);
      scene.pickable = true;
      if (!last && playingRef.current) {
        if (await scene.stage.wait(0.6).then(() => playingRef.current)) deck.next();
      }
    },
    [target, moves, baseState, total, deck]
  );

  const snapTo = useCallback(
    (f: number) => {
      const scene = sceneRef.current;
      if (!scene || !target) return;
      setStep(f);
      setAnimating(false);
      setFrozen(false);
      scene.setPaused(false);
      scene.pickable = true;
      const sym = [{ symbol: target, tex: symbolTex(target) }];
      const caption =
        f === total - 1
          ? plainCaption('Solved for {0}', sym)
          : f < 0
            ? plainCaption(`Solve for {0}: ${total} step${total === 1 ? '' : 's'}`, sym)
            : f < moves.length
              ? operateCaption(moves[f])
              : plainCaption('Swap the sides, so {0} is on the left', sym);
      scene.showEquation(eq, settledState(f), { intro: false, target, caption, solved: f === total - 1 });
    },
    [target, total, moves, eq, settledState]
  );

  const onDeckState = useCallback(
    (s: RevealDeckState) => {
      deck.onStateChange(s);
      const prev = prevFragment.current;
      prevFragment.current = s.fragmentIndex;
      if (s.fragmentIndex === prev || !target) return;
      if (s.fragmentIndex === prev + 1) playForward(s.fragmentIndex);
      else snapTo(s.fragmentIndex);
    },
    [deck, target, playForward, snapTo]
  );

  // ── Transport ────────────────────────────────────────────────────────
  const togglePlay = () => {
    const scene = sceneRef.current;
    if (!scene || !target || total === 0) return;
    if (playing) {
      setPlaying(false);
      if (animating) {
        scene.setPaused(true);
        setFrozen(true);
      }
      return;
    }
    setPlaying(true);
    playingRef.current = true;
    if (frozen) {
      scene.setPaused(false);
      setFrozen(false);
      return;
    }
    if (animating) return;
    if (done) {
      // Replay from the top: back to the start (the deck snaps the stage there), then play on.
      deck.goTo(0, -1);
      setTimeout(() => deck.next(), 450);
      return;
    }
    deck.next();
  };

  const stepNext = () => {
    if (animating || !target) return;
    deck.next();
  };
  const stepPrev = () => {
    if (!target) return;
    setPlaying(false);
    deck.prev();
  };
  const jumpTo = (f: number) => {
    if (!target) return;
    setPlaying(false);
    deck.goTo(0, f);
  };

  const changeSpeed = (k: number) => {
    setSpeed(k);
    sceneRef.current?.setSpeed(k);
  };

  const fullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const onPlayerKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'f') {
      fullscreen();
    }
  };

  // ── Changing equation ────────────────────────────────────────────────
  const switchEquation = (i: number) => {
    setEqIdx(i);
    setTarget(null);
    setMoves([]);
    setFinalIsLeft(true);
    setStep(-1);
    prevFragment.current = -1;
    setBaseState(EQUATIONS[i].initial);
    setSampleVals(EQUATIONS[i].sample);
    setPlaying(false);
    setFrozen(false);
    setAnimating(false);
    const scene = sceneRef.current;
    if (scene) {
      scene.setPaused(false);
      scene.pickable = true;
      scene.showEquation(EQUATIONS[i], EQUATIONS[i].initial, { intro: true });
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    switchEquation(EQUATIONS.findIndex((e) => e.category === t));
  };

  const reset = () => switchEquation(eqIdx);

  const openGlossary = (symbol: string, anchorEl: HTMLElement) => {
    const v = eq.vars.find((x) => x.symbol === symbol);
    if (!v) return;
    setGlossary({ entry: getGlossaryEntry(eq.id, symbol, v.name, v.unit), anchorEl, isTarget: symbol === target });
  };

  // ── Verify panel ─────────────────────────────────────────────────────
  const finalSettled = settledState(total - 1);
  const answerSide = finalSettled.right;
  const rearrangedVal = target ? evalSide(answerSide, sampleVals) : 0;
  const checkVals = { ...sampleVals, [target || '']: rearrangedVal };
  const origLeftVal = target ? evalSide(eq.initial.left, checkVals) : 0;
  const origRightVal = target ? evalSide(eq.initial.right, checkVals) : 0;
  const balances = target ? Math.abs(origLeftVal - origRightVal) < 1e-6 * Math.max(1, Math.abs(origLeftVal)) : false;
  const otherKeys = eq.vars.map((v) => v.symbol).filter((s) => s !== target);

  const steps = useMemo(() => [...moves.map(stepText), ...(finalIsLeft ? [] : ['Swap the sides'])], [moves, finalIsLeft]);
  const visibleEquations = EQUATIONS.filter((e) => e.category === tab);
  const hoverVar = hover ? eq.vars.find((v) => v.symbol === hover.symbol) : null;
  const varColor = (symbol: string) => (symbol === target ? TARGET_COLOR : VAR_COLORS[eq.vars.findIndex((v) => v.symbol === symbol) % VAR_COLORS.length]);

  return (
    <div className="equation-rearranger flex flex-col gap-5">
      <div className="rounded-2xl bg-[#101114] text-[#e8e6e1] shadow-[0_24px_60px_-24px_rgba(15,17,20,0.65)] ring-1 ring-black/40 overflow-hidden">
        {/* ---- Header: tabs and equation picker ---- */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8b8f98]">{eq.name}</span>
            {eq.tier && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${eq.tier === 'Beyond IGCSE' ? 'bg-[#3a2622] text-[#f2a38f]' : 'bg-[#1d3530] text-[#8fdcc5]'}`}
              >
                {eq.tier}
              </span>
            )}
          </div>
          <div className="flex bg-[#1a1c21] rounded-full p-0.5 ring-1 ring-white/5" role="tablist" aria-label="Equation set">
            {(['basic', 'advanced'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => switchTab(t)}
                className={`text-[12px] font-semibold px-3.5 py-1 rounded-full transition-colors ${tab === t ? 'bg-[#e8e6e1] text-[#101114]' : 'text-[#a9adb6] hover:text-white'}`}
              >
                {t === 'basic' ? 'Basic' : 'Advanced'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-5 py-3.5 scrollbar-thin" aria-label="Choose an equation">
          {visibleEquations.map((e) => {
            const i = EQUATIONS.indexOf(e);
            const active = i === eqIdx;
            return (
              <button
                key={e.id}
                onClick={() => switchEquation(i)}
                title={e.name}
                className={`shrink-0 h-10 px-3 rounded-lg border transition-colors flex items-center ${
                  active ? 'bg-[#1f232b] border-[#58C4DD]/70 text-white' : 'bg-[#16181c] border-white/5 text-[#c9ccd2] hover:border-white/20'
                }`}
              >
                {previews[e.id] ? (
                  <span className="text-[15px] leading-none [&_svg]:max-h-[30px]" dangerouslySetInnerHTML={{ __html: previews[e.id] }} />
                ) : (
                  <span className="text-[12.5px] font-serif italic">
                    {renderSideText(e.initial.left)} = {renderSideText(e.initial.right)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ---- Player + steps ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_272px] gap-0 border-t border-white/5">
          <RevealDeck ref={deck.ref} onStateChange={onDeckState} className="rearranger-deck">
            <section>
              {Array.from({ length: total }).map((_, fi) => (
                // eslint-disable-next-line react/no-array-index-key
                <span className="fragment" key={fi} />
              ))}
              <div ref={playerRef} className="relative bg-black select-none [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center" onKeyDown={onPlayerKey}>
                <div ref={setStageEl} className="relative w-full aspect-video" role="img" aria-label={`${eq.name}: ${renderSideText(settledState(step).left)} = ${renderSideText(settledState(step).right)}`} />
                {status !== 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#8b8f98]">
                    {status === 'loading' ? 'Typesetting…' : 'This lesson needs WebGL, which your browser has turned off.'}
                  </div>
                )}
                {hover && hoverVar && !animating && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-[#1b1d22]/95 ring-1 ring-white/10 px-2.5 py-1.5 text-[12px] leading-tight shadow-lg"
                    style={{ left: hover.x, top: hover.y - 10 }}
                  >
                    <span className="font-semibold" style={{ color: varColor(hover.symbol) }}>
                      {hoverVar.name}
                    </span>{' '}
                    <span className="text-[#8b8f98]">({hoverVar.unit})</span>
                    <div className="text-[#a9adb6] text-[11px] mt-0.5">{hover.symbol === target && done ? 'already solved for' : 'click to solve for it'}</div>
                  </div>
                )}
                {status === 'ready' && target && total > 0 && step === -1 && !animating && !playing && (
                  <button
                    onClick={togglePlay}
                    aria-label="Play the derivation"
                    className="absolute left-1/2 top-[80%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur ring-1 ring-white/20 flex items-center justify-center transition"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5 fill-white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}

                {/* Transport */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-[#0c0d10] border-t border-white/5">
                  <IconButton label="Previous step" onClick={stepPrev} disabled={!target || step < 0}>
                    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                  </IconButton>
                  <IconButton label={playing ? 'Pause' : 'Play'} onClick={togglePlay} disabled={!target || total === 0} big>
                    {playing ? <path d="M6 5h4v14H6zm8 0h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
                  </IconButton>
                  <IconButton label="Next step" onClick={stepNext} disabled={!target || animating || step >= total - 1}>
                    <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
                  </IconButton>
                  <div className="flex-1 flex items-center gap-1 min-w-0 mx-1" aria-label="Steps">
                    {target && total > 0 ? (
                      steps.map((label, i) => (
                        <button
                          key={i}
                          onClick={() => jumpTo(i)}
                          title={`${i + 1}. ${label}`}
                          className="group flex-1 h-5 flex items-center"
                          aria-label={`Jump to step ${i + 1}: ${label}`}
                        >
                          <span
                            className={`block w-full h-[5px] rounded-full transition-colors ${
                              i < step || (i === step && !animating) ? 'bg-[#FFFF00]' : i === step ? 'bg-[#FFFF00]/60 animate-pulse' : 'bg-white/15 group-hover:bg-white/30'
                            }`}
                          />
                        </button>
                      ))
                    ) : (
                      <span className="text-[11.5px] text-[#6f737c] truncate">Click a variable in the equation to solve for it</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[#8b8f98] tabular-nums whitespace-nowrap hidden sm:inline">
                    {target && total > 0 ? `${Math.max(step + 1, 0)} / ${total}` : ''}
                  </span>
                  <select
                    value={speed}
                    onChange={(e) => changeSpeed(Number(e.target.value))}
                    aria-label="Playback speed"
                    className="bg-transparent text-[11.5px] font-mono text-[#c9ccd2] border border-white/10 rounded px-1 py-0.5 focus:outline-none"
                  >
                    {SPEEDS.map((k) => (
                      <option key={k} value={k} className="bg-[#101114]">
                        {k}×
                      </option>
                    ))}
                  </select>
                  <IconButton label="Full screen" onClick={fullscreen}>
                    <path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 4v-4h2v6h-6v-2z" />
                  </IconButton>
                </div>
              </div>
            </section>
          </RevealDeck>

          {/* Steps panel */}
          <aside className="border-t lg:border-t-0 lg:border-l border-white/5 bg-[#121317] p-4 flex flex-col gap-3">
            <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[#8b8f98]">
              {target ? (
                <>
                  Solving for <span className="normal-case" style={{ color: TARGET_COLOR }}>{target}</span>
                </>
              ) : (
                'Pick a variable'
              )}
            </div>
            {target ? (
              total === 0 ? (
                <p className="text-[12.5px] text-[#c9ccd2]">{target} is already on its own. Pick another variable.</p>
              ) : (
                <ol className="space-y-1">
                  {steps.map((label, i) => (
                    <li key={i}>
                      <button
                        onClick={() => jumpTo(i)}
                        className={`w-full text-left flex gap-2.5 items-start rounded-md px-2 py-1.5 text-[12.5px] leading-snug transition-colors ${
                          i === step ? 'bg-white/[0.07] text-white' : i < step ? 'text-[#c9ccd2] hover:bg-white/[0.04]' : 'text-[#7d818a] hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className={`font-mono text-[11px] mt-px ${i <= step ? 'text-[#FFFF00]' : 'text-[#5d6169]'}`}>{String(i + 1).padStart(2, '0')}</span>
                        <span>{label}</span>
                      </button>
                    </li>
                  ))}
                  <li className={`px-2 py-1.5 text-[12.5px] ${done ? 'text-[#83C167]' : 'text-[#5d6169]'}`}>{done ? '✓ Solved' : 'Solved'}</li>
                </ol>
              )
            ) : (
              <p className="text-[12.5px] leading-relaxed text-[#a9adb6]">
                Click any variable in the equation — or below — and the film works out how to get it on its own, one legal move at a time.
              </p>
            )}
            <div className="mt-auto pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
              {eq.vars.map((v) => (
                <span key={v.symbol} className="inline-flex items-center rounded-full bg-[#1a1c21] ring-1 ring-white/5 overflow-hidden">
                  <button
                    onClick={() => solveFor(v.symbol)}
                    disabled={animating}
                    className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5 text-[12px] hover:bg-white/5 disabled:opacity-50"
                    title={`Solve for ${v.name}`}
                  >
                    <span
                      className="[&_svg]:h-[1.05em] [&_svg]:w-auto inline-flex"
                      style={{ color: varColor(v.symbol) }}
                      dangerouslySetInnerHTML={{ __html: symbolSvgs[v.symbol] ?? v.symbol }}
                    />
                    <span className="text-[#c9ccd2]">{v.name}</span>
                  </button>
                  <button
                    onClick={(e) => openGlossary(v.symbol, e.currentTarget)}
                    className="px-1.5 py-1 text-[11px] text-[#8b8f98] hover:text-white hover:bg-white/5 border-l border-white/5"
                    aria-label={`What is ${v.name}?`}
                  >
                    ⓘ
                  </button>
                </span>
              ))}
            </div>
            {target && (
              <button onClick={reset} className="text-[11.5px] text-[#8b8f98] hover:text-white self-start">
                ↺ Back to the original equation
              </button>
            )}
          </aside>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      {/* ---- Notebook row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">The Golden Rule</span>
          <div className="mt-2.5 space-y-2.5 text-[12.5px] text-[#4a5a72] leading-snug">
            <p>
              <strong className="text-[#1b2a41]">Whatever you do to one side, you must do to the other.</strong> Watch the operation appear on
              both sides at once — a real new fraction or a real new term, not a floating label.
            </p>
            <p>
              The pieces that cancel flash <span className="font-semibold text-[#c0392b]">red</span> and are struck through, with the reason
              written above (m/m = 1). Then everything else slides into the simplified equation.
            </p>
            <p>
              The variable you are solving for is <span className="font-semibold text-[#b59f00]">yellow</span> throughout; every other variable
              keeps its own colour, and constants (G, k, π, ½, ε₀, c) are grey.
            </p>
            <p>
              <strong className="text-[#1b2a41]">Play</strong> runs the whole derivation like a film; <strong className="text-[#1b2a41]">Next</strong> takes
              one step at a time. Space pauses, ← → step, F goes full screen. Click a step to jump straight to it.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">Try This</span>
          <div className="mt-2 space-y-2.5 text-[12px] text-[#4a5a72] leading-snug">
            {tab === 'basic' ? (
              <>
                <p>
                  <strong className="text-[#1b2a41]">1.</strong> Click a in F = ma. Both sides are divided by m; the two m&rsquo;s cancel, leaving a on
                  its own.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">2.</strong> Switch to ρ = m/V and click V. V climbs out of the denominator first, then ρ is
                  cleared the same way — two moves, in the right order.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">3.</strong> When a derivation finishes, click a different variable: it carries on from what is on
                  screen.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong className="text-[#1b2a41]">1.</strong> Click r in F = GMm/r². r² lifts into the numerator, the rest clears away, and it
                  finishes with a real square root of both sides.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">2.</strong> Click L in the pendulum equation T = 2π√(L/g): divide by 2π, square both sides to
                  remove the root, then clear g.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">3.</strong> Try V₁/V₂ = N₁/N₂ or p₁V₁ = p₂V₂: cross-multiplying, one legal move at a time.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          {target && total >= 0 ? (
            <>
              <div className="bg-gradient-to-br from-[#fbf5e8] to-[#f6efdc] border border-[#e6d9b8] rounded px-4 py-3.5 text-center mb-3">
                <div className="italic text-[19px] text-[#8f6428]" style={{ fontFamily: 'Georgia, serif' }}>
                  {target} = {renderSideText(answerSide)}
                </div>
                <div className="italic text-[12.5px] text-[#8f6428] mt-1.5" style={{ fontFamily: 'Georgia, serif' }}>
                  {eq.name}
                </div>
              </div>
              {done && (
                <div className="bg-[#faf7f0] border border-[#eee6d3] rounded-lg p-3 mb-1">
                  <div className="font-mono text-[10.5px] tracking-wide uppercase text-[#4a5a72] mb-2">Verify — plug the answer back in</div>
                  <div className="flex flex-wrap gap-2.5 mb-2">
                    {otherKeys.map((k) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="text-[11.5px] font-mono text-[#4a5a72]">{k}=</span>
                        <input
                          type="number"
                          value={sampleVals[k]}
                          onChange={(e) => setSampleVals({ ...sampleVals, [k]: parseFloat(e.target.value) || 0 })}
                          className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-[11.5px] font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-[12px] text-[#4a5a72]">
                    {target} works out to <span className="font-mono font-bold text-[#1b2a41]">{rearrangedVal.toExponential(4)}</span> — original equation:{' '}
                    <span className="font-mono">{origLeftVal.toExponential(4)}</span> vs <span className="font-mono">{origRightVal.toExponential(4)}</span>
                  </div>
                  <div className={`mt-1 text-[11.5px] font-semibold ${balances ? 'text-[#2e7d6b]' : 'text-[#b34a3c]'}`}>
                    {balances ? '✓ Balances, for any values you try.' : 'Should balance — try different numbers.'}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="italic text-[22px] text-[#8f6428] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                {renderSideText(eq.initial.left)} = {renderSideText(eq.initial.right)}
              </div>
              <p className="text-[12px] text-[#4a5a72]">Click a variable to watch it isolate.</p>
            </div>
          )}
          <h2 className="font-mono text-[13px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3 mt-3">What Each Variable Means</h2>
          <div className="space-y-2">
            {eq.vars.map((v) => (
              <div key={v.symbol} className="flex gap-2.5 items-start">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded bg-[#faf7f0] border border-[#eee6d3] flex items-center justify-center text-[14px] font-bold italic text-[#8f6428]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {v.symbol}
                </div>
                <p className="text-[11.5px] text-[#4a5a72] leading-snug">
                  <strong className="text-[#1b2a41]">{v.name}</strong> ({v.unit})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {glossary && <GlossaryOverlay entry={glossary.entry} anchorEl={glossary.anchorEl} isTarget={glossary.isTarget} onClose={() => setGlossary(null)} />}
    </div>
  );
}

function IconButton({ label, onClick, disabled, big, children }: { label: string; onClick: () => void; disabled?: boolean; big?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-full flex items-center justify-center text-white transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 ${big ? 'w-9 h-9 bg-white/10' : 'w-8 h-8'}`}
    >
      <svg viewBox="0 0 24 24" className={`${big ? 'w-5 h-5' : 'w-4 h-4'} fill-current`}>
        {children}
      </svg>
    </button>
  );
}
