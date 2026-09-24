/**
 * The on-screen captions for each beat of a derivation, as TeX (so they are
 * set in Computer Modern, like the equations, and drawn with Write). Every
 * symbol is tagged so the stage can colour it to match the equation.
 */

import type { Factor, Move, ProductGroup } from './algebra';
import { plainFactorTex, TexTagger, type TaggedTex } from './texFromState';

class Caption {
  private t = new TexTagger('c');
  private n = 0;

  /** A factor, coloured as its main symbol. */
  factor(f: Factor): string {
    const symbol = f.kind === 'power' ? undefined : f.symbol;
    const kind = f.kind === 'var' ? 'var' : f.kind === 'const' ? 'const' : 'text';
    return this.t.tag({ key: `cap-${this.n++}`, kind, symbol }, plainFactorTex(f));
  }

  group(g: ProductGroup): string {
    return g.factors.map((f) => this.factor(f)).join(' ');
  }

  symbol(symbol: string, tex: string): string {
    return this.t.tag({ key: `cap-${this.n++}`, kind: 'var', symbol }, tex);
  }

  done(tex: string): TaggedTex {
    return { tex, tokens: this.t.tokens };
  }
}

const text = (s: string) => `\\text{${s}}`;

export function operateCaption(move: Move): TaggedTex {
  const c = new Caption();
  switch (move.kind) {
    case 'root':
      return c.done(text(move.degree === 2 || !move.degree ? 'Take the square root of both sides' : `Take the ${move.degree}th root of both sides`));
    case 'square':
      return c.done(text('Square both sides'));
    case 'negate':
      return c.done(`${text('Multiply both sides by ')} {-1}`);
    case 'additive': {
      const g = move.movedGroup!;
      const term = c.group(g);
      return c.done(g.sign > 0 ? `${text('Subtract ')} ${term} ${text(' from both sides')}` : `${text('Add ')} ${term} ${text(' to both sides')}`);
    }
    default: {
      const f = c.factor(move.movedFactor!);
      return c.done(move.op === 'divide' ? `${text('Divide both sides by ')} ${f}` : `${text('Multiply both sides by ')} ${f}`);
    }
  }
}

/** What cancels, and why, shown while it is struck out. */
export function cancelCaption(move: Move, targetTex: string, target: string): TaggedTex | null {
  const c = new Caption();
  switch (move.kind) {
    case 'negate':
      return null;
    case 'root': {
      const t = c.symbol(target, targetTex);
      const p = move.degree ?? 2;
      return c.done(`${p === 2 ? `\\sqrt{${t}^{2}}` : `\\sqrt[${p}]{${t}^{${p}}}`} = ${c.symbol(target, targetTex)} ${text(': the root undoes the power')}`);
    }
    case 'square':
      return c.done(`${text('Squaring undoes the square root: ')} \\left(\\sqrt{x}\\right)^{2} = x`);
    case 'additive': {
      const g = move.movedGroup!;
      const a = c.group(g);
      const b = c.group(g);
      return c.done(`${g.sign > 0 ? '+' : '-'}\\,${a} ${g.sign > 0 ? '-' : '+'} ${b} = 0`);
    }
    default: {
      const f = move.movedFactor!;
      return c.done(`\\dfrac{${c.factor(f)}}{${c.factor(f)}} = 1`);
    }
  }
}

export function plainCaption(s: string, symbols: { symbol: string; tex: string }[] = []): TaggedTex {
  const c = new Caption();
  // "{0}" style placeholders are replaced by coloured symbols.
  const parts = s.split(/\{(\d+)\}/);
  const tex = parts.map((p, i) => (i % 2 ? c.symbol(symbols[Number(p)].symbol, symbols[Number(p)].tex) : p ? text(p) : '')).join(' ');
  return c.done(tex);
}

/** Plain words as TeX text, with superscripts (I²R) set as real superscripts and dashes made TeX-safe. */
export function textTex(s: string): string {
  return s
    .replace(/[—–]/g, '-')
    .split(/([²³])/)
    .map((part) => (part === '²' ? '^{2}' : part === '³' ? '^{3}' : part ? `\\text{${part.replace(/[{}\\$&#%_^~]/g, '')}}` : ''))
    .join('');
}
