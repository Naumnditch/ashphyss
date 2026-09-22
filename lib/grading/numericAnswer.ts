/**
 * Physics-aware grading for free numeric entry.
 *
 * This module exists because the old grader was a bare `parseFloat()`:
 * a student who typed "1.8 x 10^10" had their answer silently truncated
 * to 1.8 and marked wrong in front of a class. Everything here is pure —
 * no database, no React, no side effects — so it can be unit tested
 * exhaustively (see __tests__/numericAnswer.test.ts) and shared by the
 * submit route, the backfill script and the client-side preview.
 *
 * The pipeline, in order:
 *   1. trim + collapse whitespace
 *   2. fold superscript runs to ^ + ASCII digits (BEFORE any digit work,
 *      so 10¹⁰ becomes 10^10 and not 1010)
 *   3. strip LaTeX noise (\times \cdot \, { } $)
 *   4. fold unicode operators (× → x, · → *, − → -, µ → u, nbsp → space)
 *   5. strip thousands separators (commas between digits only)
 *   6. match the numeric expression at the head of the string; whatever
 *      trails it is the unit
 *   7. resolve the unit and convert any SI prefix to the base unit
 *   8. compare against the expected value with a relative tolerance
 *
 * Note on case: the string is never lowercased wholesale. "MN" (meganewton)
 * and "mN" (millinewton) differ by a factor of 10^9, so unit case is
 * preserved and only the numeric portion is matched case-insensitively.
 */

export interface NumericAnswerSpec {
  /** Expected value, expressed in the base unit (N, C, m, J, V, kg, s...). */
  value: number;
  /** Expected unit, as a symbol ("N") or full word ("newtons"). Optional. */
  unit?: string | null;
  /** When true, an answer with no unit is marked wrong. Default false. */
  unitRequired?: boolean;
  /** Relative tolerance. Default 0.02 (2%). */
  tolerance?: number;
  /** When true, -5 is not accepted for +5. Default false (magnitude questions). */
  signSensitive?: boolean;
  /** Other values that are also acceptable (e.g. a legitimate rounding path). */
  alternates?: Array<number | { value: number; unit?: string | null }>;
  /**
   * The expected value as the answer key literally wrote it, when the key
   * used a prefixed unit ("20 cm" -> value 0.2, valueAsWritten 20). A student
   * who types "20" with no unit is answering in the key's own unit, so that
   * is accepted too. Set automatically by specFromProblem.
   */
  valueAsWritten?: number;
}

export type GradeReason = 'match' | 'wrong-value' | 'wrong-unit' | 'unparseable' | 'close';

export interface GradeResult {
  correct: boolean;
  reason: GradeReason;
  /** The answer as the grader read it, converted to the base unit. */
  parsedValue: number | null;
  /** The canonical base unit the grader read, if any. */
  parsedUnit: string | null;
  /** Student-facing explanation. Never a bare "Incorrect." */
  feedback: string;
}

export interface ParsedQuantity {
  /** Value converted to the base unit (20 cm -> 0.2). */
  value: number;
  /** Canonical base unit symbol, or null if none was given. */
  unit: string | null;
  /** The number exactly as typed, before SI prefix conversion (20 cm -> 20). */
  mantissa: number;
  /** The SI prefix multiplier that was applied (20 cm -> 0.01). */
  prefixFactor: number;
  /** The unit token as typed ("cm"), or null. */
  rawUnit: string | null;
  /** True when something trailed the number that isn't a unit we know. */
  unknownUnit: boolean;
  /** The normalized string the parser actually worked on (useful in tests). */
  normalized: string;
}

export const DEFAULT_TOLERANCE = 0.02;
/** Outside tolerance but inside this band is reported as "close", not plain wrong. */
const CLOSE_BAND = 0.1;
/** Fallback window when the expected value is zero or vanishingly small. */
const ABSOLUTE_EPSILON = 1e-12;
/** The format hint shown to students; kept in sync with the input's helper line. */
export const FORMAT_HINT = 'Standard form is fine — for example 1.8e10 or 1.8 x 10^10.';

// ---------------------------------------------------------------- normalize

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-',
};

const SUPERSCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g;

function foldSuperscripts(input: string): string {
  return input.replace(SUPERSCRIPT_RUN, (run) => {
    let out = '';
    for (const ch of run) out += SUPERSCRIPTS[ch] ?? '';
    return '^' + out;
  });
}

function stripLatex(input: string): string {
  return input
    .replace(/\\times/g, ' x ')
    .replace(/\\cdot/g, ' * ')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!:> ]/g, ' ')
    .replace(/[{}$]/g, '')
    .replace(/\\/g, '');
}

function foldUnicode(input: string): string {
  return input
    .replace(/[×✕✖]/g, 'x')
    .replace(/[·⋅•∙]/g, '*')
    .replace(/[−–—]/g, '-')
    .replace(/[µμ]/g, 'u')
    // Exotic spaces (no-break, thin, hair) that come in with text pasted
    // out of a PDF are already folded by the /\s+/ collapse in normalize().
    .replace(/[''`´]/g, '');
}

function stripThousandsSeparators(input: string): string {
  // Only commas sitting between digits with exactly three digits after them.
  // Applied one at a time so runs like 18,000,000,000 fully collapse without
  // needing lookbehind (which older Safari on school iPads doesn't support).
  let out = input;
  const pattern = /(\d),(\d{3})(?!\d)/;
  for (let i = 0; i < 20 && pattern.test(out); i++) {
    out = out.replace(pattern, '$1$2');
  }
  return out;
}

function normalize(raw: string): string {
  let s = String(raw ?? '');
  s = foldSuperscripts(s);
  s = stripLatex(s);
  s = foldUnicode(s);
  s = s.replace(/\s+/g, ' ').trim();
  s = stripThousandsSeparators(s);
  return s;
}

// -------------------------------------------------------------------- units

const SI_PREFIXES: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  c: 1e-2,
  k: 1e3,
  M: 1e6,
  G: 1e9,
};

const PREFIX_WORDS: Record<string, number> = {
  nano: 1e-9,
  micro: 1e-6,
  milli: 1e-3,
  centi: 1e-2,
  kilo: 1e3,
  mega: 1e6,
  giga: 1e9,
};

/** Base unit symbols, matched case-sensitively, mapped to {canonical, factor}. */
const BASE_UNITS: Record<string, { unit: string; factor: number }> = {
  N: { unit: 'N', factor: 1 },
  C: { unit: 'C', factor: 1 },
  m: { unit: 'm', factor: 1 },
  J: { unit: 'J', factor: 1 },
  V: { unit: 'V', factor: 1 },
  s: { unit: 's', factor: 1 },
  A: { unit: 'A', factor: 1 },
  W: { unit: 'W', factor: 1 },
  K: { unit: 'K', factor: 1 },
  T: { unit: 'T', factor: 1 },
  Hz: { unit: 'Hz', factor: 1 },
  Pa: { unit: 'Pa', factor: 1 },
  kg: { unit: 'kg', factor: 1 },
  g: { unit: 'kg', factor: 1e-3 },
};

/** Full words and plurals, matched case-insensitively. */
const UNIT_WORDS: Record<string, { unit: string; factor: number }> = {
  newton: { unit: 'N', factor: 1 },
  newtons: { unit: 'N', factor: 1 },
  coulomb: { unit: 'C', factor: 1 },
  coulombs: { unit: 'C', factor: 1 },
  metre: { unit: 'm', factor: 1 },
  metres: { unit: 'm', factor: 1 },
  meter: { unit: 'm', factor: 1 },
  meters: { unit: 'm', factor: 1 },
  joule: { unit: 'J', factor: 1 },
  joules: { unit: 'J', factor: 1 },
  volt: { unit: 'V', factor: 1 },
  volts: { unit: 'V', factor: 1 },
  second: { unit: 's', factor: 1 },
  seconds: { unit: 's', factor: 1 },
  amp: { unit: 'A', factor: 1 },
  amps: { unit: 'A', factor: 1 },
  ampere: { unit: 'A', factor: 1 },
  amperes: { unit: 'A', factor: 1 },
  watt: { unit: 'W', factor: 1 },
  watts: { unit: 'W', factor: 1 },
  kelvin: { unit: 'K', factor: 1 },
  pascal: { unit: 'Pa', factor: 1 },
  pascals: { unit: 'Pa', factor: 1 },
  hertz: { unit: 'Hz', factor: 1 },
  tesla: { unit: 'T', factor: 1 },
  gram: { unit: 'kg', factor: 1e-3 },
  grams: { unit: 'kg', factor: 1e-3 },
  gramme: { unit: 'kg', factor: 1e-3 },
  grammes: { unit: 'kg', factor: 1e-3 },
  kilogram: { unit: 'kg', factor: 1 },
  kilograms: { unit: 'kg', factor: 1 },
};

const UNIT_NAMES: Record<string, string> = {
  N: 'newtons',
  C: 'coulombs',
  m: 'metres',
  J: 'joules',
  V: 'volts',
  s: 'seconds',
  kg: 'kilograms',
  A: 'amperes',
  W: 'watts',
  K: 'kelvin',
  T: 'tesla',
  Hz: 'hertz',
  Pa: 'pascals',
};

/** Spells a canonical unit out in words, for feedback ("N" -> "newtons"). */
export function unitName(unit: string | null | undefined): string | null {
  if (!unit) return null;
  return UNIT_NAMES[unit] ?? unit;
}

interface ResolvedUnit {
  unit: string;
  /** Multiplier taking the typed number to the base unit (cm -> 0.01). */
  factor: number;
  /** The SI prefix part of that multiplier (cm -> 0.01, N -> 1). */
  prefixFactor: number;
}

/**
 * Resolves a unit token to a canonical base unit. Case matters for symbols
 * (mN vs MN) but not for spelled-out words.
 */
export function resolveUnit(token: string): ResolvedUnit | null {
  const raw = token.trim().replace(/[.,;:)\]]+$/, '');
  if (!raw) return null;

  const exact = BASE_UNITS[raw];
  if (exact) return { unit: exact.unit, factor: exact.factor, prefixFactor: 1 };

  const lower = raw.toLowerCase();
  const word = UNIT_WORDS[lower];
  if (word) return { unit: word.unit, factor: word.factor, prefixFactor: 1 };

  // Symbol with an SI prefix: cm, mN, MN, uC, kN, GN...
  if (raw.length > 1) {
    const prefix = SI_PREFIXES[raw[0]];
    const rest = BASE_UNITS[raw.slice(1)];
    if (prefix !== undefined && rest) {
      return { unit: rest.unit, factor: prefix * rest.factor, prefixFactor: prefix };
    }
  }

  // Spelled-out prefix: kilonewtons, micro coulombs, millinewton...
  for (const [prefixWord, prefixFactor] of Object.entries(PREFIX_WORDS)) {
    if (lower.startsWith(prefixWord) && lower.length > prefixWord.length) {
      const rest = UNIT_WORDS[lower.slice(prefixWord.length)];
      if (rest) {
        return { unit: rest.unit, factor: prefixFactor * rest.factor, prefixFactor };
      }
    }
  }

  return null;
}

// ------------------------------------------------------------------- parsing

const SCIENTIFIC = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))[eE]\s*([+-]?\d+)/;
const MANTISSA_POWER = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:[xX*]\s*)?10\s*\^\s*([+-]?\d+)/;
const BARE_POWER = /^([+-]?)10\s*\^\s*([+-]?\d+)/;
const PLAIN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))/;

function decimalValue(mantissa: string, exponent: string | null): number {
  const m = mantissa === '' || mantissa === '+' ? '1' : mantissa === '-' ? '-1' : mantissa;
  return exponent === null ? Number(m) : Number(`${m}e${exponent}`);
}

/**
 * Reads a physical quantity out of whatever a student typed. Returns null
 * when there is no number in there at all.
 */
export function parseQuantity(raw: string): ParsedQuantity | null {
  const normalized = normalize(raw);
  if (!normalized) return null;

  let mantissa: number | null = null;
  let rest = '';

  const attempts: Array<[RegExp, (m: RegExpMatchArray) => number]> = [
    [SCIENTIFIC, (m) => decimalValue(m[1], m[2])],
    [MANTISSA_POWER, (m) => decimalValue(m[1], m[2])],
    [BARE_POWER, (m) => decimalValue(m[1] === '-' ? '-1' : '1', m[2])],
    [PLAIN, (m) => decimalValue(m[1], null)],
  ];

  for (const [pattern, toValue] of attempts) {
    const match = normalized.match(pattern);
    if (match) {
      const value = toValue(match);
      if (!Number.isFinite(value)) continue;
      mantissa = value;
      rest = normalized.slice(match[0].length).trim();
      break;
    }
  }

  if (mantissa === null) return null;

  if (!rest) {
    return {
      value: mantissa,
      unit: null,
      mantissa,
      prefixFactor: 1,
      rawUnit: null,
      unknownUnit: false,
      normalized,
    };
  }

  const resolved = resolveUnit(rest);
  if (!resolved) {
    return {
      value: mantissa,
      unit: null,
      mantissa,
      prefixFactor: 1,
      rawUnit: rest,
      unknownUnit: true,
      normalized,
    };
  }

  return {
    value: mantissa * resolved.factor,
    unit: resolved.unit,
    mantissa,
    prefixFactor: resolved.prefixFactor,
    rawUnit: rest,
    unknownUnit: false,
    normalized,
  };
}

// ---------------------------------------------------------------- formatting

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻',
};

function toSuperscript(exponent: number): string {
  return String(exponent)
    .split('')
    .map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch)
    .join('');
}

/** Renders a number the way a physics teacher would write it on the board. */
export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';

  const magnitude = Math.abs(value);
  if (magnitude >= 1e4 || magnitude < 1e-3) {
    const exponent = Math.floor(Math.log10(magnitude));
    const mantissa = value / Math.pow(10, exponent);
    const rounded = Number(mantissa.toPrecision(4));
    return `${trimZeros(rounded)} × 10${toSuperscript(exponent)}`;
  }
  return trimZeros(Number(value.toPrecision(6)));
}

function trimZeros(value: number): string {
  return String(value);
}

/** "1.8 × 10¹⁰ N" — used by the feedback strings and the live input preview. */
export function formatQuantity(value: number, unit?: string | null): string {
  return unit ? `${formatValue(value)} ${unit}` : formatValue(value);
}

/**
 * What the input box shows under the field as the student types. Returns null
 * when there's nothing readable yet, so the UI can simply hide the line. This
 * never blocks input — it is a mirror, not a validator.
 */
export function previewAnswer(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const parsed = parseQuantity(raw);
  if (!parsed) return null;
  return formatQuantity(parsed.value, parsed.unit);
}

// ------------------------------------------------------------------ grading

function toleranceWindow(expected: number, tolerance: number): number {
  const relative = Math.abs(expected) * tolerance;
  // A hair of slack so an answer exactly on the boundary (102 against 100 at
  // 2%) isn't rejected by floating-point noise.
  return Math.max(relative * (1 + 1e-9), ABSOLUTE_EPSILON);
}

function relativeError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual) === 0 ? 0 : Infinity;
  return Math.abs(actual - expected) / Math.abs(expected);
}

function specOf(alternate: number | { value: number; unit?: string | null }, base: NumericAnswerSpec): NumericAnswerSpec {
  const { alternates: _ignored, ...rest } = base;
  if (typeof alternate === 'number') return { ...rest, value: alternate };
  return { ...rest, value: alternate.value, unit: alternate.unit ?? base.unit };
}

/**
 * Grades one free-entry numeric answer. Pure: same input, same result.
 */
export function gradeNumeric(input: string, spec: NumericAnswerSpec): GradeResult {
  const primary = gradeAgainst(input, spec);
  if (primary.correct || !spec.alternates?.length) return primary;

  for (const alternate of spec.alternates) {
    const attempt = gradeAgainst(input, specOf(alternate, spec));
    if (attempt.correct) return attempt;
  }
  return primary;
}

/**
 * Row shape the grader needs out of `problems`. Kept structural rather than
 * importing a DB type so this module stays dependency-free and testable.
 */
export interface ProblemAnswerColumns {
  answer_correct: string | null;
  answer_unit?: string | null;
  answer_unit_required?: boolean | null;
  answer_tolerance?: number | string | null;
  answer_sign_sensitive?: boolean | null;
  answer_alternates?: string[] | null;
}

/**
 * Builds a grading spec from a `problems` row. Returns null when the stored
 * correct answer isn't a number at all — the caller should then fall back to
 * string comparison rather than silently marking everything wrong.
 */
export function specFromProblem(row: ProblemAnswerColumns): NumericAnswerSpec | null {
  const expected = parseQuantity(String(row.answer_correct ?? ''));
  if (!expected) return null;

  const tolerance =
    row.answer_tolerance === null || row.answer_tolerance === undefined
      ? undefined
      : Number(row.answer_tolerance);

  const alternates = (row.answer_alternates ?? [])
    .map((alt) => parseQuantity(String(alt)))
    .filter((alt): alt is ParsedQuantity => alt !== null)
    .map((alt) => alt.value);

  return {
    value: expected.value,
    // A unit stored on the answer itself ("225 N") counts as the expected unit
    // unless the question overrides it.
    unit: row.answer_unit ?? expected.unit ?? null,
    unitRequired: row.answer_unit_required ?? false,
    tolerance: tolerance !== undefined && Number.isFinite(tolerance) ? tolerance : undefined,
    signSensitive: row.answer_sign_sensitive ?? false,
    alternates: alternates.length ? alternates : undefined,
    valueAsWritten: expected.prefixFactor !== 1 ? expected.mantissa : undefined,
  };
}

function gradeAgainst(input: string, spec: NumericAnswerSpec): GradeResult {
  const tolerance = spec.tolerance ?? DEFAULT_TOLERANCE;
  const expectedUnit = spec.unit ? resolveUnit(spec.unit)?.unit ?? null : null;
  const expectedName = unitName(expectedUnit);
  const parsed = parseQuantity(input);

  if (!parsed) {
    return {
      correct: false,
      reason: 'unparseable',
      parsedValue: null,
      parsedUnit: null,
      feedback: `I couldn't read a number in that answer. ${FORMAT_HINT}`,
    };
  }

  // --- unit checks -------------------------------------------------------
  if (expectedUnit) {
    if (parsed.unknownUnit) {
      return {
        correct: false,
        reason: 'wrong-unit',
        parsedValue: parsed.value,
        parsedUnit: null,
        feedback: `I read the number as ${formatValue(parsed.value)}, but "${parsed.rawUnit}" isn't a unit I recognise. This answer should be in ${expectedName}.`,
      };
    }
    if (!parsed.unit && spec.unitRequired) {
      return {
        correct: false,
        reason: 'wrong-unit',
        parsedValue: parsed.value,
        parsedUnit: null,
        feedback: `This question needs a unit as well as a number — give your answer in ${expectedName}.`,
      };
    }
    if (parsed.unit && parsed.unit !== expectedUnit) {
      return {
        correct: false,
        reason: 'wrong-unit',
        parsedValue: parsed.value,
        parsedUnit: parsed.unit,
        feedback: `That's a value in ${unitName(parsed.unit)}, but this question asks for an answer in ${expectedName}. Check which quantity you've calculated.`,
      };
    }
  }

  // --- value check -------------------------------------------------------
  const expected = spec.value;
  const signSensitive = spec.signSensitive ?? false;
  const actual = signSensitive ? parsed.value : Math.abs(parsed.value);
  const target = signSensitive ? expected : Math.abs(expected);
  const window = toleranceWindow(target, tolerance);

  if (Math.abs(actual - target) <= window) {
    return {
      correct: true,
      reason: 'match',
      parsedValue: parsed.value,
      parsedUnit: parsed.unit,
      feedback: `Correct — I read your answer as ${formatQuantity(parsed.value, parsed.unit ?? expectedUnit)}.`,
    };
  }

  // The answer key was written in a prefixed unit ("20 cm") and the student
  // typed the same number without a unit. They answered in the key's unit.
  if (spec.valueAsWritten !== undefined && !parsed.unit && !parsed.unknownUnit) {
    const written = signSensitive ? spec.valueAsWritten : Math.abs(spec.valueAsWritten);
    if (Math.abs(actual - written) <= toleranceWindow(written, tolerance)) {
      return {
        correct: true,
        reason: 'match',
        parsedValue: parsed.value,
        parsedUnit: null,
        feedback: `Correct — I read your answer as ${formatQuantity(spec.valueAsWritten, null)}${expectedName ? ` (${formatQuantity(expected, expectedUnit)})` : ''}.`,
      };
    }
  }

  // Right number, wrong scale: 225 mN when the answer is 225 N.
  if (parsed.prefixFactor !== 1) {
    const rawActual = signSensitive ? parsed.mantissa : Math.abs(parsed.mantissa);
    if (Math.abs(rawActual - target) <= window) {
      return {
        correct: false,
        reason: 'wrong-unit',
        parsedValue: parsed.value,
        parsedUnit: parsed.unit,
        feedback: `The number is right but the unit isn't: you wrote ${parsed.mantissa} ${parsed.rawUnit}, which is ${formatQuantity(parsed.value, parsed.unit)}. The answer should be in ${expectedName ?? unitName(parsed.unit)} — check your prefix.`,
      };
    }
  }

  // Right magnitude, wrong sign, on a question where direction matters.
  if (signSensitive && Math.abs(Math.abs(actual) - Math.abs(target)) <= toleranceWindow(Math.abs(target), tolerance)) {
    return {
      correct: false,
      reason: 'close',
      parsedValue: parsed.value,
      parsedUnit: parsed.unit,
      feedback: `The size of your answer is right, but the sign is wrong — this question cares about direction, so check which way the quantity points.`,
    };
  }

  const error = relativeError(actual, target);
  if (error <= CLOSE_BAND) {
    return {
      correct: false,
      reason: 'close',
      parsedValue: parsed.value,
      parsedUnit: parsed.unit,
      feedback: `Very close — you're within a few percent. Check your rounding and carry full precision through the intermediate steps rather than rounding as you go.`,
    };
  }

  return {
    correct: false,
    reason: 'wrong-value',
    parsedValue: parsed.value,
    parsedUnit: parsed.unit,
    feedback: `I read your answer as ${formatQuantity(parsed.value, parsed.unit ?? expectedUnit)}, which isn't the right size. Re-check the numbers you substituted in and the powers of ten.`,
  };
}
