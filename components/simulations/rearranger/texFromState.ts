/**
 * Writes an equation state as TeX for the Manim-style stage, tagging every
 * token with \class{kN}{…} and recording what each tag is: its slot key
 * (the same scheme buildIntermediate's cancel keys use, so "the m that
 * cancels" can be found on screen), and whether it is a variable,
 * constant, operator, fraction bar or bracket.
 *
 * Slot keys follow the original layout engine exactly: a factor's key is
 * tag:role:side:index, and operators and bars are prefixed with their
 * side (or with the key of the power factor they sit inside).
 */

import { factorTag, varKey, type EqState, type Factor, type Side } from './algebra';

export type TokenKind = 'var' | 'const' | 'op' | 'equals' | 'bar' | 'bracket' | 'text';

export interface TokenMeta {
  /** Slot key, stable across the before / unsimplified / after forms of a move. */
  key: string;
  kind: TokenKind;
  /** For variables and constants: the symbol as written in the bank (m, ρ, q₁). */
  symbol?: string;
  /** Brackets round a power: the first glyph is the opening bracket, the rest the closing one and its exponent. */
  wrap?: { open: string; close: string };
  /** Which side of the equals sign it is on. */
  side?: 'L' | 'R' | null;
}

export interface TaggedTex {
  tex: string;
  /** Class name (kN) → what that tagged piece is. */
  tokens: Map<string, TokenMeta>;
}

const GREEK: Record<string, string> = { 'ρ': '\\rho', 'ε': '\\varepsilon', 'π': '\\pi', 'θ': '\\theta', 'λ': '\\lambda', 'ω': '\\omega', 'μ': '\\mu', 'Ω': '\\Omega' };
const SUBSCRIPT: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', 'ₖ': 'k', 'ₑ': 'e', 'ₚ': 'p' };

/** A bank symbol (ρ, Eₖ, q₁, ε₀, 2π) as TeX. */
export function symbolTex(symbol: string): string {
  let base = '';
  let sub = '';
  for (const ch of symbol) {
    if (SUBSCRIPT[ch]) sub += SUBSCRIPT[ch];
    else base += GREEK[ch] ? `${GREEK[ch]} ` : ch;
  }
  base = base.trim();
  return sub ? `${base}_{${sub}}` : base;
}

const isNumeric = (f: Factor) => f.kind === 'const' && /^\d/.test(f.symbol);

/** Numbers first, as in 2gh or 2E_k; otherwise the order the algebra keeps them in. */
function displayOrder(factors: Factor[]): number[] {
  const idx = factors.map((_, i) => i);
  return [...idx.filter((i) => isNumeric(factors[i])), ...idx.filter((i) => !isNumeric(factors[i]))];
}

function exponentTex(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toString();
}

export class TexTagger {
  private n = 0;
  private used = new Map<string, number>();
  private sideNow: 'L' | 'R' | null = null;
  readonly tokens = new Map<string, TokenMeta>();

  constructor(private prefix = 'k') {}

  /** A key made unique within this equation: repeats get a ~n suffix. */
  unique(key: string): string {
    const seen = this.used.get(key) ?? 0;
    this.used.set(key, seen + 1);
    return seen ? `${key}~${seen}` : key;
  }

  /** Wraps `body` in a class whose tag records `meta` (whose key must already be unique). */
  tagExact(meta: TokenMeta, body: string): string {
    const id = `${this.prefix}${this.n++}`;
    this.tokens.set(id, { side: this.sideNow, ...meta });
    return `\\class{${id}}{${body}}`;
  }

  tag(meta: TokenMeta, body: string): string {
    return this.tagExact({ ...meta, key: this.unique(meta.key) }, body);
  }

  factor(f: Factor, role: 'n' | 'd', side: 'L' | 'R', index: number): string {
    const tag = factorTag(f);
    const key = varKey(tag, role, side, index);
    if (f.kind !== 'power') {
      const body = symbolTex(f.symbol) + (f.power !== 1 ? `^{${exponentTex(f.power)}}` : '');
      return this.tag({ key, kind: f.kind, symbol: f.symbol }, body);
    }
    // Reserve the wrapper's keys before its contents, so that an outer
    // wrapper keeps the plain key and a nested one gets the ~n suffix.
    const root = 1 / f.exponent;
    if (Number.isInteger(root) && root >= 2) {
      // A radical's sign and overline are its "opening"; it has no closing glyph.
      const open = this.unique(`${key}-open`);
      const inner = this.side(f.inner, key, side);
      return this.tagExact({ key: open, kind: 'bracket' }, root === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${root}]{${inner}}`);
    }
    const wrap = { open: this.unique(`${key}-open`), close: this.unique(`${key}-close`) };
    const inner = this.side(f.inner, key, side);
    return this.tagExact({ key: this.unique(`${key}-wrap`), kind: 'bracket', wrap }, `\\left(${inner}\\right)^{${exponentTex(f.exponent)}}`);
  }

  product(factors: Factor[], role: 'n' | 'd', side: 'L' | 'R', keyPrefix: string, groupIndex: number | null): string {
    const order = displayOrder(factors);
    return order
      .map((fi, pos) => {
        const f = factors[fi];
        const index = role === 'n' ? (groupIndex ?? 0) : fi;
        const body = this.factor(f, role, side, index);
        if (pos === 0) return body;
        // Juxtaposition (ma, GMm, 2gh) except between two numbers.
        const prev = factors[order[pos - 1]];
        if (!(isNumeric(prev) && isNumeric(f))) return body;
        const opKey = role === 'n' ? `${keyPrefix}-mul-${groupIndex}-${fi}-${side}` : `${keyPrefix}-dmul-${fi}-${side}`;
        return `${this.tag({ key: opKey, kind: 'op' }, '\\times')} ${body}`;
      })
      .join(' ');
  }

  side(s: Side, keyPrefix: string, side: 'L' | 'R'): string {
    this.sideNow = side;
    const num = s.groups
      .map((g, gi) => {
        let sign = '';
        if (gi > 0) sign = `\\mathbin{${this.tag({ key: `${keyPrefix}-add-${gi}-${side}`, kind: 'op' }, g.sign < 0 ? '-' : '+')}} `;
        else if (g.sign < 0) sign = `${this.tag({ key: `${keyPrefix}-neg-${side}`, kind: 'op' }, '-')} `;
        return sign + this.product(g.factors, 'n', side, keyPrefix, gi);
      })
      .join(' ');
    if (s.denom.length === 0) return num;
    const den = this.product(s.denom, 'd', side, keyPrefix, null);
    return this.tag({ key: `${keyPrefix}-bar-${side}`, kind: 'bar' }, `\\dfrac{${num}}{${den}}`);
  }
}

/** The whole equation, tagged. */
export function equationTex(state: EqState): TaggedTex {
  const t = new TexTagger();
  const left = t.side(state.left, 'L', 'L');
  const eq = t.tag({ key: 'equals', kind: 'equals', side: null }, '=');
  const right = t.side(state.right, 'R', 'R');
  return { tex: `${left} \\mathrel{${eq}} ${right}`, tokens: t.tokens };
}

/** A factor or a product of factors as plain TeX, for captions. */
export function plainFactorTex(f: Factor): string {
  if (f.kind !== 'power') return symbolTex(f.symbol) + (f.power !== 1 ? `^{${exponentTex(f.power)}}` : '');
  const inner = plainSideTex(f.inner);
  return f.exponent === 0.5 ? `\\sqrt{${inner}}` : `\\left(${inner}\\right)^{${exponentTex(f.exponent)}}`;
}

export function plainSideTex(s: Side): string {
  const num = s.groups
    .map((g, gi) => {
      const sign = gi > 0 ? (g.sign < 0 ? ' - ' : ' + ') : g.sign < 0 ? '-' : '';
      return sign + displayOrder(g.factors).map((i) => plainFactorTex(g.factors[i])).join(' ');
    })
    .join('');
  if (s.denom.length === 0) return num;
  return `\\dfrac{${num}}{${displayOrder(s.denom).map((i) => plainFactorTex(s.denom[i])).join(' ')}}`;
}

export interface GlyphKey {
  /** The token's slot key (for a bracket wrapper, its opening or closing key). */
  token: string;
  meta: TokenMeta | null;
  /** Unique per glyph: token, character and which occurrence of that character within the token. */
  match: string;
}

/**
 * Gives every typeset glyph the key of the token it belongs to. A bracketed
 * power's glyphs are split: the leftmost is its opening bracket, the rest
 * (closing bracket and exponent) its closing key.
 */
export function glyphKeys(glyphs: { cls: string | null; char: string; m: number[] }[], tokens: Map<string, TokenMeta>): GlyphKey[] {
  const firstOfWrap = new Map<string, number>();
  glyphs.forEach((g, i) => {
    const meta = g.cls ? tokens.get(g.cls) : undefined;
    if (!meta?.wrap) return;
    const best = firstOfWrap.get(g.cls!);
    if (best === undefined || g.m[4] < glyphs[best].m[4]) firstOfWrap.set(g.cls!, i);
  });
  const count = new Map<string, number>();
  return glyphs.map((g, i) => {
    const meta = (g.cls && tokens.get(g.cls)) || null;
    let token = meta ? meta.key : 'untagged';
    if (meta?.wrap) token = firstOfWrap.get(g.cls!) === i ? meta.wrap.open : meta.wrap.close;
    const base = `${token}|${g.char}`;
    const n = count.get(base) ?? 0;
    count.set(base, n + 1);
    return { token, meta, match: `${base}|${n}` };
  });
}
