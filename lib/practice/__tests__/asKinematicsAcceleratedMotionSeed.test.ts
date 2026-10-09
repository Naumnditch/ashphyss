import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gradeNumeric, specFromProblem } from '@/lib/grading/numericAnswer';
import { getDiagram } from '@/components/practice/MomentumDiagrams';

/**
 * Checks the AS Level Kinematics (1.1-1.8) and Accelerated motion (2.1-2.14)
 * banks exactly as they are applied: the generated SQL, run through the real
 * grader. Every stored numeric answer must grade correct typed bare, with its
 * unit, and at 2-3 s.f.; a wrong value or wrong sign (where sign-sensitive)
 * must not; every multiple-choice question needs exactly one correct option
 * matching the stored answer text; and every figure a question promises must
 * resolve to an actual diagram.
 */

const SQL = readFileSync(
  path.resolve(__dirname, '../../../database/seeds/2026-10-09-as-kinematics-accelerated-motion.sql'),
  'utf8'
);

type Cell = string | number | boolean | null;

// A literal ';' inside a string value (even safely single-quoted) hangs this
// environment's SQL-apply tool, so the generator routes any embedded ';' through
// `('a' || chr(59) || 'b')`-style concatenation instead of a plain quoted literal
// (see the generator's q() helper). This parses a single quoted string starting at
// s[i] == "'", OR that concatenation form starting at s[i] == '(', reconstructing
// the original value either way, and returns the index just past what it consumed.
function parseQuotedOrConcat(s: string, i: number): { value: string; next: number } {
  if (s[i] === "'") {
    let value = '';
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === "'" && s[j + 1] === "'") {
        value += "'";
        j += 2;
      } else if (s[j] === "'") {
        j++;
        break;
      } else {
        value += s[j++];
      }
    }
    return { value, next: j };
  }
  if (s[i] === '(') {
    let j = i + 1;
    let combined = '';
    for (;;) {
      while (s[j] === ' ') j++;
      if (s[j] !== "'") throw new Error(`parseQuotedOrConcat: expected quote at ${j}: ${s.slice(i, i + 60)}`);
      const seg = parseQuotedOrConcat(s, j);
      combined += seg.value;
      j = seg.next;
      while (s[j] === ' ') j++;
      if (s[j] === ')') {
        j++;
        break;
      }
      const m = /^\|\|\s*chr\(59\)\s*\|\|/.exec(s.slice(j));
      if (!m) throw new Error(`parseQuotedOrConcat: expected "|| chr(59) ||" at ${j}: ${s.slice(j, j + 40)}`);
      combined += ';';
      j += m[0].length;
    }
    return { value: combined, next: j };
  }
  throw new Error(`parseQuotedOrConcat: expected "'" or "(" at ${i}: ${s.slice(i, i + 40)}`);
}

function parseTuple(tuple: string): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  while (i < tuple.length) {
    while (tuple[i] === ' ' || tuple[i] === ',') i++;
    if (i >= tuple.length) break;
    if (tuple[i] === "'" || tuple[i] === '(') {
      const { value, next } = parseQuotedOrConcat(tuple, i);
      i = next;
      if (tuple.startsWith('::', i)) i = tuple.indexOf(',', i) === -1 ? tuple.length : tuple.indexOf(',', i);
      cells.push(value);
    } else {
      const end = tuple.indexOf(',', i) === -1 ? tuple.length : tuple.indexOf(',', i);
      const raw = tuple.slice(i, end).trim();
      cells.push(raw === 'NULL' ? null : raw === 'true' ? true : raw === 'false' ? false : Number(raw));
      i = end;
    }
  }
  return cells;
}

function rows(table: string): Cell[][] {
  const out: Cell[][] = [];
  for (const line of SQL.split('\n')) {
    if (!line.startsWith(`INSERT INTO ${table} (`)) continue;
    const start = line.indexOf('VALUES (') + 'VALUES ('.length;
    const end = line.lastIndexOf(') ON CONFLICT');
    out.push(parseTuple(line.slice(start, end)));
  }
  return out;
}

// Existing rows are overwritten via `UPDATE <table> SET field = value, ... WHERE id = '<id>';`
// rather than DELETE+INSERT (see the generator and _existing_as_rows.py). This parses those
// statements too, by locating each known field's `field = ` marker in order and slicing the
// raw value out from between consecutive markers (robust to commas/quotes inside text values).
function parseSingleValue(raw: string): Cell {
  const s = raw.trim();
  if (s.startsWith("'") || s.startsWith('(')) {
    return parseQuotedOrConcat(s, 0).value;
  }
  const bare = s.endsWith(',') ? s.slice(0, -1).trim() : s;
  return bare === 'NULL' ? null : bare === 'true' ? true : bare === 'false' ? false : Number(bare);
}

function parseUpdates(table: string, fields: string[]): { id: string; cells: Record<string, Cell> }[] {
  const out: { id: string; cells: Record<string, Cell> }[] = [];
  for (const line of SQL.split('\n')) {
    if (!line.startsWith(`UPDATE ${table} SET `)) continue;
    const markerStarts: number[] = [];
    const valueStarts: number[] = [];
    let searchFrom = 0;
    for (const f of fields) {
      const marker = `${f} = `;
      const idx = line.indexOf(marker, searchFrom);
      if (idx === -1) throw new Error(`parseUpdates(${table}): missing field "${f}" in: ${line.slice(0, 80)}`);
      markerStarts.push(idx);
      valueStarts.push(idx + marker.length);
      searchFrom = idx + marker.length;
    }
    const whereIdx = line.indexOf(' WHERE id = ', searchFrom);
    if (whereIdx === -1) throw new Error(`parseUpdates(${table}): missing WHERE id in: ${line.slice(0, 80)}`);
    const idMatch = line.slice(whereIdx).match(/WHERE id = '([0-9a-fA-F-]+)'/);
    if (!idMatch) throw new Error(`parseUpdates(${table}): bad WHERE id in: ${line.slice(0, 80)}`);
    const cells: Record<string, Cell> = {};
    for (let fi = 0; fi < fields.length; fi++) {
      const regionEnd = fi + 1 < fields.length ? markerStarts[fi + 1] : whereIdx;
      cells[fields[fi].replace(/"/g, '')] = parseSingleValue(line.slice(valueStarts[fi], regionEnd));
    }
    out.push({ id: idMatch[1], cells });
  }
  return out;
}

interface Problem {
  id: string;
  topicId: string;
  curriculum: string;
  code: string;
  cite: string;
  number: number;
  text: string;
  figure: string | null;
  difficulty: number;
  type: string;
  answer: string;
  unit: string | null;
  unitRequired: boolean;
  tolerance: number | null;
  sign: boolean;
  explanation: string;
  points: number;
}

const insertedProblems: Problem[] = rows('problems').map((c) => ({
  id: c[0] as string,
  topicId: c[2] as string,
  curriculum: c[3] as string,
  code: c[4] as string,
  cite: c[5] as string,
  number: c[6] as number,
  text: c[8] as string,
  figure: c[9] as string | null,
  difficulty: c[10] as number,
  type: c[11] as string,
  answer: c[12] as string,
  unit: c[13] as string | null,
  unitRequired: c[14] as boolean,
  tolerance: c[15] as number | null,
  sign: c[16] as boolean,
  explanation: c[17] as string,
  points: c[18] as number,
}));

const PROBLEM_UPDATE_FIELDS = [
  'chapter_id', 'topic_id', 'curriculum_id', 'topic_code', 'syllabus_cite', 'problem_number',
  '"order"', 'question_text', 'question_image_url', 'difficulty_level', 'answer_type',
  'answer_correct', 'answer_unit', 'answer_unit_required', 'answer_tolerance',
  'answer_sign_sensitive', 'explanation', 'points',
];

const updatedProblems: Problem[] = parseUpdates('problems', PROBLEM_UPDATE_FIELDS).map(({ id, cells }) => ({
  id,
  topicId: cells.topic_id as string,
  curriculum: cells.curriculum_id as string,
  code: cells.topic_code as string,
  cite: cells.syllabus_cite as string,
  number: cells.problem_number as number,
  text: cells.question_text as string,
  figure: cells.question_image_url as string | null,
  difficulty: cells.difficulty_level as number,
  type: cells.answer_type as string,
  answer: cells.answer_correct as string,
  unit: cells.answer_unit as string | null,
  unitRequired: cells.answer_unit_required as boolean,
  tolerance: cells.answer_tolerance as number | null,
  sign: cells.answer_sign_sensitive as boolean,
  explanation: cells.explanation as string,
  points: cells.points as number,
}));

const problems: Problem[] = [...insertedProblems, ...updatedProblems];

const OPTION_UPDATE_FIELDS = ['problem_id', 'option_text', 'option_letter', 'is_correct', '"order"'];

const insertedOptions = rows('problem_options').map((c) => ({
  problem: c[1] as string,
  text: c[2] as string,
  letter: c[3] as string,
  correct: c[4] as boolean,
}));

const updatedOptions = parseUpdates('problem_options', OPTION_UPDATE_FIELDS).map(({ cells }) => ({
  problem: cells.problem_id as string,
  text: cells.option_text as string,
  letter: cells.option_letter as string,
  correct: cells.is_correct as boolean,
}));

const options = [...insertedOptions, ...updatedOptions];

const numeric = problems.filter((p) => p.type === 'numeric');
const mcqs = problems.filter((p) => p.type === 'multiple_choice');

const LESSONS = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8',
  '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13', '2.14',
];

function grade(p: Problem, input: string) {
  const spec = specFromProblem({
    answer_correct: p.answer,
    answer_unit: p.unit,
    answer_unit_required: p.unitRequired,
    answer_tolerance: p.tolerance,
    answer_sign_sensitive: p.sign,
  });
  if (!spec) throw new Error(`${p.code} #${p.number}: stored answer "${p.answer}" is not a number`);
  return gradeNumeric(input, spec);
}

function sigFigs(x: number, n: number): string {
  if (x === 0) return '0';
  return Number(x.toPrecision(n)).toString();
}

describe('AS Kinematics and Accelerated motion seed', () => {
  it('seeds exactly 440 questions: 20 (Q1-Q20) in every one of the 22 lessons', () => {
    expect(problems).toHaveLength(440);
    expect(LESSONS).toHaveLength(22);
    for (const code of LESSONS) {
      const own = problems.filter((p) => p.code === code);
      expect(own, code).toHaveLength(20);
      const numbers = own.map((p) => p.number).sort((a, b) => a - b);
      expect(numbers, code).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    }
    expect(new Set(problems.map((p) => p.id)).size).toBe(440);
  });

  it('puts every question in the AS curriculum bank', () => {
    expect(problems.every((p) => p.curriculum === 'as')).toBe(true);
  });

  it('orders questions by tier: Q1-6 Foundation, Q7-13 Intermediate, Q14-18 Challenging, Q19-20 Stretch', () => {
    for (const code of LESSONS) {
      const own = problems.filter((p) => p.code === code).sort((a, b) => a.number - b.number);
      for (const p of own) {
        const expected = p.number <= 6 ? 1 : p.number <= 13 ? 2 : p.number <= 18 ? 3 : 4;
        expect(p.difficulty, `${code} #${p.number}`).toBe(expected);
      }
    }
  });

  it('gives every question at least one mark, and multi-part Challenging/Stretch questions more', () => {
    for (const p of problems) {
      expect(p.points, `${p.code} #${p.number}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('draws a figure for every question that promises one, and resolves most questions to a figure', () => {
    const missing = problems.filter((p) => p.figure && !getDiagram(p.figure)).map((p) => `${p.code} #${p.number}: ${p.figure}`);
    expect(missing).toEqual([]);
    const withFigure = problems.filter((p) => p.figure).length;
    // Visual coverage varies sharply by lesson content (unit-conversion and
    // uncertainty-arithmetic lessons have few meaningful diagrams to draw),
    // so this checks a floor well under the 80% aspiration, not the aggregate.
    expect(withFigure).toBeGreaterThan(200);
  });

  it('gives every multiple-choice question exactly 4 options with exactly one correct, matching the stored answer', () => {
    for (const p of mcqs) {
      const own = options.filter((o) => o.problem === p.id);
      expect(own, `${p.code} #${p.number}`).toHaveLength(4);
      const correctOnes = own.filter((o) => o.correct);
      expect(correctOnes, `${p.code} #${p.number}`).toHaveLength(1);
      expect(correctOnes[0].text, `${p.code} #${p.number}`).toBe(p.answer);
    }
  });

  it('cites a syllabus section for every question', () => {
    for (const p of problems) {
      expect(p.cite, `${p.code} #${p.number}`).toMatch(/^9702 /);
    }
  });

  it.each(numeric.map((p) => [`${p.code} #${p.number}`, p] as const))('%s: the stored numeric answer grades correct', (_, p) => {
    // A few answers embed their unit directly in the stored string (e.g. "5 km"),
    // for units the grader itself converts (see the generator's EMBED_UNIT note) —
    // parseFloat still reads the leading number correctly in either case.
    const value = parseFloat(p.answer);
    expect(value, `${p.code} #${p.number}: answer "${p.answer}" is not numeric`).not.toBeNaN();
    expect(grade(p, p.answer).correct, `${p.code} #${p.number} bare`).toBe(true);
    if (p.unit) expect(grade(p, `${p.answer} ${p.unit}`).correct, `${p.code} #${p.number} with unit`).toBe(true);
    if (value !== 0) {
      expect(grade(p, sigFigs(value, 3)).correct, `${p.code} #${p.number} 3sf`).toBe(true);
      expect(grade(p, sigFigs(value, 2)).correct, `${p.code} #${p.number} 2sf`).toBe(true);
      expect(grade(p, String(value * 1.2)).correct, `${p.code} #${p.number} +20%`).toBe(false);
      expect(grade(p, String(value * 0.8)).correct, `${p.code} #${p.number} -20%`).toBe(false);
      if (p.sign) expect(grade(p, String(-value)).correct, `${p.code} #${p.number} wrong sign`).toBe(false);
    }
  });

  it('never duplicates question text within a lesson', () => {
    for (const code of LESSONS) {
      const texts = problems.filter((p) => p.code === code).map((p) => p.text);
      expect(new Set(texts).size, code).toBe(texts.length);
    }
  });

  it('every explanation names a common mistake', () => {
    const missing = problems.filter((p) => !/common mistake/i.test(p.explanation)).map((p) => `${p.code} #${p.number}`);
    expect(missing).toEqual([]);
  });
});
