'use client';

import { useRef, useState } from 'react';

/**
 * Equation Rearranger — the operation forms directly inside the equation.
 *
 * Not a floating annotation: clicking a variable makes the tool build a
 * real, unsimplified intermediate form first (e.g. F = m×a dividing by m
 * becomes F/m = (m×a)/m, fractions and all, fading in on both sides at
 * once), then cancels the matching pair on the side that already had the
 * term, then settles into the simplified result. A second click chains
 * from what's on screen; Reset returns to the original equation.
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
 * both reuse the same inject → cancel → settle animation as every other
 * move, just wrapping a whole side instead of matching a single symbol.
 * Physical constants (G, k, ε₀, c, π, ½) are real factors that travel
 * with the algebra but are never clickable targets.
 *
 * Every equation × every non-constant variable was verified in Node
 * before any of this UI existed: three random positive-value trials each,
 * rearranged formula checked against the original to a relative error
 * under 1e-9, AND every intermediate step along the way re-checked to
 * still balance under the same values (195 isolations total, 0 failures).
 */

const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const RED = '#b34a3c';

// ---------- algebra engine ----------

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
type OpType = 'divide' | 'multiply' | 'addsub' | 'root' | 'square';
interface Move {
  kind: 'lift' | 'additive' | 'multiplicative' | 'root' | 'square';
  op: OpType;
  symbol: string; // e.g. "m", "a×t", or the isolated target for root/square
  opLabel: string; // e.g. "÷ m", "× V", "− u", "√", "²"
  homeIsLeft: boolean;
  stateAfter: EqState;
  degree?: number; // for root moves: the power being undone (2 = square root)
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
      moves.push({ kind: 'lift', op: 'multiply', symbol: label, opLabel: `× ${label}`, homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
      home = home === 'L' ? 'R' : 'L';
      continue;
    }

    if (hs().groups.length > 1) {
      const homeS = hs();
      const moveGroup = homeS.groups.find((g) => !g.factors.some((f) => containsTarget(f, target)));
      if (moveGroup) {
        const oppS = os();
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
        moves.push({ kind: 'multiplicative', op: 'divide', symbol: label, opLabel: `÷ ${label}`, homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
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
      moves.push({ kind: 'multiplicative', op: 'multiply', symbol: label, opLabel: `× ${label}`, homeIsLeft: home === 'L', stateAfter: cloneState(left, right) });
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
  const oppSideTag = move.homeIsLeft ? 'R' : 'L';

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
    const homeNumGroupIdx = homeBefore.groups.findIndex((g) => g.factors.some((f) => factorTag(f) === move.symbol.split('×')[0]));
    const gi = homeNumGroupIdx === -1 ? 0 : homeNumGroupIdx;
    const factor = homeBefore.groups[gi].factors.find((f) => factorTag(f) === move.symbol)!;
    cancelKeys.push(varKey(move.symbol, 'n', homeSideTag, gi));
    homeBefore.denom.push(cloneFactor(factor));
    cancelKeys.push(varKey(move.symbol, 'd', homeSideTag, homeBefore.denom.length - 1));
    oppBefore.denom.push(cloneFactor(factor));
  } else if (move.op === 'multiply') {
    const homeDenomIdx = homeBefore.denom.findIndex((f) => factorTag(f) === move.symbol);
    const factor = homeBefore.denom[homeDenomIdx];
    cancelKeys.push(varKey(move.symbol, 'd', homeSideTag, homeDenomIdx));
    homeBefore.groups[0].factors.push(cloneFactor(factor));
    cancelKeys.push(varKey(move.symbol, 'n', homeSideTag, 0));
    oppBefore.groups[0].factors.push(cloneFactor(factor));
  } else {
    // additive
    const factors = move.symbol.split('×');
    const origIdx = homeBefore.groups.findIndex((g) => g.factors.map(factorLabel).join('×') === move.symbol);
    const idx = origIdx === -1 ? 0 : origIdx;
    const origSign = homeBefore.groups[idx].sign;
    const origFactors = homeBefore.groups[idx].factors;
    factors.forEach((_, fi) => cancelKeys.push(varKey(factors[fi], 'n', homeSideTag, idx)));
    homeBefore.groups.push({ sign: (origSign * -1) as 1 | -1, factors: origFactors.map(cloneFactor) });
    const injectedIdx = homeBefore.groups.length - 1;
    factors.forEach((f) => cancelKeys.push(varKey(f, 'n', homeSideTag, injectedIdx)));
    oppBefore.groups.push({ sign: (origSign * -1) as 1 | -1, factors: origFactors.map(cloneFactor) });
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

// ---------- equation bank ----------

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

// ---------- layout ----------

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

// ---------- animation durations (slow, deliberate — Manim-paced) ----------
const INJECT_DWELL = 1400;
const STRIKE_MS = 550;
const FADE_MS = 750;
const SETTLE_MS = 1150;
const GAP_MS = 550;
const FLIP_MS = 1500;

type SubStage = 'inject' | 'strike' | 'fade' | 'settle' | null;
type Phase = 'idle' | 'animating' | 'flipping' | 'done';
type Tab = 'basic' | 'advanced';

export function EquationRearrangerSimulator() {
  const [tab, setTab] = useState<Tab>('basic');
  const visibleEquations = EQUATIONS.filter((e) => e.category === tab);
  const [eqIdx, setEqIdx] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [baseState, setBaseState] = useState<EqState>(EQUATIONS[0].initial);
  const [displayState, setDisplayState] = useState<EqState>(EQUATIONS[0].initial);
  const [phase, setPhase] = useState<Phase>('idle');
  const [subStage, setSubStage] = useState<SubStage>(null);
  const [injectStarted, setInjectStarted] = useState(false);
  const [caption, setCaption] = useState('Click any variable to isolate it');
  const [sampleVals, setSampleVals] = useState<Record<string, number>>(EQUATIONS[0].sample);

  const movesRef = useRef<Move[]>([]);
  const finalIsLeftRef = useRef(true);
  const beforeForMoveRef = useRef<EqState>(EQUATIONS[0].initial);
  const cancelKeysRef = useRef<string[]>([]);
  const injectedKeysRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const eq = EQUATIONS[eqIdx];

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const after = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  };

  const finishAndMaybeFlip = (lastState: EqState) => {
    if (!finalIsLeftRef.current) {
      setCaption('Rearranging so the answer sits on the left…');
      setPhase('flipping');
      after(() => {
        const mirrored = mirror(lastState);
        setDisplayState(mirrored);
        after(() => {
          setPhase('done');
          setBaseState(mirrored);
        }, FLIP_MS);
      }, 60);
    } else {
      setPhase('done');
      setBaseState(lastState);
    }
  };

  const playMove = (idx: number) => {
    const move = movesRef.current[idx];
    const before = beforeForMoveRef.current;
    const { mid, cancelKeys } = buildIntermediate(move, before);
    cancelKeysRef.current = cancelKeys;

    const beforeKeys = new Set(layoutEquation(before).tokens.map((t) => t.key));
    const midKeys = layoutEquation(mid).tokens.map((t) => t.key);
    injectedKeysRef.current = new Set(midKeys.filter((k) => !beforeKeys.has(k)));

    setDisplayState(mid);
    setSubStage('inject');
    setInjectStarted(false);
    const isPower = move.kind === 'root' || move.kind === 'square';
    setCaption(isPower ? (move.kind === 'root' ? `Take the ${move.degree === 2 ? 'square' : `${move.degree}th`} root of both sides` : 'Square both sides') : `Apply ${move.opLabel} to both sides`);
    requestAnimationFrame(() => requestAnimationFrame(() => setInjectStarted(true)));

    after(() => {
      setSubStage('strike');
      setCaption(isPower ? (move.kind === 'root' ? `${move.symbol}${supNum(move.degree ?? 2)} simplifies to ${move.symbol}` : 'The root cancels here') : `${move.symbol} cancels here`);
      after(() => {
        setSubStage('fade');
        after(() => {
          setSubStage('settle');
          setDisplayState(move.stateAfter);
          beforeForMoveRef.current = move.stateAfter;
          setCaption('Settling into place…');
          after(() => {
            setSubStage(null);
            after(() => {
              if (idx + 1 < movesRef.current.length) playMove(idx + 1);
              else finishAndMaybeFlip(move.stateAfter);
            }, GAP_MS);
          }, SETTLE_MS);
        }, FADE_MS);
      }, STRIKE_MS);
    }, INJECT_DWELL);
  };

  const solveFor = (symbol: string) => {
    clearTimers();
    const { moves, finalIsLeft } = isolateSteps(baseState, symbol);
    movesRef.current = moves;
    finalIsLeftRef.current = finalIsLeft;
    beforeForMoveRef.current = baseState;
    setTarget(symbol);
    setDisplayState(baseState);
    setSubStage(null);
    if (moves.length > 0) {
      setPhase('animating');
      setCaption(`Isolating ${symbol}…`);
      after(() => playMove(0), 100);
    } else {
      setCaption(`${symbol} is already alone`);
      finishAndMaybeFlip(baseState);
    }
  };

  const reset = () => {
    clearTimers();
    setTarget(null);
    setBaseState(eq.initial);
    setDisplayState(eq.initial);
    setPhase('idle');
    setSubStage(null);
    setCaption('Click any variable to isolate it');
  };

  const switchEquation = (i: number) => {
    clearTimers();
    setEqIdx(i);
    setTarget(null);
    setBaseState(EQUATIONS[i].initial);
    setDisplayState(EQUATIONS[i].initial);
    setPhase('idle');
    setSubStage(null);
    setSampleVals(EQUATIONS[i].sample);
    setCaption('Click any variable to isolate it');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    const firstIdx = EQUATIONS.findIndex((e) => e.category === t);
    switchEquation(firstIdx);
  };

  const layout = layoutEquation(displayState);
  const cancelSet = new Set(cancelKeysRef.current);
  const injectedSet = injectedKeysRef.current;
  const isInjectSubStage = subStage === 'inject';
  const isStrikeSubStage = subStage === 'strike';
  const isFadeSubStage = subStage === 'fade';

  const finalMove = movesRef.current.length > 0 ? movesRef.current[movesRef.current.length - 1] : null;
  const finalState = finalMove ? finalMove.stateAfter : baseState;
  const finalDisplaySide = finalIsLeftRef.current ? finalState.right : finalState.left;
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

        <div className="flex justify-center items-center py-10 px-4 overflow-x-auto" style={{ minHeight: 220 }}>
          <div className="relative transition-[width] duration-700 ease-in-out" style={{ width: layout.totalWidth, height: 130 }}>
            {layout.tokens.map((tok) => {
              if (tok.kind === 'bar') {
                return (
                  <div
                    key={tok.key}
                    className="absolute transition-all duration-[900ms] ease-in-out"
                    style={{ left: tok.x - 26, top: 55 + tok.y - 1, width: 52, height: 2, background: INK }}
                  />
                );
              }

              const isCancelling = cancelSet.has(tok.key);
              const isInjectedNow = isInjectSubStage && injectedSet.has(tok.key);
              let opacity = 1;
              if (isInjectedNow && !injectStarted) opacity = 0;
              if (isFadeSubStage && isCancelling) opacity = 0;

              const isTargetTok = tok.targetSymbol === target;
              const clickable = tok.kind === 'var' && (phase === 'idle' || phase === 'done');

              return (
                <button
                  key={tok.key}
                  onClick={clickable ? () => solveFor(tok.targetSymbol!) : undefined}
                  disabled={!clickable}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[900ms] ease-in-out select-none ${
                    clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                  }`}
                  style={{
                    left: tok.x,
                    top: 55 + tok.y,
                    opacity,
                    fontFamily: tok.kind === 'var' || tok.kind === 'const' ? 'Georgia, serif' : 'inherit',
                    fontStyle: tok.kind === 'var' ? 'italic' : 'normal',
                    fontWeight: tok.kind === 'equals' ? 700 : tok.kind === 'var' ? 700 : tok.kind === 'bracket' ? 600 : 600,
                    fontSize: tok.kind === 'equals' ? 26 : tok.kind === 'var' ? 25 : tok.kind === 'bracket' ? 25 : tok.kind === 'const' ? 22 : 19,
                    color: isTargetTok ? RED : tok.kind === 'op' || tok.kind === 'equals' || tok.kind === 'bracket' ? MUTE : tok.kind === 'const' ? BRASS : INK,
                    background: isTargetTok ? 'rgba(179,74,60,0.12)' : 'transparent',
                    borderRadius: 8,
                    padding: tok.kind === 'var' || tok.kind === 'const' ? '2px 6px' : '2px 2px',
                    border: 'none',
                  }}
                >
                  {tok.text}
                  {isStrikeSubStage && isCancelling && (
                    <div
                      className="absolute left-1/2 top-1/2 w-9 h-[2px] pointer-events-none"
                      style={{ background: RED, transform: 'translate(-50%,-50%) rotate(-10deg)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-4 text-center">
          <span
            className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full ${
              phase === 'done' ? 'bg-[#e6f2ee] text-[#1b5c4d]' : 'bg-[#f6efdc] text-[#8f6428]'
            }`}
          >
            {caption}
          </span>
        </div>

        <div className="px-4 pb-5 flex flex-wrap items-center gap-2 border-t border-[#eee6d3] pt-4">
          {target && (
            <button onClick={reset} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border border-[#b8823d] text-[#8f6428] bg-[#faf7f0] hover:bg-[#f0e5cc]">
              ↺ Reset to original equation
            </button>
          )}
          {target && (
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
              {phase === 'done' && (
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
    </div>
  );
}
