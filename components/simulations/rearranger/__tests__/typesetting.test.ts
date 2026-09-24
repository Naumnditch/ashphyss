/**
 * Every state the lesson can ever put on screen must typeset, and every
 * piece the choreography refers to must exist as glyphs: each variable
 * and constant, and each token that cancels. This walks the same space the
 * algebra engine was verified over: every equation, every variable, the
 * equation as given and mirrored, and every chained pair of solves.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTexEngine, type TexEngine } from '@/lib/manim/tex';
import { buildIntermediate, EQUATIONS, isolateSteps, mirror, type EqState } from '../algebra';
import { equationTex, glyphKeys, symbolTex } from '../texFromState';
import { cancelCaption, operateCaption, plainCaption, textTex } from '../captions';

let tex: TexEngine;
beforeAll(async () => {
  tex = await loadTexEngine();
});

interface Checked {
  states: number;
  cancels: number;
}

function typeset(state: EqState) {
  const tagged = equationTex(state);
  const glyphs = tex.layout(tagged.tex);
  const keys = glyphKeys(glyphs, tagged.tokens);
  return { tagged, glyphs, keys };
}

function checkState(state: EqState, label: string) {
  const { tagged, keys } = typeset(state);
  const tokensWithGlyphs = new Set(keys.map((k) => k.token));
  for (const meta of tagged.tokens.values()) {
    if (meta.kind === 'var' || meta.kind === 'const' || meta.kind === 'equals' || meta.kind === 'bar') {
      expect(tokensWithGlyphs.has(meta.key), `${label}: ${meta.key} has no glyphs`).toBe(true);
    }
  }
  expect(new Set(keys.map((k) => k.match)).size, `${label}: glyph keys not unique`).toBe(keys.length);
  expect(keys.some((k) => k.token === 'untagged'), `${label}: untagged glyphs`).toBe(false);
  return { tagged, keys };
}

function derive(start: EqState, target: string, label: string, out: Checked) {
  const { moves, finalIsLeft } = isolateSteps(start, target);
  checkState(start, `${label} start`);
  out.states++;
  let before = start;
  moves.forEach((move, i) => {
    const { mid, cancelKeys } = buildIntermediate(move, before);
    const { keys } = checkState(mid, `${label} step ${i + 1} (${move.opLabel}) unsimplified`);
    tex.layout(operateCaption(move).tex);
    const why = cancelCaption(move, symbolTex(target), target);
    if (why) tex.layout(why.tex);
    if (move.kind !== 'negate') {
      const tokens = new Set(keys.map((k) => k.token));
      // A radical has no closing glyph; everything else that cancels must be on screen.
      const found = cancelKeys.filter((k) => tokens.has(k));
      expect(found.length, `${label} step ${i + 1}: nothing to cancel among ${cancelKeys.join(', ')}`).toBeGreaterThan(0);
      for (const k of cancelKeys) if (!k.endsWith('-close')) expect(tokens.has(k), `${label} step ${i + 1}: ${k} missing`).toBe(true);
      out.cancels += found.length;
    }
    checkState(move.stateAfter, `${label} step ${i + 1} simplified`);
    out.states += 2;
    before = move.stateAfter;
  });
  const last = moves.length ? moves[moves.length - 1].stateAfter : start;
  const settled = finalIsLeft ? last : mirror(last);
  if (!finalIsLeft) {
    checkState(settled, `${label} flipped`);
    out.states++;
  }
  return settled;
}

describe('every lesson state typesets', () => {
  for (const eq of EQUATIONS) {
    it(`${eq.name}`, () => {
      const out: Checked = { states: 0, cancels: 0 };
      for (const [orientation, start] of [
        ['as given', eq.initial],
        ['mirrored', mirror(eq.initial)],
      ] as const) {
        for (const v of eq.vars) {
          const label = `${eq.id} ${orientation} solve ${v.symbol}`;
          const settled = derive(start, v.symbol, label, out);
          for (const w of eq.vars) {
            if (w.symbol === v.symbol) continue;
            derive(settled, w.symbol, `${label} then ${w.symbol}`, out);
          }
        }
      }
      expect(out.states).toBeGreaterThan(0);
    });
  }
});

describe('the flip step', () => {
  it('pairs every token with its mirror image, in order', () => {
    for (const eq of EQUATIONS) {
      const a = equationTex(eq.initial);
      const b = equationTex(mirror(eq.initial));
      const side = (t: typeof a, s: 'L' | 'R') => [...t.tokens.values()].filter((m) => m.side === s);
      const [aL, aR, bL, bR] = [side(a, 'L'), side(a, 'R'), side(b, 'L'), side(b, 'R')];
      expect(aL.length).toBe(bR.length);
      expect(aR.length).toBe(bL.length);
      aL.forEach((m, i) => expect({ kind: bR[i].kind, symbol: bR[i].symbol }).toEqual({ kind: m.kind, symbol: m.symbol }));
      aR.forEach((m, i) => expect({ kind: bL[i].kind, symbol: bL[i].symbol }).toEqual({ kind: m.kind, symbol: m.symbol }));
    }
  });
});

describe('titles and captions', () => {
  it('every equation name and fixed caption typesets', () => {
    for (const eq of EQUATIONS) {
      expect(tex.layout(textTex(eq.name)).length).toBeGreaterThan(3);
      for (const v of eq.vars) {
        tex.layout(plainCaption('Solve for {0}: 3 steps', [{ symbol: v.symbol, tex: symbolTex(v.symbol) }]).tex);
        tex.layout(plainCaption('Swap the sides, so {0} is on the left', [{ symbol: v.symbol, tex: symbolTex(v.symbol) }]).tex);
      }
    }
    tex.layout(plainCaption('Click any variable to solve for it').tex);
  });
});
