/**
 * The Equation Rearranger's algebra engine and equation bank, moved out of
 * the component unchanged so the lesson player and the tests share it.
 *
 * isolateSteps() finds the legal moves that isolate a variable;
 * buildIntermediate() gives the unsimplified form of a move (the operation
 * applied to both sides, before anything cancels) and the slot keys of the
 * pieces that cancel. Every equation × variable × orientation × chained
 * pair was verified against the original equation when this engine was
 * written (3090 checks); lib tests re-run the typesetting side of that.
 */


export interface VarFactor {
  kind: 'var';
  symbol: string;
  power: number;
}
export interface ConstFactor {
  kind: 'const';
  symbol: string;
  power: number;
  value: number;
}
export interface PowerFactor {
  kind: 'power';
  inner: Side;
  exponent: number; // 0.5 renders as √(inner); other values as (inner)^n
}
export type Factor = VarFactor | ConstFactor | PowerFactor;

export interface ProductGroup {
  sign: 1 | -1;
  factors: Factor[];
}
export interface Side {
  groups: ProductGroup[];
  denom: Factor[];
}
export interface EqState {
  left: Side;
  right: Side;
}
export type OpType = 'divide' | 'multiply' | 'addsub' | 'root' | 'square' | 'negate';
export interface Move {
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

export function cloneFactor(f: Factor): Factor {
  if (f.kind === 'power') return { kind: 'power', inner: cloneSide(f.inner), exponent: f.exponent };
  return { ...f };
}
export function cloneSide(s: Side): Side {
  return { groups: s.groups.map((g) => ({ sign: g.sign, factors: g.factors.map(cloneFactor) })), denom: s.denom.map(cloneFactor) };
}
export function cloneState(left: Side, right: Side): EqState {
  return { left: cloneSide(left), right: cloneSide(right) };
}

export function containsTarget(f: Factor, target: string): boolean {
  if (f.kind === 'var') return f.symbol === target;
  if (f.kind === 'const') return false;
  return sideContains(f.inner, target);
}
export function sideContains(side: Side, target: string): boolean {
  return side.groups.some((g) => g.factors.some((f) => containsTarget(f, target))) || side.denom.some((f) => containsTarget(f, target));
}
export function factorTag(f: Factor): string {
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
export function isolateSteps(state: EqState, target: string): { moves: Move[]; finalIsLeft: boolean } {
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
export function buildIntermediate(move: Move, before: EqState): { mid: EqState; cancelKeys: string[] } {
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

export function factorValueNum(f: Factor, values: Record<string, number>): number {
  if (f.kind === 'const') return Math.pow(f.value, f.power);
  if (f.kind === 'var') return Math.pow(values[f.symbol] ?? 0, f.power);
  return Math.pow(evalSide(f.inner, values), f.exponent);
}
export function factorValueDenom(f: Factor, values: Record<string, number>): number {
  if (f.kind === 'const') return Math.pow(f.value, f.power);
  if (f.kind === 'var') return Math.pow(values[f.symbol] ?? 1, f.power);
  return Math.pow(evalSide(f.inner, values), f.exponent);
}
export function evalSide(side: Side, values: Record<string, number>): number {
  const groupVal = (g: ProductGroup) => g.sign * g.factors.reduce((p, f) => p * factorValueNum(f, values), 1);
  const numerator = side.groups.reduce((sum, g) => sum + groupVal(g), 0);
  const denominator = side.denom.reduce((p, f) => p * factorValueDenom(f, values), 1);
  return numerator / denominator;
}

export const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '.': '·' };
export function supNum(n: number): string {
  if (Number.isInteger(n)) return String(n).split('').map((c) => SUP[c] ?? c).join('');
  return `^${n}`;
}
export function factorLabel(f: Factor): string {
  if (f.kind === 'power') {
    const inner = renderSideText(f.inner);
    return f.exponent === 0.5 ? `√(${inner})` : `(${inner})${supNum(f.exponent)}`;
  }
  return `${f.symbol}${f.power !== 1 ? supNum(f.power) : ''}`;
}

export function renderSideText(side: Side): string {
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

export function mirror(state: EqState): EqState {
  return { left: state.right, right: state.left };
}

// slot-based key: identifies "whichever factor currently occupies this
// structural position" (symbol/tag, numerator-or-denominator, side, index)
// rather than a specific object — the same scheme the original three move
// types relied on to keep a moved factor's on-screen identity continuous
// between the unsimplified and simplified renders.
export function varKey(tag: string, role: 'n' | 'd', side: 'L' | 'R', index: number): string {
  return `${tag}:${role}:${side}:${index}`;
}

// A var/const factor renders as ONE token, so its slot key IS its token key.
// A power/radical factor renders as a bracket PAIR (open + close, plus its
// own recursively-laid-out inner tokens) — its slot key is never itself a
// rendered token, only "<slot>-open"/"<slot>-close" are. Anything that wants
// to reference "the token(s) currently at this slot" (cancel-key building)
// needs both keys for a power factor, not the bare slot key.
export function keysForFactorAt(tag: string, role: 'n' | 'd', side: 'L' | 'R', index: number, factor: Factor): string[] {
  const base = varKey(tag, role, side, index);
  return factor.kind === 'power' ? [`${base}-open`, `${base}-close`] : [base];
}

// ---------- equation bank ----------

export interface VarInfo {
  symbol: string;
  name: string;
  unit: string;
}
export interface EquationDef {
  id: string;
  name: string;
  category: 'basic' | 'advanced';
  tier?: 'IGCSE' | 'Beyond IGCSE';
  vars: VarInfo[];
  initial: EqState;
  sample: Record<string, number>;
}

export const Vf = (symbol: string, power = 1): VarFactor => ({ kind: 'var', symbol, power });
export const Cf = (symbol: string, value: number, power = 1): ConstFactor => ({ kind: 'const', symbol, power, value });
export const Pf = (inner: Side, exponent: number): PowerFactor => ({ kind: 'power', inner, exponent });
export const G = (sign: 1 | -1, ...factors: Factor[]): ProductGroup => ({ sign, factors });
export const HALF = () => Cf('2', 2); // ½ modelled as a denominator "2"

export const PHYS = {
  Gconst: 6.674e-11,
  k: 8.988e9,
  e0: 8.854e-12,
  c: 2.998e8,
  twoPi: 2 * Math.PI,
};

export const EQUATIONS: EquationDef[] = [
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

