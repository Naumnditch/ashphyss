import { describe, expect, it } from 'vitest';
import { loadTexEngine, multiply, parseTransform } from '../tex';
import { smooth, thereAndBack, subAlpha, linear, integerInterpolate, rushInto, rushFrom, doubleSmooth } from '../rate';

describe('rate functions', () => {
  it('match Manim at the key points', () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5, 12);
    // (sigmoid(-2.5) - sigmoid(-5)) / (1 - 2 sigmoid(-5))
    expect(smooth(0.25)).toBeCloseTo(0.0701, 3);
    expect(thereAndBack(0.5)).toBe(1);
    expect(thereAndBack(0)).toBe(0);
    expect(rushInto(1)).toBeCloseTo(1, 12);
    expect(rushFrom(0)).toBeCloseTo(0, 12);
    expect(doubleSmooth(0.5)).toBeCloseTo(0.5, 12);
  });

  it('stagger submobjects like Animation.get_sub_alpha', () => {
    // three pieces, lag 0.5: the last starts at alpha 0.5
    expect(subAlpha(0.5, 2, 3, 0.5, linear)).toBe(0);
    expect(subAlpha(1, 2, 3, 0.5, linear)).toBe(1);
    expect(subAlpha(0.25, 0, 3, 0.5, linear)).toBeCloseTo(0.5, 12);
  });

  it('integer_interpolate', () => {
    expect(integerInterpolate(0, 2, 0.25)).toEqual([0, 0.5]);
    expect(integerInterpolate(0, 2, 0.75)).toEqual([1, 0.5]);
    expect(integerInterpolate(0, 2, 1)).toEqual([1, 1]);
  });
});

describe('transforms', () => {
  it('compose translate and scale lists', () => {
    const m = parseTransform('translate(3015,1176.6) scale(0.707)');
    expect(m[0]).toBeCloseTo(0.707);
    expect(m[4]).toBeCloseTo(3015);
    const p = multiply(parseTransform('translate(10 20)'), parseTransform('scale(2)'));
    expect(p).toEqual([2, 0, 0, 2, 10, 20]);
  });
});

describe('MathJax layout', () => {
  it('returns every glyph with its class and position', async () => {
    const tex = await loadTexEngine();
    const glyphs = tex.layout('\\class{kF}{F} = \\class{kbar}{\\dfrac{\\class{km}{m}}{\\class{ka}{a}}}');
    const chars = glyphs.map((g) => g.char);
    expect(chars).toContain('=');
    expect(glyphs.find((g) => g.cls === 'kF')?.char).toBe('\u{1D439}');
    const bar = glyphs.find((g) => g.char === '▬');
    expect(bar?.cls).toBe('kbar');
    // m sits above the bar, a below it
    const y = (cls: string) => glyphs.find((g) => g.cls === cls)!.m[5];
    expect(y('km')).toBeGreaterThan(0);
    expect(y('ka')).toBeLessThan(0);
  });

  it('throws on bad TeX', async () => {
    const tex = await loadTexEngine();
    expect(() => tex.layout('\\frac{1}')).toThrow();
  });
});
