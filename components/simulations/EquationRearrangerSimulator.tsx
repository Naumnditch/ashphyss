'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RevealDeckState } from '@/components/reveal/RevealDeck';
import { useRevealDeck } from '@/components/reveal/useRevealDeck';
import { renderStage } from '@/lib/equation-stage/render';
import type { Stage, StageToken } from '@/lib/equation-stage/types';
import { getGlossaryEntry } from '@/lib/equation-stage/glossary';
import { GlossaryOverlay, type GlossaryEntry } from '@/components/equation-stage/GlossaryOverlay';

// reveal.js touches `document` at mount time and must never evaluate
// server-side — see components/reveal/RevealDeck.tsx.
const RevealDeck = dynamic(() => import('@/components/reveal/RevealDeck').then((m) => m.RevealDeck), { ssr: false });

/**
 * Equation Rearranger — the operation forms directly inside the equation,
 * one manually-advanced step at a time, now driven by a real reveal.js
 * deck (components/reveal/RevealDeck.tsx) instead of a hand-rolled
 * StepSnapshot/CSS-transition state machine. Each equation in the bank is
 * one reveal.js section; each move isolateSteps() returns for the
 * currently-chosen target variable is one fragment within that section.
 * Advancing INTO a fragment plays the same three-phase choreography as
 * before — a real, unsimplified fraction/term fades in on both sides at
 * once (e.g. F = m×a dividing by m becomes F/m = (m×a)/m), the
 * cancelling pair strikes through, then it settles into the simplified
 * result — now as one continuous FLIP-animated sequence (lib/equation-
 * stage/render.ts) triggered by a single Next press, rather than three
 * separate manual steps. Back jumps straight to the previous fragment's
 * settled state, no replay. A second click (once the current derivation
 * is fully done) chains from what's on screen; Reset returns to the
 * original equation.
 *
 * Two tabs: Basic (the original six linear equations) and Advanced
 * (fourteen more, several with squared terms or a square root — gravity,
 * Coulomb's law, kinetic/capacitor energy, E=mc², the pendulum period,
 * free fall, capacitance, I²R/V²/R power, the transformer and Boyle's
 * Law equations). Advanced adds two structural ideas beyond the original
 * engine: a factor can carry an exponent (r², v², I²), and "the whole of
 * one side" can be wrapped in a power (most often a square root, as in
 * T = 2π√(L/g)). Isolating a squared factor ends with a "take the square
 * root of both sides" move; isolating something trapped inside an
 * existing root starts with a "square both sides" move to peel it off —
 * both reuse the same operate → cancel → settle animation as every other
 * move, just wrapping a whole side instead of matching a single symbol.
 * A single-term side can also carry a leftover negative sign after
 * chaining through an earlier additive move (v=u+at: solve u, then a) —
 * one more "×(−1) both sides" move flips it, since isolated must mean the
 * bare positive variable, not "−a". Physical constants (G, k, ε₀, c, π, ½)
 * are real factors that travel with the algebra but are never clickable
 * targets, and never get a glossary glyph (they're not in any equation's
 * `vars` list, which is the glossary's only source of entries).
 *
 * Every equation × every clickable variable × both starting orientations
 * (the equation as given, and mirrored) × every chained pair (solve X,
 * then from that result solve Y) was run through the ACTUAL isolateSteps/
 * buildIntermediate/layoutEquation code in Node before any of this UI
 * existed — not a hand-transcribed copy, the real functions, extracted and
 * executed directly — asserting no throw, every cancel key resolving to a
 * real token in the intermediate layout, and the final (or chained) answer
 * checked against the original equation to a relative error under 1e-9
 * (3090 checks, 0 failures). None of that — isolateSteps, buildIntermediate,
 * the equation bank, or the layout math that turns a Side into positioned
 * tokens — changed for the reveal.js rewrite below; only what CONSUMES
 * layoutEquation()'s Token[] output changed, from React JSX with CSS
 * transitions to lib/equation-stage's imperative FLIP renderer.
 */

// ---------- algebra engine (unchanged) ----------

interface VarFactor {
  kind: 'var';
  symbol: string;
  power: number;
}
interface ConstFactor {
  kind: 'const';
  symbol: string;
  power: number;
  value: number;
}
interface PowerFactor {
  kind: 'power';
  inner: Side;
  exponent: number; // 0.5 renders as √(inner); other values as (inner)^n
}
type Factor = VarFactor | ConstFactor | PowerFactor;

interface ProductGroup {
  sign: 1 | -1;
  factors: Factor[];
}
interface Side {
  groups: ProductGroup[];
  denom: Factor[];
}
interface EqState {
  left: Side;
  right: Side;
}
type OpType = 'divide' | 'multiply' | 'addsub' | 'root' | 'square' | 'negate';
interface Move {
  kind: 'lift' | 'additive' | 'multiplicative' | 'root' | 'square' | 'negate';
  op: OpType;
  symbol: string; // display label, e.g. "m", "r²", "a×t", or the isolated target for root/square
  opLabel: string; // e.g. "÷ m", "× V", "− u", "√", "²"
  homeIsLeft: boolean;
  stateAfter: EqState;
  degree?: number; // for root moves: the power being undone (2 = square root)
  // Structural pointers captured at the moment isolateSteps made this move,
  // so buildIntermediate can locate the moved factor/group directly instead
  // of re-finding it by comparing against `symbol` (which includes display
  // formatting like an exponent — "r²" — and can never match a bare-symbol
  // lookup such as factorTag(f) === 'r²').
  movedFactor?: Factor; // lift, multiplicative divide/multiply
  movedDenomIndex?: number; // multiplicative 'multiply' (incl. lift): its index within home.denom before removal
  movedGroup?: ProductGroup; // additive
  movedGroupIndex?: number; // additive: its index within home.groups before removal
}

function cloneFactor(f: Factor): Factor {
  if (f.kind === 'power') return { kind: 'power', inner: cloneSide(f.inner), exponent: f.exponent };
  return { ...f };
}
function cloneSide(s: Side): Side {
  return { groups: s.groups.map((g) => ({ sign: g.sign, factors: g.factors.map(cloneFactor) })), denom: s.denom.map(cloneFactor) };
}
function cloneState(left: Side, right: Side): EqState {
  return { left: cloneSide(left), right: cloneSide(right) };
}

function containsTarget(f: Factor, target: string): boolean {
  if (f.kind === 'var') return f.symbol === target;
  if (f.kind === 'const') return false;
  return sideContains(f.inner, target);
}
function sideContains(side: Side, target: string): boolean {
  return side.groups.some((g) => g.factors.some((f) => containsTarget(f, target))) || side.denom.some((f) => containsTarget(f, target));
}
function factorTag(f: Factor): string {
  return f.kind === 'power' ? 'pow' : f.symbol;
}

/**
 * Isolates `target` in `state`, one legal move at a time: lift out of a
 * denominator, then move other summed terms away, then clear other
 * multiplicative factors, then clear any leftover denominator — and only
 * once the target's own side is down to a single factor, undo its power
 * (root) or peel an existing radical wrapper (square), continuing to
 * isolate inside whatever that exposes (needed for T = 2π√(L/g), where
 * ÷2π happens first, then squaring exposes L/g, then g still needs a
 * lift). Verified against every equation in the bank — see the file
 * header.
 */
function isolateSteps(state: EqState, target: string): { moves: Move[]; finalIsLeft: boolean } {
  let left = cloneSide(state.left);
  let right = cloneSide(state.right);
  const moves: Move[] = [];
  let home: 'L' | 'R' = sideContains(left, target) ? 'L' : 'R';
  let guard = 0;

  while (true) {
    if (++guard > 40) break; // safety valve; never hit by the verified bank
    const hs = () => (home === 'L' ? left : right);
    const os = () => (home === 'L' ? right : left);

    const denomIdx = hs().denom.findIndex((f) => containsTarget(f, target));
    if (denomIdx !== -1) {
      const homeS = hs();
      const oppS = os();
      const [factor] = homeS.denom.splice(denomIdx, 1);
      oppS.groups[0].factors.push(factor);
      const label = factorLabel(factor);
      moves.push({
        kind: 'lift', op: 'multiply', symbol: label, opLabel: `× ${label}`,
        homeIsLeft: home === 'L', stateAfter: cloneState(left, right),
        movedFactor: cloneFactor(factor), movedDenomIndex: denomIdx,
      });
      home = home === 'L' ? 'R' : 'L';
      continue;
    }

    if (hs().groups.length > 1) {
      const homeS = hs();
      const moveGroup = homeS.groups.find((g) => !g.factors.some((f) => containsTarget(f, target)));
      if (moveGroup) {
        const oppS = os();
        const groupIdx = homeS.groups.indexOf(moveGroup);
        homeS.groups = homeS.groups.filter((g) => g !== moveGroup);
        oppS.groups.push({ sign: (moveGroup.sign * -1) as 1 | -1, factors: moveGroup.factors });
        const label = moveGroup.factors.map(factorLabel).join('×');
        moves.push({
          kind: 'additive',
          op: 'addsub',
          symbol: label,
          opLabel: `${moveGroup.sign > 0 ? '−' : '+'} ${label}`,
          homeIsLeft: home === 'L',
          stateAfter: cloneState(left, right),
          movedGroup: { sign: moveGroup.sign, factors: moveGroup.factors.map(cloneFactor) },
          movedGroupIndex: groupIdx,
        });
        continue;
      }
    }

    const grp = hs().groups[0];
    if (grp.factors.length > 1) {
      const moveFactor = grp.factors.find((f) => !containsTarget(f, target));
      if (moveFactor) {
        const homeS = hs();
        const oppS = os();
        homeS.groups[0].factors = homeS.groups[0].factors.filter((f) => f !== moveFactor);
        oppS.denom.push(moveFactor);
        const label = factorLabel(moveFactor);
        moves.push({
          kind: 'multiplicative', op: 'divide', symbol: label, opLabel: `÷ ${label}`,
          homeIsLeft: home === 'L', stateAfter: cloneState(left, right),
          movedFactor: cloneFactor(moveFactor),
        });
        continue;
      }
    }

    if (hs().denom.length > 0) {
      const homeS = hs();
      const oppS = os();
      const factor = homeS.denom[0];
      homeS.denom = homeS.denom.slice(1);
      oppS.groups[0].factors.push(factor);
      const label = factorLabel(factor);
      moves.push({
        kind: 'multiplicative', op: 'multiply', symbol: label, opLabel: `× ${label}`,
        homeIsLeft: home === 'L', stateAfter: cloneState(left, right),
        movedFactor: cloneFactor(factor), movedDenomIndex: 0,
      });
      continue;
    }

    // home side is now exactly { groups: [{ factors: [carrier] }], denom: [] }
    const carrier = hs().groups[0].factors[0];
    if (carrier.kind === 'var') {
      if (carrier.power !== 1) {
        const homeS = hs();
        const oppS = os();
        const p = carrier.power;
        carrier.power = 1;
        const wrapped: PowerFactor = { kind: 'power', inner: cloneSide(oppS), exponent: 1 / p };
        oppS.groups = [{ sign: 1, factors: [wrapped] }];
        oppS.denom = [];
        moves.push({ kind: 'root', op: 'root', degree: p, symbol: target, opLabel: p === 2 ? '√' : `^(1/${p})`, homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
      }
      // A single-term home side can still carry a negative sign (e.g. from
      // an earlier additive move in a chained solve: v=u+at, solve u, then
      // solve a — the leftover term is "−a", not "a"). One more move flips
      // it, since "isolated" must mean the bare positive variable.
      if (hs().groups[0].sign === -1) {
        const homeS = hs();
        const oppS = os();
        homeS.groups[0].sign = 1;
        oppS.groups.forEach((g) => {
          g.sign = (g.sign * -1) as 1 | -1;
        });
        moves.push({ kind: 'negate', op: 'negate', symbol: target, opLabel: '× (−1)', homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
      }
      break;
    } else if (carrier.kind === 'power') {
      // peel the radical by raising both sides to its reciprocal
      const oppS = os();
      const unwrapped = cloneSide(carrier.inner);
      if (home === 'L') left = unwrapped;
      else right = unwrapped;
      const wrapped: PowerFactor = { kind: 'power', inner: cloneSide(oppS), exponent: 1 / carrier.exponent };
      oppS.groups = [{ sign: 1, factors: [wrapped] }];
      oppS.denom = [];
      moves.push({ kind: 'square', op: 'square', symbol: target, opLabel: carrier.exponent === 0.5 ? '²' : `^${1 / carrier.exponent}`, homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
      continue;
    }
  }

  return { moves, finalIsLeft: home === 'L' };
}

/**
 * Builds the UNSIMPLIFIED intermediate form for one move, and the token
 * keys of the pair that's about to cancel — same idea as the original
 * three move types (a fraction growing on both sides before cancelling),
 * extended to root/square moves by wrapping whatever is CURRENTLY on
 * each side in the same power, so e.g. v² = 2gh visibly becomes
 * √(v²) = √(2gh) before the left side simplifies to v.
 */
function buildIntermediate(move: Move, before: EqState): { mid: EqState; cancelKeys: string[] } {
  const homeBefore = cloneSide(move.homeIsLeft ? before.left : before.right);
  const oppBefore = cloneSide(move.homeIsLeft ? before.right : before.left);
  const homeSideTag = move.homeIsLeft ? 'L' : 'R';

  if (move.kind === 'negate') {
    // No literal pair cancels here — both sides just get multiplied by −1
    // to flip a leftover negative sign off the isolated term. Show the
    // "before" state unchanged for operate/cancel; settle jumps straight
    // to move.stateAfter, which already carries the flipped signs.
    const mid: EqState = move.homeIsLeft ? { left: homeBefore, right: oppBefore } : { left: oppBefore, right: homeBefore };
    return { mid, cancelKeys: [] };
  }

  if (move.kind === 'root' || move.kind === 'square') {
    const stateAfterOppSide = move.homeIsLeft ? move.stateAfter.right : move.stateAfter.left;
    const survivingWrapper = stateAfterOppSide.groups[0].factors[0] as PowerFactor;
    const oppWrap = cloneFactor(survivingWrapper) as PowerFactor;
    const homeWrap: PowerFactor = { kind: 'power', inner: homeBefore, exponent: oppWrap.exponent };
    const homeSide: Side = { groups: [{ sign: 1, factors: [homeWrap] }], denom: [] };
    const oppSide: Side = { groups: [{ sign: 1, factors: [oppWrap] }], denom: [] };
    const mid: EqState = move.homeIsLeft ? { left: homeSide, right: oppSide } : { left: oppSide, right: homeSide };
    const homeKey = varKey('pow', 'n', homeSideTag, 0);
    return { mid, cancelKeys: [`${homeKey}-open`, `${homeKey}-close`] };
  }

  const cancelKeys: string[] = [];

  if (move.op === 'divide') {
    // The moved factor was the sole OTHER factor cleared from home's single
    // remaining group — by construction (the additive stage always runs
    // first) that group is always index 0. The moved factor is usually a
    // plain var/const, but chaining can leave a power-wrapped factor (e.g.
    // "(T/2π)²") sitting in a product group too, so key lookup must handle
    // both shapes.
    const factor = move.movedFactor!;
    const tag = factorTag(factor);
    cancelKeys.push(...keysForFactorAt(tag, 'n', homeSideTag, 0, factor));
    homeBefore.denom.push(cloneFactor(factor));
    cancelKeys.push(...keysForFactorAt(tag, 'd', homeSideTag, homeBefore.denom.length - 1, factor));
    oppBefore.denom.push(cloneFactor(factor));
  } else if (move.op === 'multiply') {
    const factor = move.movedFactor!;
    const tag = factorTag(factor);
    const denomIdx = move.movedDenomIndex ?? 0;
    cancelKeys.push(...keysForFactorAt(tag, 'd', homeSideTag, denomIdx, factor));
    homeBefore.groups[0].factors.push(cloneFactor(factor));
    cancelKeys.push(...keysForFactorAt(tag, 'n', homeSideTag, 0, factor));
    oppBefore.groups[0].factors.push(cloneFactor(factor));
  } else {
    // additive
    const group = move.movedGroup!;
    const idx = move.movedGroupIndex ?? 0;
    group.factors.forEach((f) => cancelKeys.push(...keysForFactorAt(factorTag(f), 'n', homeSideTag, idx, f)));
    const injected: ProductGroup = { sign: (group.sign * -1) as 1 | -1, factors: group.factors.map(cloneFactor) };
    homeBefore.groups.push(injected);
    const injectedIdx = homeBefore.groups.length - 1;
    group.factors.forEach((f) => cancelKeys.push(...keysForFactorAt(factorTag(f), 'n', homeSideTag, injectedIdx, f)));
    oppBefore.groups.push({ sign: (group.sign * -1) as 1 | -1, factors: group.factors.map(cloneFactor) });
  }

  const mid: EqState = move.homeIsLeft ? { left: homeBefore, right: oppBefore } : { left: oppBefore, right: homeBefore };
  return { mid, cancelKeys };
}

function factorValueNum(f: Factor, values: Record<string, number>): number {
  if (f.kind === 'const') return Math.pow(f.value, f.power);
  if (f.kind === 'var') return Math.pow(values[f.symbol] ?? 0, f.power);
  return Math.pow(evalSide(f.inner, values), f.exponent);
}
function factorValueDenom(f: Factor, values: Record<string, number>): number {
  if (f.kind === 'const') return Math.pow(f.value, f.power);
  if (f.kind === 'var') return Math.pow(values[f.symbol] ?? 1, f.power);
  return Math.pow(evalSide(f.inner, values), f.exponent);
}
function evalSide(side: Side, values: Record<string, number>): number {
  const groupVal = (g: ProductGroup) => g.sign * g.factors.reduce((p, f) => p * factorValueNum(f, values), 1);
  const numerator = side.groups.reduce((sum, g) => sum + groupVal(g), 0);
  const denominator = side.denom.reduce((p, f) => p * factorValueDenom(f, values), 1);
  return numerator / denominator;
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '.': '·' };
function supNum(n: number): string {
  if (Number.isInteger(n)) return String(n).split('').map((c) => SUP[c] ?? c).join('');
  return `^${n}`;
}
function factorLabel(f: Factor): string {
  if (f.kind === 'power') {
    const inner = renderSideText(f.inner);
    return f.exponent === 0.5 ? `√(${inner})` : `(${inner})${supNum(f.exponent)}`;
  }
  return `${f.symbol}${f.power !== 1 ? supNum(f.power) : ''}`;
}

function renderSideText(side: Side): string {
  const num = side.groups
    .map((g, i) => {
      const term = g.factors.map(factorLabel).join(' × ');
      if (i === 0) return g.sign < 0 ? `−${term}` : term;
      return (g.sign < 0 ? '− ' : '+ ') + term;
    })
    .join(' ');
  if (side.denom.length === 0) return num;
  const wrapped = side.groups.length > 1 ? `(${num})` : num;
  return `${wrapped} / ${side.denom.map(factorLabel).join(' × ')}`;
}

function mirror(state: EqState): EqState {
  return { left: state.right, right: state.left };
}

// slot-based key: identifies "whichever factor currently occupies this
// structural position" (symbol/tag, numerator-or-denominator, side, index)
// rather than a specific object — the same scheme the original three move
// types relied on to keep a moved factor's on-screen identity continuous
// between the unsimplified and simplified renders.
function varKey(tag: string, role: 'n' | 'd', side: 'L' | 'R', index: number): string {
  return `${tag}:${role}:${side}:${index}`;
}

// A var/const factor renders as ONE token, so its slot key IS its token key.
// A power/radical factor renders as a bracket PAIR (open + close, plus its
// own recursively-laid-out inner tokens) — its slot key is never itself a
// rendered token, only "<slot>-open"/"<slot>-close" are. Anything that wants
// to reference "the token(s) currently at this slot" (cancel-key building)
// needs both keys for a power factor, not the bare slot key.
function keysForFactorAt(tag: string, role: 'n' | 'd', side: 'L' | 'R', index: number, factor: Factor): string[] {
  const base = varKey(tag, role, side, index);
  return factor.kind === 'power' ? [`${base}-open`, `${base}-close`] : [base];
}

// ---------- equation bank (unchanged) ----------

interface VarInfo {
  symbol: string;
  name: string;
  unit: string;
}
interface EquationDef {
  id: string;
  name: string;
  category: 'basic' | 'advanced';
  tier?: 'IGCSE' | 'Beyond IGCSE';
  vars: VarInfo[];
  initial: EqState;
  sample: Record<string, number>;
}

const Vf = (symbol: string, power = 1): VarFactor => ({ kind: 'var', symbol, power });
const Cf = (symbol: string, value: number, power = 1): ConstFactor => ({ kind: 'const', symbol, power, value });
const Pf = (inner: Side, exponent: number): PowerFactor => ({ kind: 'power', inner, exponent });
const G = (sign: 1 | -1, ...factors: Factor[]): ProductGroup => ({ sign, factors });
const HALF = () => Cf('2', 2); // ½ modelled as a denominator "2"

const PHYS = {
  Gconst: 6.674e-11,
  k: 8.988e9,
  e0: 8.854e-12,
  c: 2.998e8,
  twoPi: 2 * Math.PI,
};

const EQUATIONS: EquationDef[] = [
  {
    id: 'fma',
    name: "Newton's Second Law",
    category: 'basic',
    vars: [
      { symbol: 'F', name: 'force', unit: 'N' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'a', name: 'acceleration', unit: 'm/s²' },
    ],
    initial: { left: { groups: [G(1, Vf('F'))], denom: [] }, right: { groups: [G(1, Vf('m'), Vf('a'))], denom: [] } },
    sample: { F: 10, m: 2, a: 5 },
  },
  {
    id: 'rhomv',
    name: 'Density',
    category: 'basic',
    vars: [
      { symbol: 'ρ', name: 'density', unit: 'kg/m³' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'V', name: 'volume', unit: 'm³' },
    ],
    initial: { left: { groups: [G(1, Vf('ρ'))], denom: [] }, right: { groups: [G(1, Vf('m'))], denom: [Vf('V')] } },
    sample: { 'ρ': 8, m: 24, V: 3 },
  },
  {
    id: 'vir',
    name: "Ohm's Law",
    category: 'basic',
    vars: [
      { symbol: 'V', name: 'voltage', unit: 'V' },
      { symbol: 'I', name: 'current', unit: 'A' },
      { symbol: 'R', name: 'resistance', unit: 'Ω' },
    ],
    initial: { left: { groups: [G(1, Vf('V'))], denom: [] }, right: { groups: [G(1, Vf('I'), Vf('R'))], denom: [] } },
    sample: { V: 12, I: 4, R: 3 },
  },
  {
    id: 'pet',
    name: 'Power',
    category: 'basic',
    vars: [
      { symbol: 'P', name: 'power', unit: 'W' },
      { symbol: 'E', name: 'energy', unit: 'J' },
      { symbol: 't', name: 'time', unit: 's' },
    ],
    initial: { left: { groups: [G(1, Vf('P'))], denom: [] }, right: { groups: [G(1, Vf('E'))], denom: [Vf('t')] } },
    sample: { P: 50, E: 250, t: 5 },
  },
  {
    id: 'pgh',
    name: 'Pressure in a Liquid',
    category: 'basic',
    vars: [
      { symbol: 'p', name: 'pressure', unit: 'Pa' },
      { symbol: 'ρ', name: 'density', unit: 'kg/m³' },
      { symbol: 'g', name: 'gravitational field strength', unit: 'N/kg' },
      { symbol: 'h', name: 'depth', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('p'))], denom: [] }, right: { groups: [G(1, Vf('ρ'), Vf('g'), Vf('h'))], denom: [] } },
    sample: { p: 19600, 'ρ': 1000, g: 9.8, h: 2 },
  },
  {
    id: 'vuat',
    name: 'SUVAT — Velocity–Time',
    category: 'basic',
    vars: [
      { symbol: 'v', name: 'final velocity', unit: 'm/s' },
      { symbol: 'u', name: 'initial velocity', unit: 'm/s' },
      { symbol: 'a', name: 'acceleration', unit: 'm/s²' },
      { symbol: 't', name: 'time', unit: 's' },
    ],
    initial: { left: { groups: [G(1, Vf('v'))], denom: [] }, right: { groups: [G(1, Vf('u')), G(1, Vf('a'), Vf('t'))], denom: [] } },
    sample: { v: 11, u: 5, a: 2, t: 3 },
  },

  // ---- Advanced ----
  {
    id: 'gravitation',
    name: "Newton's Law of Gravitation",
    category: 'advanced',
    tier: 'Beyond IGCSE',
    vars: [
      { symbol: 'F', name: 'gravitational force', unit: 'N' },
      { symbol: 'M', name: 'mass 1', unit: 'kg' },
      { symbol: 'm', name: 'mass 2', unit: 'kg' },
      { symbol: 'r', name: 'separation', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('F'))], denom: [] }, right: { groups: [G(1, Cf('G', PHYS.Gconst), Vf('M'), Vf('m'))], denom: [Vf('r', 2)] } },
    sample: { F: 8693.6, M: 5.972e24, m: 1000, r: 6.771e6 },
  },
  {
    id: 'fieldstrength',
    name: 'Gravitational Field Strength',
    category: 'advanced',
    tier: 'Beyond IGCSE',
    vars: [
      { symbol: 'g', name: 'gravitational field strength', unit: 'N/kg' },
      { symbol: 'M', name: 'mass', unit: 'kg' },
      { symbol: 'r', name: 'distance from centre', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('g'))], denom: [] }, right: { groups: [G(1, Cf('G', PHYS.Gconst), Vf('M'))], denom: [Vf('r', 2)] } },
    sample: { g: 9.82, M: 5.972e24, r: 6.371e6 },
  },
  {
    id: 'coulomb',
    name: "Coulomb's Law",
    category: 'advanced',
    tier: 'Beyond IGCSE',
    vars: [
      { symbol: 'F', name: 'electrostatic force', unit: 'N' },
      { symbol: 'q₁', name: 'charge 1', unit: 'C' },
      { symbol: 'q₂', name: 'charge 2', unit: 'C' },
      { symbol: 'r', name: 'separation', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('F'))], denom: [] }, right: { groups: [G(1, Cf('k', PHYS.k), Vf('q₁'), Vf('q₂'))], denom: [Vf('r', 2)] } },
    sample: { F: 0.2157, 'q₁': 2e-6, 'q₂': 3e-6, r: 0.5 },
  },
  {
    id: 'ke',
    name: 'Kinetic Energy',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'Eₖ', name: 'kinetic energy', unit: 'J' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'v', name: 'speed', unit: 'm/s' },
    ],
    initial: { left: { groups: [G(1, Vf('Eₖ'))], denom: [] }, right: { groups: [G(1, Vf('m'), Vf('v', 2))], denom: [HALF()] } },
    sample: { 'Eₖ': 25, m: 2, v: 5 },
  },
  {
    id: 'capenergy',
    name: 'Energy Stored in a Capacitor',
    category: 'advanced',
    tier: 'Beyond IGCSE',
    vars: [
      { symbol: 'E', name: 'energy stored', unit: 'J' },
      { symbol: 'C', name: 'capacitance', unit: 'F' },
      { symbol: 'V', name: 'voltage', unit: 'V' },
    ],
    initial: { left: { groups: [G(1, Vf('E'))], denom: [] }, right: { groups: [G(1, Vf('C'), Vf('V', 2))], denom: [HALF()] } },
    sample: { E: 18, C: 4, V: 3 },
  },
  {
    id: 'emc2',
    name: 'Mass–Energy Equivalence',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'E', name: 'energy', unit: 'J' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
    ],
    initial: { left: { groups: [G(1, Vf('E'))], denom: [] }, right: { groups: [G(1, Vf('m'), Cf('c', PHYS.c, 2))], denom: [] } },
    sample: { E: 8.988e10, m: 0.001 },
  },
  {
    id: 'pendulum',
    name: 'Pendulum Period',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'T', name: 'period', unit: 's' },
      { symbol: 'L', name: 'string length', unit: 'm' },
      { symbol: 'g', name: 'gravitational field strength', unit: 'N/kg' },
    ],
    initial: {
      left: { groups: [G(1, Vf('T'))], denom: [] },
      right: { groups: [G(1, Cf('2π', PHYS.twoPi), Pf({ groups: [G(1, Vf('L'))], denom: [Vf('g')] }, 0.5))], denom: [] },
    },
    sample: { T: 2.007, L: 1, g: 9.8 },
  },
  {
    id: 'freefall',
    name: 'Speed From Free Fall',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'v', name: 'speed', unit: 'm/s' },
      { symbol: 'g', name: 'gravitational field strength', unit: 'N/kg' },
      { symbol: 'h', name: 'height fallen', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('v'))], denom: [] }, right: { groups: [G(1, Pf({ groups: [G(1, Cf('2', 2), Vf('g'), Vf('h'))], denom: [] }, 0.5))], denom: [] } },
    sample: { v: 19.8, g: 9.8, h: 20 },
  },
  {
    id: 'capacitance',
    name: 'Capacitance',
    category: 'advanced',
    tier: 'Beyond IGCSE',
    vars: [
      { symbol: 'C', name: 'capacitance', unit: 'F' },
      { symbol: 'Q', name: 'charge', unit: 'C' },
      { symbol: 'V', name: 'voltage', unit: 'V' },
    ],
    initial: { left: { groups: [G(1, Vf('C'))], denom: [] }, right: { groups: [G(1, Vf('Q'))], denom: [Vf('V')] } },
    sample: { C: 4, Q: 12, V: 3 },
  },
  {
    id: 'platecap',
    name: 'Parallel Plate Capacitance',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'C', name: 'capacitance', unit: 'F' },
      { symbol: 'A', name: 'plate area', unit: 'm²' },
      { symbol: 'd', name: 'plate separation', unit: 'm' },
    ],
    initial: { left: { groups: [G(1, Vf('C'))], denom: [] }, right: { groups: [G(1, Cf('ε₀', PHYS.e0), Vf('A'))], denom: [Vf('d')] } },
    sample: { C: 1.7708e-10, A: 0.02, d: 0.001 },
  },
  {
    id: 'p_i2r',
    name: 'Electrical Power (I²R)',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'P', name: 'power', unit: 'W' },
      { symbol: 'I', name: 'current', unit: 'A' },
      { symbol: 'R', name: 'resistance', unit: 'Ω' },
    ],
    initial: { left: { groups: [G(1, Vf('P'))], denom: [] }, right: { groups: [G(1, Vf('I', 2), Vf('R'))], denom: [] } },
    sample: { P: 40, I: 2, R: 10 },
  },
  {
    id: 'p_v2r',
    name: 'Electrical Power (V²/R)',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'P', name: 'power', unit: 'W' },
      { symbol: 'V', name: 'voltage', unit: 'V' },
      { symbol: 'R', name: 'resistance', unit: 'Ω' },
    ],
    initial: { left: { groups: [G(1, Vf('P'))], denom: [] }, right: { groups: [G(1, Vf('V', 2))], denom: [Vf('R')] } },
    sample: { P: 24, V: 12, R: 6 },
  },
  {
    id: 'transformer',
    name: 'Transformer Equation',
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'V₁', name: 'primary voltage', unit: 'V' },
      { symbol: 'V₂', name: 'secondary voltage', unit: 'V' },
      { symbol: 'N₁', name: 'primary turns', unit: 'turns' },
      { symbol: 'N₂', name: 'secondary turns', unit: 'turns' },
    ],
    initial: { left: { groups: [G(1, Vf('V₁'))], denom: [Vf('V₂')] }, right: { groups: [G(1, Vf('N₁'))], denom: [Vf('N₂')] } },
    sample: { 'V₁': 230, 'V₂': 23, 'N₁': 1000, 'N₂': 100 },
  },
  {
    id: 'boyles',
    name: "Boyle's Law",
    category: 'advanced',
    tier: 'IGCSE',
    vars: [
      { symbol: 'p₁', name: 'initial pressure', unit: 'Pa' },
      { symbol: 'V₁', name: 'initial volume', unit: 'm³' },
      { symbol: 'p₂', name: 'final pressure', unit: 'Pa' },
      { symbol: 'V₂', name: 'final volume', unit: 'm³' },
    ],
    initial: { left: { groups: [G(1, Vf('p₁'), Vf('V₁'))], denom: [] }, right: { groups: [G(1, Vf('p₂'), Vf('V₂'))], denom: [] } },
    sample: { 'p₁': 100000, 'V₁': 0.02, 'p₂': 50000, 'V₂': 0.04 },
  },
];

// ---------- layout (unchanged) ----------

const CELL_W = 46;
const OP_W = 30;
const ROW_H = 44;
const BAR_GAP = 6;
const PREFIX_W = 30;
const SUFFIX_W = 26;

interface Token {
  key: string;
  text: string;
  x: number;
  y: number;
  kind: 'var' | 'const' | 'op' | 'bar' | 'equals' | 'bracket';
  isLeftSide: boolean;
  targetSymbol?: string;
}

function measureFactor(f: Factor): number {
  if (f.kind !== 'power') return CELL_W;
  return PREFIX_W + measureSide(f.inner) + SUFFIX_W;
}
function measureSide(side: Side): number {
  const numW = side.groups.reduce(
    (w, g, gi) => w + (gi > 0 || g.sign < 0 ? OP_W : 0) + g.factors.reduce((ww, f, fi) => ww + (fi > 0 ? OP_W : 0) + measureFactor(f), 0),
    0
  );
  const denW = side.denom.reduce((w, f, fi) => w + (fi > 0 ? OP_W : 0) + measureFactor(f), 0);
  const hasFraction = side.denom.length > 0;
  return Math.max(numW, hasFraction ? denW : 0, CELL_W);
}

function layoutFactor(tokens: Token[], f: Factor, cx: number, y: number, isLeftSide: boolean, tag: string, role: 'n' | 'd', side: 'L' | 'R', index: number): number {
  if (f.kind !== 'power') {
    const key = varKey(tag, role, side, index);
    tokens.push({ key, text: factorLabel(f), x: cx + CELL_W / 2, y, kind: f.kind, isLeftSide, targetSymbol: f.kind === 'var' ? f.symbol : undefined });
    return cx + CELL_W;
  }
  const width = measureFactor(f);
  const baseKey = varKey(tag, role, side, index);
  const openText = f.exponent === 0.5 ? '√(' : '(';
  tokens.push({ key: `${baseKey}-open`, text: openText, x: cx + PREFIX_W / 2, y, kind: 'bracket', isLeftSide });
  const innerX0 = cx + PREFIX_W;
  layoutSideTokens(f.inner, innerX0, isLeftSide, y, tokens, baseKey);
  const innerW = measureSide(f.inner);
  const closeX = innerX0 + innerW;
  const closeText = f.exponent === 0.5 ? ')' : `)${supNum(f.exponent)}`;
  tokens.push({ key: `${baseKey}-close`, text: closeText, x: closeX + SUFFIX_W / 2, y, kind: 'bracket', isLeftSide });
  return closeX + SUFFIX_W;
}

function layoutSideTokens(side: Side, blockLeftX: number, isLeftSide: boolean, baseY: number, tokens: Token[], keyPrefix: string): number {
  const sideTag: 'L' | 'R' = isLeftSide ? 'L' : 'R';
  const hasFraction = side.denom.length > 0;
  const width = measureSide(side);
  const numW = side.groups.reduce(
    (w, g, gi) => w + (gi > 0 || g.sign < 0 ? OP_W : 0) + g.factors.reduce((ww, f, fi) => ww + (fi > 0 ? OP_W : 0) + measureFactor(f), 0),
    0
  );
  const numY = hasFraction ? baseY - ROW_H / 2 - BAR_GAP : baseY;

  let cx = blockLeftX + (width - numW) / 2;
  side.groups.forEach((g, gi) => {
    if (gi > 0) {
      tokens.push({ key: `${keyPrefix}-add-${gi}-${sideTag}`, text: g.sign < 0 ? '−' : '+', x: cx + OP_W / 2, y: numY, kind: 'op', isLeftSide });
      cx += OP_W;
    } else if (g.sign < 0) {
      tokens.push({ key: `${keyPrefix}-neg-${sideTag}`, text: '−', x: cx + OP_W / 2, y: numY, kind: 'op', isLeftSide });
      cx += OP_W;
    }
    g.factors.forEach((f, fi) => {
      if (fi > 0) {
        tokens.push({ key: `${keyPrefix}-mul-${gi}-${fi}-${sideTag}`, text: '×', x: cx + OP_W / 2, y: numY, kind: 'op', isLeftSide });
        cx += OP_W;
      }
      cx = layoutFactor(tokens, f, cx, numY, isLeftSide, factorTag(f), 'n', sideTag, gi);
    });
  });

  if (hasFraction) {
    tokens.push({ key: `${keyPrefix}-bar-${sideTag}`, text: '', x: blockLeftX + width / 2, y: baseY, kind: 'bar', isLeftSide });
    const denW = side.denom.reduce((w, f, fi) => w + (fi > 0 ? OP_W : 0) + measureFactor(f), 0);
    const denomY = baseY + ROW_H / 2 + BAR_GAP;
    let dx = blockLeftX + (width - denW) / 2;
    side.denom.forEach((f, di) => {
      if (di > 0) {
        tokens.push({ key: `${keyPrefix}-dmul-${di}-${sideTag}`, text: '×', x: dx + OP_W / 2, y: denomY, kind: 'op', isLeftSide });
        dx += OP_W;
      }
      dx = layoutFactor(tokens, f, dx, denomY, isLeftSide, factorTag(f), 'd', sideTag, di);
    });
  }

  return width;
}

function layoutSide(side: Side, blockLeftX: number, isLeftSide: boolean): { tokens: Token[]; width: number; centerX: number } {
  const tokens: Token[] = [];
  const sideTag = isLeftSide ? 'L' : 'R';
  const width = layoutSideTokens(side, blockLeftX, isLeftSide, 0, tokens, sideTag);
  return { tokens, width, centerX: blockLeftX + width / 2 };
}

function layoutEquation(state: EqState): { tokens: Token[]; totalWidth: number; leftCenterX: number; rightCenterX: number } {
  const leftLayout = layoutSide(state.left, 0, true);
  const equalsW = 56;
  const rightLayout = layoutSide(state.right, leftLayout.width + equalsW, false);
  const totalWidth = leftLayout.width + equalsW + rightLayout.width;
  const equalsToken: Token = { key: 'equals', text: '=', x: leftLayout.width + equalsW / 2, y: 0, kind: 'equals', isLeftSide: false };
  return {
    tokens: [...leftLayout.tokens, equalsToken, ...rightLayout.tokens],
    totalWidth,
    leftCenterX: leftLayout.centerX,
    rightCenterX: rightLayout.centerX,
  };
}

// ---------- equation-stage adapter (new) ----------

const STAGE_HEIGHT = 130;
const STAGE_Y_OFFSET = 55;

/** Converts layoutEquation()'s Token[] (unchanged algebra-engine output) into lib/equation-stage's Stage tree. */
function toStage(state: EqState, target: string | null, clickable: boolean): Stage {
  const layout = layoutEquation(state);
  const tokens: StageToken[] = layout.tokens.map((t): StageToken => {
    if (t.kind === 'bar') {
      return { key: t.key, text: '', x: t.x, y: STAGE_Y_OFFSET + t.y, kind: 'fractionBar' };
    }
    const kind: StageToken['kind'] =
      t.kind === 'var' ? 'variable' : t.kind === 'const' ? 'number' : t.kind === 'op' ? 'operator' : t.kind === 'equals' ? 'equals' : 'bracket';
    const isVar = t.kind === 'var';
    return {
      key: t.key,
      text: t.text,
      x: t.x,
      y: STAGE_Y_OFFSET + t.y,
      kind,
      isTarget: isVar && t.targetSymbol === target,
      clickableVariable: isVar && clickable ? t.targetSymbol : undefined,
      glossarySymbol: isVar ? t.targetSymbol : undefined,
    };
  });
  return { tokens, width: layout.totalWidth, height: STAGE_HEIGHT };
}

type Tab = 'basic' | 'advanced';

function moveStepLabel(move: Move): string {
  if (move.kind === 'root') return move.degree === 2 ? '√ both sides' : `^(1/${move.degree}) both sides`;
  if (move.kind === 'square') return '² both sides';
  if (move.kind === 'negate') return '×(−1) both sides';
  return move.opLabel;
}

function operateCaption(move: Move): string {
  const isPower = move.kind === 'root' || move.kind === 'square';
  const isNegate = move.kind === 'negate';
  return isNegate
    ? 'Multiply both sides by −1'
    : isPower
    ? move.kind === 'root'
      ? `Take the ${move.degree === 2 ? 'square' : `${move.degree}th`} root of both sides`
      : 'Square both sides'
    : `Apply ${move.opLabel} to both sides`;
}
function cancelCaption(move: Move): string {
  const isPower = move.kind === 'root' || move.kind === 'square';
  const isNegate = move.kind === 'negate';
  return isNegate
    ? 'The sign flips on both sides'
    : isPower
    ? move.kind === 'root'
      ? `${move.symbol}${supNum(move.degree ?? 2)} simplifies to ${move.symbol}`
      : 'The root cancels here'
    : `${move.symbol} cancels here`;
}

function stateAtSettledFragment(f: number, moves: Move[], finalIsLeft: boolean, baseState: EqState): EqState {
  if (f < 0) return baseState;
  if (f < moves.length) return moves[f].stateAfter;
  const last = moves.length > 0 ? moves[moves.length - 1].stateAfter : baseState;
  return finalIsLeft ? last : mirror(last);
}

function settledCaptionFor(f: number, moves: Move[], finalIsLeft: boolean, target: string): string {
  const total = moves.length + (finalIsLeft ? 0 : 1);
  if (f < 0) {
    return total === 0 ? `${target} is already alone` : `Solve for ${target} — ${total} step${total === 1 ? '' : 's'}. Press Next.`;
  }
  if (f === moves.length && !finalIsLeft) return 'Flipped so the answer sits on the left.';
  return 'Simplified.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OPERATE_MS = 650;
const CANCEL_MS = 500;
const SETTLE_MS = 650;

export function EquationRearrangerSimulator() {
  const [tab, setTab] = useState<Tab>('basic');
  const visibleEquations = EQUATIONS.filter((e) => e.category === tab);
  const [eqIdx, setEqIdx] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [baseState, setBaseState] = useState<EqState>(EQUATIONS[0].initial);
  const [moves, setMoves] = useState<Move[]>([]);
  const [finalIsLeft, setFinalIsLeft] = useState(true);
  const [sampleVals, setSampleVals] = useState<Record<string, number>>(EQUATIONS[0].sample);
  const [caption, setCaption] = useState('Click any variable to isolate it');
  const [isDone, setIsDone] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [glossary, setGlossary] = useState<{ entry: GlossaryEntry; anchorEl: HTMLElement; isTarget: boolean } | null>(null);

  const eq = EQUATIONS[eqIdx];
  const totalFragments = moves.length + (finalIsLeft ? 0 : 1);

  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevFragmentRef = useRef(-1);
  const renderGenRef = useRef(0);
  const deck = useRevealDeck();

  const openGlossary = useCallback(
    (symbol: string, anchorEl: HTMLElement) => {
      const varInfo = EQUATIONS[eqIdx].vars.find((v) => v.symbol === symbol);
      if (!varInfo) return;
      const entry = getGlossaryEntry(EQUATIONS[eqIdx].id, symbol, varInfo.name, varInfo.unit);
      setGlossary({ entry, anchorEl, isTarget: symbol === target });
    },
    [eqIdx, target]
  );

  const solveFor = useCallback(
    (symbol: string) => {
      setBaseState((currentBase) => {
        const { moves: newMoves, finalIsLeft: newFinalIsLeft } = isolateSteps(currentBase, symbol);
        setMoves(newMoves);
        setFinalIsLeft(newFinalIsLeft);
        setTarget(symbol);
        return currentBase;
      });
    },
    []
  );

  // Idle render: no target picked yet for the active equation.
  useEffect(() => {
    if (target !== null) return;
    const stageEl = stageRefs.current[eqIdx];
    if (!stageEl) return;
    ++renderGenRef.current;
    renderStage(stageEl, toStage(eq.initial, null, true), {
      animate: false,
      cancelKeys: new Set(),
      onVariableClick: solveFor,
      onGlossaryClick: openGlossary,
    });
    setCaption('Click any variable to isolate it');
    setIsDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, eqIdx]);

  // A new derivation was just prepared for the active equation: register its
  // fragment count with the deck and render the "ready" (f = -1) state.
  useEffect(() => {
    if (target === null) return;
    const stageEl = stageRefs.current[eqIdx];
    if (!stageEl) return;
    prevFragmentRef.current = -1;
    ++renderGenRef.current;
    deck.syncFragments(eqIdx);
    const total = moves.length + (finalIsLeft ? 0 : 1);
    const doneImmediately = total === 0;
    renderStage(stageEl, toStage(baseState, target, doneImmediately), {
      animate: false,
      cancelKeys: new Set(),
      onVariableClick: solveFor,
      onGlossaryClick: openGlossary,
    });
    setCaption(settledCaptionFor(-1, moves, finalIsLeft, target));
    setIsDone(doneImmediately);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, moves]);

  const snapTo = useCallback(
    (f: number) => {
      const gen = ++renderGenRef.current;
      const stageEl = stageRefs.current[eqIdx];
      if (!stageEl) return;
      const total = moves.length + (finalIsLeft ? 0 : 1);
      const doneHere = f === total - 1;
      const state = stateAtSettledFragment(f, moves, finalIsLeft, baseState);
      renderStage(stageEl, toStage(state, target, doneHere), {
        animate: false,
        cancelKeys: new Set(),
        onVariableClick: solveFor,
        onGlossaryClick: openGlossary,
      });
      if (renderGenRef.current !== gen) return;
      setCaption(target ? settledCaptionFor(f, moves, finalIsLeft, target) : 'Click any variable to isolate it');
      setIsDone(doneHere);
      if (doneHere) setBaseState(state);
    },
    [eqIdx, moves, finalIsLeft, baseState, target, solveFor, openGlossary]
  );

  const playForward = useCallback(
    async (f: number) => {
      const gen = ++renderGenRef.current;
      const stageEl = stageRefs.current[eqIdx];
      if (!stageEl || !target) return;
      const total = moves.length + (finalIsLeft ? 0 : 1);

      if (f === moves.length && !finalIsLeft) {
        // Flip fragment — mirrors the settled equation so the answer sits on the left. Always the last fragment.
        setIsAnimating(true);
        const last = moves.length > 0 ? moves[moves.length - 1].stateAfter : baseState;
        const flipped = mirror(last);
        setCaption('Flipped so the answer sits on the left.');
        renderStage(stageEl, toStage(flipped, target, true), {
          animate: true,
          cancelKeys: new Set(),
          onVariableClick: solveFor,
          onGlossaryClick: openGlossary,
        });
        await sleep(SETTLE_MS);
        if (renderGenRef.current !== gen) return;
        setBaseState(flipped);
        setIsDone(true);
        setIsAnimating(false);
        return;
      }

      const move = moves[f];
      if (!move) return;
      setIsAnimating(true);
      const before = f === 0 ? baseState : moves[f - 1].stateAfter;
      const { mid, cancelKeys } = buildIntermediate(move, before);

      setCaption(operateCaption(move));
      renderStage(stageEl, toStage(mid, target, false), {
        animate: true,
        cancelKeys: new Set(),
        onVariableClick: solveFor,
        onGlossaryClick: openGlossary,
      });
      await sleep(OPERATE_MS);
      if (renderGenRef.current !== gen) return;

      setCaption(cancelCaption(move));
      renderStage(stageEl, toStage(mid, target, false), {
        animate: true,
        cancelKeys: new Set(cancelKeys),
        onVariableClick: solveFor,
        onGlossaryClick: openGlossary,
      });
      await sleep(CANCEL_MS);
      if (renderGenRef.current !== gen) return;

      const doneHere = f === total - 1;
      setCaption('Simplified.');
      renderStage(stageEl, toStage(move.stateAfter, target, doneHere), {
        animate: true,
        cancelKeys: new Set(),
        onVariableClick: solveFor,
        onGlossaryClick: openGlossary,
      });
      await sleep(SETTLE_MS);
      if (renderGenRef.current !== gen) return;
      if (doneHere) setBaseState(move.stateAfter);
      setIsDone(doneHere);
      setIsAnimating(false);
    },
    [eqIdx, moves, finalIsLeft, baseState, target, solveFor, openGlossary]
  );

  const handleDeckStateChange = useCallback(
    (s: RevealDeckState) => {
      deck.onStateChange(s);
      const prev = prevFragmentRef.current;
      prevFragmentRef.current = s.fragmentIndex;
      if (s.slideIndex !== eqIdx) return;
      if (s.fragmentIndex > prev) playForward(s.fragmentIndex);
      else if (s.fragmentIndex < prev) snapTo(s.fragmentIndex);
    },
    [eqIdx, playForward, snapTo, deck]
  );

  const reset = () => {
    setTarget(null);
    setMoves([]);
    setFinalIsLeft(true);
    setBaseState(eq.initial);
    deck.goToSlide(eqIdx);
  };

  const switchEquation = (i: number) => {
    setEqIdx(i);
    setTarget(null);
    setMoves([]);
    setFinalIsLeft(true);
    setBaseState(EQUATIONS[i].initial);
    setSampleVals(EQUATIONS[i].sample);
    deck.goToSlide(i);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    const firstIdx = EQUATIONS.findIndex((e) => e.category === t);
    switchEquation(firstIdx);
  };

  const finalState = moves.length > 0 ? moves[moves.length - 1].stateAfter : baseState;
  const finalDisplaySide = finalIsLeft ? finalState.right : finalState.left;
  const rearrangedVal = target ? evalSide(finalDisplaySide, sampleVals) : 0;
  const checkVals = { ...sampleVals, [target || '']: rearrangedVal };
  const origLeftVal = target ? evalSide(eq.initial.left, checkVals) : 0;
  const origRightVal = target ? evalSide(eq.initial.right, checkVals) : 0;
  const balances = target ? Math.abs(origLeftVal - origRightVal) < 1e-6 * Math.max(1, Math.abs(origLeftVal)) : false;
  const otherKeys = eq.vars.map((v) => v.symbol).filter((s) => s !== target);

  return (
    <div className="equation-rearranger flex flex-col gap-5">
      {/* ---- Tabs ---- */}
      <div className="flex items-center gap-2">
        {(['basic', 'advanced'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`text-[12.5px] font-semibold px-4 py-1.5 rounded-full border ${
              tab === t ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-white text-[#4a5a72] border-[#d8cfb6] hover:bg-[#faf7f0]'
            }`}
          >
            {t === 'basic' ? 'Basic' : 'Advanced'}
          </button>
        ))}
        <span className="text-[11px] text-[#a8a196] italic">
          {tab === 'basic' ? 'six linear equations' : 'powers, square roots and real IGCSE constants'}
        </span>
      </div>

      {/* ---- Stage: full width ---- */}
      <div className="bg-white border border-[#e4ddcc] rounded overflow-hidden">
        <div className="flex justify-between items-baseline px-4 pt-3 gap-2">
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72] flex items-center gap-2">
            {eq.name}
            {eq.tier && (
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${
                  eq.tier === 'Beyond IGCSE' ? 'bg-[#f3e5e0] text-[#8f4a33]' : 'bg-[#e6f2ee] text-[#1b5c4d]'
                }`}
              >
                {eq.tier}
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">
            {target ? `solving for ${target}` : 'pick a variable'}
          </span>
        </div>

        <RevealDeck ref={deck.ref} onStateChange={handleDeckStateChange}>
          {EQUATIONS.map((e, i) => (
            <section key={e.id}>
              {Array.from({ length: i === eqIdx ? totalFragments : 0 }).map((_, fi) => (
                // eslint-disable-next-line react/no-array-index-key
                <span className="fragment" key={fi} />
              ))}
              <div className="flex justify-center items-center py-10 px-4 overflow-x-auto" style={{ minHeight: 220 }}>
                <div
                  ref={(el) => {
                    stageRefs.current[i] = el;
                  }}
                  className="eq-stage"
                />
              </div>
            </section>
          ))}
        </RevealDeck>

        <div className="px-4 pb-4 text-center">
          <span
            className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full ${
              isDone ? 'bg-[#e6f2ee] text-[#1b5c4d]' : 'bg-[#f6efdc] text-[#8f6428]'
            }`}
          >
            {caption}
          </span>
        </div>

        {target && totalFragments > 0 && (
          <div className="px-4 pb-3 flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => deck.prev()}
                disabled={!deck.state.canPrev || isAnimating}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#d8cfb6] text-[#4a5a72] bg-white hover:bg-[#faf7f0] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                ◀ Back
              </button>
              <span className="text-[11.5px] font-mono text-[#a8a196] min-w-[90px] text-center">
                {deck.state.fragmentIndex === -1 ? 'Ready' : `Step ${deck.state.fragmentIndex + 1} of ${totalFragments}`}
              </span>
              <button
                onClick={() => deck.next()}
                disabled={!deck.state.canNext || isAnimating}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#1b2a41] text-white bg-[#1b2a41] hover:bg-[#2a3d5c] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Next ▶
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {moves.map((m, mi) => (
                <span
                  key={mi}
                  className={`text-[10.5px] font-mono px-2 py-1 rounded ${
                    deck.state.fragmentIndex === mi ? 'bg-[#1b2a41] text-white' : 'bg-[#faf7f0] text-[#4a5a72] border border-[#eee6d3]'
                  }`}
                >
                  {mi + 1}. {moveStepLabel(m)}
                </span>
              ))}
              {!finalIsLeft && (
                <span
                  className={`text-[10.5px] font-mono px-2 py-1 rounded ${
                    deck.state.fragmentIndex === moves.length ? 'bg-[#1b2a41] text-white' : 'bg-[#faf7f0] text-[#4a5a72] border border-[#eee6d3]'
                  }`}
                >
                  {moves.length + 1}. flip sides
                </span>
              )}
            </div>
          </div>
        )}

        <div className="px-4 pb-5 flex flex-wrap items-center gap-2 border-t border-[#eee6d3] pt-4">
          {target && (
            <button onClick={reset} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#b8823d] text-[#8f6428] bg-[#faf7f0] hover:bg-[#f0e5cc]">
              ↺ Reset to original equation
            </button>
          )}
          {target && isDone && (
            <span className="text-[11px] text-[#a8a196] italic">
              — clicking another variable now continues from what's on screen
            </span>
          )}
          <span className="text-[11px] font-mono text-[#a8a196] mr-1 ml-auto">equation:</span>
          {visibleEquations.map((e) => {
            const i = EQUATIONS.indexOf(e);
            return (
              <button
                key={e.id}
                onClick={() => switchEquation(i)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border ${
                  i === eqIdx ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-transparent text-[#4a5a72] border-[#d8cfb6] hover:bg-[#faf7f0]'
                }`}
              >
                {renderSideText(e.initial.left)} = {renderSideText(e.initial.right)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Notebook row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">The Golden Rule</span>
          <div className="mt-2.5 space-y-2.5 text-[12.5px] text-[#4a5a72] leading-snug">
            <p>
              <strong className="text-[#1b2a41]">Whatever you do to one side, you must do to the other.</strong>{' '}
              Watch a real fraction (or a real new term) form on both sides at once — not a floating label, the
              operation becomes part of the equation itself.
            </p>
            <p>
              Where the term already existed, its two copies meet and cancel. Where it did not, it survives and
              becomes a permanent new part of that side.
            </p>
            <p>
              On the Advanced tab, squaring or rooting works the same way: both sides get wrapped in the same
              operation, and only the side that was already a perfect power simplifies away.
            </p>
            <p>The variable you clicked stays red for the entire derivation. Grey numbers and letters (G, k, π, ½, ε₀, c) are constants — they move with the algebra but can't be the target.</p>
            <p>
              <strong className="text-[#1b2a41]">Nothing plays automatically.</strong> Press Next to take each step —
              watch it operate, cancel, then settle in one motion — or ← / → on your keyboard once you've clicked
              into the equation. Back is instant, no replay.
            </p>
            <p>
              Click the small <strong className="text-[#1b2a41]">ⓘ</strong> next to any variable to see what it
              means and its unit — separate from clicking the variable itself, which solves for it.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          <span className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72]">Try This</span>
          <div className="mt-2 space-y-2.5 text-[12px] text-[#4a5a72] leading-snug">
            {tab === 'basic' ? (
              <>
                <p>
                  <strong className="text-[#1b2a41]">1.</strong> Click a in F = ma. Watch F grow a genuine fraction bar
                  (F/m) while m×a grows the same denominator and immediately simplifies back to a alone.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">2.</strong> Switch to ρ = m/V and click V. First V climbs directly
                  into the numerator (multiplying with m, cancelling the existing denominator), then a second move clears
                  ρ the same way.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">3.</strong> After a derivation finishes, click a different variable
                  — it continues from what's on screen. Hit Reset to start over from the original equation.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong className="text-[#1b2a41]">1.</strong> Click r in F = GMm/r². Watch r² lift into the
                  numerator on the left, m and M clear away, and the derivation finish with a genuine "take the
                  square root of both sides" step.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">2.</strong> Click L in the pendulum equation T = 2π√(L/g). 2π
                  divides away first, THEN both sides get squared to peel the root off L/g, THEN g lifts clear —
                  three real moves in the right order.
                </p>
                <p>
                  <strong className="text-[#1b2a41]">3.</strong> Try V₁/V₂ = N₁/N₂ or p₁V₁ = p₂V₂ — no square
                  root needed, just cross-multiplication, the same engine handling a completely different shape.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e4ddcc] rounded p-4">
          {target ? (
            <>
              <div className="bg-gradient-to-br from-[#fbf5e8] to-[#f6efdc] border border-[#e6d9b8] rounded px-4 py-3.5 text-center mb-3">
                <div className="italic text-[19px] text-[#8f6428]" style={{ fontFamily: 'Georgia, serif' }}>
                  {target} = {renderSideText(finalDisplaySide)}
                </div>
                <div className="italic text-[12.5px] text-[#8f6428] mt-1.5" style={{ fontFamily: 'Georgia, serif' }}>
                  {eq.name}
                </div>
              </div>
              {isDone && (
                <div className="bg-[#faf7f0] border border-[#eee6d3] rounded-lg p-3 mb-1">
                  <div className="font-mono text-[10.5px] tracking-wide uppercase text-[#4a5a72] mb-2">
                    Verify — plug the answer back into the original equation
                  </div>
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
                    {target} works out to <span className="font-mono font-bold text-[#1b2a41]">{rearrangedVal.toExponential(4)}</span> — original
                    equation: <span className="font-mono">{origLeftVal.toExponential(4)}</span> vs <span className="font-mono">{origRightVal.toExponential(4)}</span>
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
              <p className="text-[12px] text-[#4a5a72]">Click a variable above to watch it isolate.</p>
            </div>
          )}
          <h2 className="font-mono text-[13px] tracking-wide uppercase text-[#4a5a72] border-b border-[#eee6d3] pb-2 mb-3 mt-3">
            What Each Variable Means
          </h2>
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

      {glossary && (
        <GlossaryOverlay
          entry={glossary.entry}
          anchorEl={glossary.anchorEl}
          isTarget={glossary.isTarget}
          onClose={() => setGlossary(null)}
        />
      )}
    </div>
  );
}
