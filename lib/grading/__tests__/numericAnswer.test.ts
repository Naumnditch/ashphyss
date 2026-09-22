import { describe, it, expect } from 'vitest';
import { gradeNumeric, parseQuantity, previewAnswer, specFromProblem } from '../numericAnswer';

/**
 * The module this covers is the one that broke trust in a live classroom:
 * correct answers typed in standard form were marked wrong. The first
 * block below is the regression itself — every one of those inputs is the
 * SAME number, and every one of them must grade correct.
 */

describe('regression: the classroom failure', () => {
  // What the old grader did: parseFloat() stops at the first character it
  // cannot read, so the student's answer collapsed to 1.8 and was compared
  // against 18000000000.
  it('documents why the old grader failed', () => {
    expect(parseFloat('1.8 x 10^10')).toBe(1.8);
    expect(parseFloat('1.8×10¹⁰')).toBe(1.8);
    expect(parseFloat('18,000,000,000')).toBe(18);
  });

  const expected = { value: 1.8e10, unit: 'N' };
  const sameNumber = [
    '1.8e10',
    '1.8E10',
    '1.8e+10',
    '1.80e10',
    '1.8 x 10^10',
    '1.8x10^10',
    '1.8*10^10',
    '1.8 X 10^10',
    '1.8 × 10^10',
    '1.8×10¹⁰',
    '1.8 · 10^10',
    '1.8 \\times 10^{10}',
    '1.8 10^10',
    '18000000000',
    '18,000,000,000',
    '1.8e10 N',
    '1.8e10 newtons',
    '18000000000 N',
  ];

  for (const input of sameNumber) {
    it(`accepts ${JSON.stringify(input)}`, () => {
      const result = gradeNumeric(input, expected);
      expect(result.correct, `${input} -> ${result.reason} (${result.parsedValue})`).toBe(true);
      expect(result.reason).toBe('match');
      expect(result.parsedValue).toBeCloseTo(1.8e10, -5);
    });
  }

  // Straight from problem_submissions: a student answered the "magnitude of
  // the force" question with the signed value and was marked wrong.
  it('accepts a negative answer to a magnitude question (0.03% off, sign flipped)', () => {
    const result = gradeNumeric('-8437500', { value: 8.44e6 });
    expect(result.correct).toBe(true);
  });
});

describe('parsing forms', () => {
  it('parses a bare power of ten as mantissa 1', () => {
    expect(parseQuantity('10^6')?.value).toBe(1e6);
    expect(parseQuantity('10^-6')?.value).toBeCloseTo(1e-6, 12);
  });

  it('parses superscript exponents including negative ones', () => {
    expect(parseQuantity('2.5 × 10⁻⁶')?.value).toBeCloseTo(2.5e-6, 12);
    expect(parseQuantity('4.67×10¹¹')?.value).toBeCloseTo(4.67e11, 2);
  });

  it('parses plain decimals, leading dot, and explicit signs', () => {
    expect(parseQuantity('112.5')?.value).toBe(112.5);
    expect(parseQuantity('.5')?.value).toBe(0.5);
    expect(parseQuantity('-225')?.value).toBe(-225);
    expect(parseQuantity('+225')?.value).toBe(225);
  });

  it('parses the unicode minus sign (U+2212)', () => {
    expect(parseQuantity('−225')?.value).toBe(-225);
  });

  it('strips LaTeX noise', () => {
    expect(parseQuantity('$1.8 \\times 10^{10}$')?.value).toBeCloseTo(1.8e10, -5);
    expect(parseQuantity('9.0 \\cdot 10^{9}')?.value).toBeCloseTo(9.0e9, -4);
  });

  it('keeps a decimal point while stripping thousands separators', () => {
    expect(parseQuantity('1,234.5')?.value).toBe(1234.5);
  });

  it('returns null for input with no number in it', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
    expect(parseQuantity('about nine billion')).toBeNull();
    expect(parseQuantity('N')).toBeNull();
  });
});

describe('units and SI prefixes', () => {
  it('reads a unit off the end of the answer', () => {
    const q = parseQuantity('225 N');
    expect(q?.value).toBe(225);
    expect(q?.unit).toBe('N');
  });

  it('converts SI prefixes to base units', () => {
    expect(parseQuantity('20.0 cm')?.value).toBeCloseTo(0.2, 12);
    expect(parseQuantity('10.0 µC')?.value).toBeCloseTo(1e-5, 15);
    expect(parseQuantity('10.0 uC')?.value).toBeCloseTo(1e-5, 15);
    expect(parseQuantity('5 kN')?.value).toBe(5000);
    expect(parseQuantity('2 MN')?.value).toBe(2e6);
    expect(parseQuantity('3 GN')?.value).toBe(3e9);
    expect(parseQuantity('4 nC')?.value).toBeCloseTo(4e-9, 18);
    expect(parseQuantity('250 mN')?.value).toBeCloseTo(0.25, 12);
  });

  it('does not confuse the milli prefix with mega (case matters)', () => {
    expect(parseQuantity('1 mN')?.value).toBeCloseTo(1e-3, 12);
    expect(parseQuantity('1 MN')?.value).toBe(1e6);
  });

  it('accepts full-word and plural unit names', () => {
    expect(parseQuantity('5 newtons')?.unit).toBe('N');
    expect(parseQuantity('5 newton')?.unit).toBe('N');
    expect(parseQuantity('5 coulombs')?.unit).toBe('C');
    expect(parseQuantity('5 metres')?.unit).toBe('m');
    expect(parseQuantity('5 meters')?.unit).toBe('m');
    expect(parseQuantity('5 joules')?.unit).toBe('J');
    expect(parseQuantity('5 volts')?.unit).toBe('V');
    expect(parseQuantity('5 seconds')?.unit).toBe('s');
    expect(parseQuantity('5 kilograms')?.unit).toBe('kg');
  });

  it('grades a right number in the wrong unit as wrong-unit, not wrong-value', () => {
    const result = gradeNumeric('225 mN', { value: 225, unit: 'N' });
    expect(result.correct).toBe(false);
    expect(result.reason).toBe('wrong-unit');
    expect(result.feedback).toMatch(/newtons/i);
  });

  it('grades a dimensionally wrong unit as wrong-unit', () => {
    const result = gradeNumeric('225 C', { value: 225, unit: 'N' });
    expect(result.correct).toBe(false);
    expect(result.reason).toBe('wrong-unit');
  });

  it('accepts the correct unit', () => {
    expect(gradeNumeric('225 N', { value: 225, unit: 'N' }).correct).toBe(true);
  });

  it('accepts an equivalent prefixed unit that converts to the same value', () => {
    expect(gradeNumeric('0.225 kN', { value: 225, unit: 'N' }).correct).toBe(true);
  });

  it('grades on value alone when no unit is supplied and none is required', () => {
    expect(gradeNumeric('225', { value: 225, unit: 'N' }).correct).toBe(true);
  });

  it('demands a unit when unitRequired is set', () => {
    const result = gradeNumeric('225', { value: 225, unit: 'N', unitRequired: true });
    expect(result.correct).toBe(false);
    expect(result.reason).toBe('wrong-unit');
  });
});

describe('tolerance', () => {
  it('accepts k = 9.0e9 vs 8.99e9 (0.11% apart)', () => {
    expect(gradeNumeric('8.99e9', { value: 9.0e9 }).correct).toBe(true);
  });

  it('accepts just inside the 2% default boundary', () => {
    expect(gradeNumeric('101.9', { value: 100 }).correct).toBe(true);
    expect(gradeNumeric('98.1', { value: 100 }).correct).toBe(true);
  });

  it('rejects just outside the 2% default boundary', () => {
    const result = gradeNumeric('102.1', { value: 100 });
    expect(result.correct).toBe(false);
    expect(result.reason).toBe('close');
  });

  it('accepts exactly at the boundary', () => {
    expect(gradeNumeric('102', { value: 100 }).correct).toBe(true);
  });

  it('honours a per-question tolerance override', () => {
    expect(gradeNumeric('104', { value: 100, tolerance: 0.05 }).correct).toBe(true);
    expect(gradeNumeric('100.5', { value: 100, tolerance: 0.001 }).correct).toBe(false);
  });

  it('falls back to an absolute epsilon when the expected value is zero', () => {
    expect(gradeNumeric('0', { value: 0 }).correct).toBe(true);
    expect(gradeNumeric('0.5', { value: 0 }).correct).toBe(false);
  });

  it('reports close for something within 10% but outside tolerance', () => {
    const result = gradeNumeric('105', { value: 100 });
    expect(result.reason).toBe('close');
    expect(result.feedback).toMatch(/rounding/i);
  });

  it('reports wrong-value for something well outside', () => {
    const result = gradeNumeric('46656', { value: 4.67e11 });
    expect(result.reason).toBe('wrong-value');
  });
});

describe('sign', () => {
  it('ignores sign by default', () => {
    expect(gradeNumeric('-225', { value: 225 }).correct).toBe(true);
    expect(gradeNumeric('225', { value: -225 }).correct).toBe(true);
  });

  it('respects sign when signSensitive is set', () => {
    const result = gradeNumeric('-225', { value: 225, signSensitive: true });
    expect(result.correct).toBe(false);
    expect(result.feedback).toMatch(/sign|direction/i);
  });

  it('still accepts the right sign when signSensitive is set', () => {
    expect(gradeNumeric('-225', { value: -225, signSensitive: true }).correct).toBe(true);
  });
});

describe('alternates', () => {
  it('accepts an alternate value', () => {
    expect(gradeNumeric('0.2', { value: 0.335, alternates: [0.2] }).correct).toBe(true);
  });
});

describe('unparseable', () => {
  for (const input of ['', '   ', 'dunno', '??', 'N', 'x10^']) {
    it(`reports unparseable for ${JSON.stringify(input)}`, () => {
      const result = gradeNumeric(input, { value: 1.8e10 });
      expect(result.correct).toBe(false);
      expect(result.reason).toBe('unparseable');
      expect(result.parsedValue).toBeNull();
      expect(result.feedback).toMatch(/1\.8e10/);
    });
  }
});

describe('feedback', () => {
  it('is never a bare "Incorrect."', () => {
    const inputs = ['225 mN', '105', '46656', 'dunno', '225'];
    for (const input of inputs) {
      const { feedback } = gradeNumeric(input, { value: 225, unit: 'N' });
      expect(feedback.length).toBeGreaterThan(20);
      expect(feedback.toLowerCase()).not.toBe('incorrect.');
    }
  });

  it('echoes back how the answer was read', () => {
    const result = gradeNumeric('1.8e10', { value: 1.8e10, unit: 'N' });
    expect(result.parsedValue).toBeCloseTo(1.8e10, -5);
    expect(result.correct).toBe(true);
  });
});

describe('live preview (the thing that would have caught the classroom failure)', () => {
  it('shows standard form the way it is written on the board', () => {
    expect(previewAnswer('1.8 x 10^10')).toBe('1.8 × 10¹⁰');
    expect(previewAnswer('1.8e10 N')).toBe('1.8 × 10¹⁰ N');
    expect(previewAnswer('2.5e-6 C')).toBe('2.5 × 10⁻⁶ C');
    expect(previewAnswer('112.5')).toBe('112.5');
    expect(previewAnswer('20 cm')).toBe('0.2 m');
  });

  it('shows nothing rather than an error while the answer is still half-typed', () => {
    expect(previewAnswer('')).toBeNull();
    expect(previewAnswer('   ')).toBeNull();
    expect(previewAnswer('1.8 x 10^')).toBe('1.8');
    expect(previewAnswer('abc')).toBeNull();
  });
});

describe('specFromProblem', () => {
  it('reads a bare numeric answer key', () => {
    const spec = specFromProblem({ answer_correct: '1.8e10' });
    expect(spec).not.toBeNull();
    expect(spec!.value).toBeCloseTo(1.8e10, -5);
    expect(spec!.unit).toBeNull();
    expect(gradeNumeric('1.8 x 10^10', spec!).correct).toBe(true);
  });

  it('applies per-question overrides from the problems row', () => {
    const spec = specFromProblem({
      answer_correct: '112.5',
      answer_unit: 'N',
      answer_unit_required: true,
      answer_tolerance: '0.05',
      answer_sign_sensitive: false,
      answer_alternates: ['113'],
    })!;
    expect(spec.tolerance).toBe(0.05);
    expect(spec.unit).toBe('N');
    expect(gradeNumeric('112.5', spec).reason).toBe('wrong-unit'); // unit required
    expect(gradeNumeric('116 N', spec).correct).toBe(true); // inside 5%
    expect(gradeNumeric('113 N', spec).correct).toBe(true);
  });

  it('accepts the key’s own unit when the key is written with a prefix', () => {
    const spec = specFromProblem({ answer_correct: '20 cm' })!;
    expect(spec.value).toBeCloseTo(0.2, 12);
    expect(gradeNumeric('20 cm', spec).correct).toBe(true);
    expect(gradeNumeric('0.2 m', spec).correct).toBe(true);
    expect(gradeNumeric('20', spec).correct).toBe(true); // answered in the key's unit
  });

  it('returns null when the answer key is not a number', () => {
    expect(specFromProblem({ answer_correct: 'increases' })).toBeNull();
    expect(specFromProblem({ answer_correct: null })).toBeNull();
  });
});
