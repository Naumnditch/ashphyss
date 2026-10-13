import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { gradeNumeric, specFromProblem } from '@/lib/grading/numericAnswer';
import { getDiagram } from '@/components/practice/MomentumDiagrams';
import { COULOMB_CHALLENGE_DIAGRAM_DATA } from '@/components/practice/coulombChallengeDiagramData';
import { renderWorksheetPdf, toSvgMarkup, type WorksheetOption, type WorksheetProblem } from '../worksheetPdf';

/**
 * The 17.4 Coulomb's law CHALLENGING tier (Q60 onwards), checked as applied:
 * the generated SQL run through the real grader, every figure rendered, and
 * the whole tier laid out as a worksheet PDF. The answers themselves are
 * recomputed independently in database/seeds/tests/test_coulomb_17_4_answers.py.
 */

const SQL = readFileSync(path.resolve(__dirname, '../../../database/seeds/2026-10-13-coulomb-challenge.sql'), 'utf8');

type Cell = string | number | boolean | null;

function parseTuple(tuple: string): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  while (i < tuple.length) {
    while (tuple[i] === ' ' || tuple[i] === ',') i++;
    if (i >= tuple.length) break;
    if (tuple[i] === "'") {
      let value = '';
      i++;
      while (i < tuple.length) {
        if (tuple[i] === "'" && tuple[i + 1] === "'") {
          value += "'";
          i += 2;
        } else if (tuple[i] === "'") {
          i++;
          break;
        } else {
          value += tuple[i++];
        }
      }
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

const values = (line: string) => parseTuple(line.slice(line.indexOf('VALUES (') + 8, line.lastIndexOf(') ON CONFLICT')));

interface Problem {
  id: string;
  topic: string;
  curriculum: string;
  number: number;
  text: string;
  figure: string | null;
  difficulty: number;
  type: string;
  answer: string;
  unit: string | null;
  tolerance: number | null;
  sign: boolean;
  explanation: string;
  marks: number;
}

const problems: Problem[] = SQL.split('\n')
  .filter((l) => l.startsWith('INSERT INTO problems ('))
  .map((line) => {
    const c = values(line);
    return {
      id: c[0] as string,
      topic: c[2] as string,
      curriculum: c[3] as string,
      number: c[6] as number,
      text: c[8] as string,
      figure: c[9] as string | null,
      difficulty: c[10] as number,
      type: c[11] as string,
      answer: c[12] as string,
      unit: c[13] as string | null,
      tolerance: c[14] as number | null,
      sign: c[15] as boolean,
      explanation: c[16] as string,
      marks: c[17] as number,
    };
  });

const options: WorksheetOption[] = SQL.split('\n')
  .filter((l) => l.startsWith('INSERT INTO problem_options ('))
  .map((line) => {
    const c = values(line);
    return { problem_id: c[1] as string, option_text: c[2] as string, option_letter: c[3] as string, is_correct: c[4] as boolean };
  });

const numeric = problems.filter((p) => p.type === 'numeric');
const mcqs = problems.filter((p) => p.type === 'multiple_choice');

function grade(p: Problem, input: string) {
  const spec = specFromProblem({
    answer_correct: p.answer,
    answer_unit: p.unit,
    answer_tolerance: p.tolerance,
    answer_sign_sensitive: p.sign,
  });
  if (!spec) throw new Error(`Q${p.number}: stored answer ${p.answer} is not a number`);
  return gradeNumeric(input, spec);
}

const sig = (x: number, n: number) => Number(x.toPrecision(n)).toString();

describe('17.4 Coulomb CHALLENGING tier seed', () => {
  it('appends at least 30 questions, numbered contiguously from Q60, into the 17.4 IGCSE bank', () => {
    expect(problems.length).toBeGreaterThanOrEqual(30);
    expect(problems.map((p) => p.number)).toEqual(problems.map((_, i) => 60 + i));
    expect(new Set(problems.map((p) => p.id)).size).toBe(problems.length);
    for (const p of problems) {
      expect(p.topic).toBe('c6c1d1f5-1c6b-4ab4-a15b-beea25426304');
      expect(p.curriculum).toBe('igcse');
    }
  });

  it('never touches Q1–59 except the two listed last-digit fixes (Q40, Q58)', () => {
    const updates = SQL.split('\n').filter((l) => /^(UPDATE|DELETE)/.test(l));
    expect(updates).toHaveLength(2);
    expect(updates[0]).toContain("answer_correct = '0.973'");
    expect(updates[0]).toContain("AND answer_correct = '0.974'");
    expect(updates[1]).toContain("answer_correct = '0.276'");
    expect(updates[1]).toContain("AND answer_correct = '0.275'");
    expect(SQL).not.toMatch(/DELETE/);
    expect(problems.every((p) => p.number >= 60)).toBe(true);
  });

  it('tags every question CHALLENGING (difficulty 4–5) with a mark value', () => {
    for (const p of problems) {
      expect([4, 5]).toContain(p.difficulty);
      expect(p.marks).toBeGreaterThanOrEqual(3);
    }
    expect(problems.filter((p) => p.marks >= 8).length).toBeGreaterThanOrEqual(6);
  });

  it('puts at least 14 suspended-charge questions in, each with a figure and a T / mg / Fe free-body explanation', () => {
    const suspended = problems.filter((p) => /coulomb-ch-(fixed|pair|vertical|field|extended)/.test(p.figure ?? ''));
    expect(suspended.length).toBeGreaterThanOrEqual(14);
    for (const p of suspended) {
      expect(p.explanation, `Q${p.number}`).toMatch(/[Ff]ree-body diagram/);
      expect(p.explanation).toContain('mg');
      expect(p.explanation).toMatch(/\bT\b|tension/);
    }
  });

  it('ends every worked solution with a common-mistake note and has no literal semicolons', () => {
    for (const p of problems) {
      expect(p.explanation, `Q${p.number}`).toContain('Common mistake:');
      expect(p.text + p.explanation).not.toContain(';');
      expect(p.text + p.explanation).not.toMatch(/\\u[0-9a-fA-F]{4}/);
    }
  });

  it('has no duplicate question text', () => {
    expect(new Set(problems.map((p) => p.text)).size).toBe(problems.length);
  });
});

describe('numeric answers through the real grader', () => {
  it.each(numeric.map((p) => [p.number, p] as const))('Q%i: stored answer, with its unit and at 3 s.f. is correct', (_n, p) => {
    expect(grade(p, p.answer).correct).toBe(true);
    if (p.unit && !['°', 'N·m²'].includes(p.unit)) expect(grade(p, `${p.answer} ${p.unit}`).correct).toBe(true);
    expect(grade(p, sig(Number(p.answer), 3)).correct).toBe(true);
  });

  it.each(numeric.map((p) => [p.number, p] as const))('Q%i: a value 10%% off is wrong', (_n, p) => {
    expect(grade(p, sig(Number(p.answer) * 1.1, 4)).correct).toBe(false);
  });

  it('accepts prefixed units on charge and length answers (Q60 in nC, Q61 in cm)', () => {
    const q60 = numeric.find((p) => p.number === 60)!;
    const q61 = numeric.find((p) => p.number === 61)!;
    expect(grade(q60, `${sig(Number(q60.answer) * 1e9, 3)} nC`).correct).toBe(true);
    expect(grade(q61, `${sig(Number(q61.answer) * 100, 3)} cm`).correct).toBe(true);
  });

  it('marks the wrong sign wrong where the sign is asked for (Q86)', () => {
    const q86 = numeric.find((p) => p.number === 86)!;
    expect(q86.sign).toBe(true);
    expect(grade(q86, q86.answer).correct).toBe(true);
    expect(grade(q86, q86.answer.replace(/^-/, '')).correct).toBe(false);
  });

  it('rejects the small-angle shortcut where the exact solution is asked for (Q79)', () => {
    const q79 = numeric.find((p) => p.number === 79)!;
    const approx = Math.cbrt((2 * 9.0e9 * (0.15e-6) ** 2 * 0.2) / (1.0e-3 * 9.8));
    expect(grade(q79, sig(approx, 3)).correct).toBe(false);
  });
});

describe('multiple choice', () => {
  it.each(mcqs.map((p) => [p.number, p] as const))('Q%i: four distinct options, exactly one correct, matching the stored answer', (_n, p) => {
    const mine = options.filter((o) => o.problem_id === p.id);
    expect(mine.map((o) => o.option_letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(new Set(mine.map((o) => o.option_text)).size).toBe(4);
    const correct = mine.filter((o) => o.is_correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].option_text).toBe(p.answer);
  });
});

describe('figures', () => {
  const keys = problems.map((p) => p.figure).filter((f): f is string => !!f);

  it('every figure a question references exists', () => {
    expect(keys.filter((k) => !getDiagram(k))).toEqual([]);
    for (const key of Object.keys(COULOMB_CHALLENGE_DIAGRAM_DATA)) expect(keys).toContain(`diagram:${key}`);
  });

  it.each(Object.keys(COULOMB_CHALLENGE_DIAGRAM_DATA))('%s renders finite SVG with a sane viewBox', (key) => {
    const svg = toSvgMarkup(getDiagram(key));
    expect(svg).toMatch(/^<svg viewBox="0 0 460 \d+(\.\d+)?"/);
    expect(svg).not.toMatch(/NaN|Infinity|undefined|null/);
    const height = Number(svg.match(/viewBox="0 0 460 ([\d.]+)"/)![1]);
    expect(height).toBeGreaterThan(100);
    expect(height).toBeLessThan(320);
  });

  it('suspended-charge figures show the support, the thread angle and the labels, never a force arrow', () => {
    const hanging = Object.entries(COULOMB_CHALLENGE_DIAGRAM_DATA).filter(([, spec]) => ['fixed', 'pair', 'field'].includes(spec.kind));
    expect(hanging.length).toBeGreaterThanOrEqual(14);
    for (const [key] of hanging) {
      const svg = toSvgMarkup(getDiagram(key));
      expect(svg).toContain('stroke-dasharray="4 4"'); // the vertical reference
      expect(svg).not.toMatch(/Fe|mg|tension/);
    }
  });
});

async function pdfPages(problemsIn: WorksheetProblem[], showAnswers: boolean) {
  const buffer = await renderWorksheetPdf({
    topic: { topic_name: "17.4 Coulomb's law (extension)", chapter_number: 17, chapter_title: 'Static Electricity' },
    problems: problemsIn,
    options,
    showAnswers,
  });
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/∕/g, '/'));
  }
  return pages;
}

describe('worksheet PDF with the new tier', () => {
  const sheet: WorksheetProblem[] = problems.map((p) => ({
    id: p.id,
    problem_number: p.number,
    question_text: p.text,
    question_image_url: p.figure,
    answer_type: p.type,
    answer_correct: p.answer,
    answer_unit: p.unit,
    difficulty_level: p.difficulty,
  }));

  it('paginates cleanly: header count, every later page starts on a question, footers numbered, figures drawn', async () => {
    const pages = await pdfPages(sheet, false);
    const text = pages.join(' ');
    expect(text).toContain(`Chapter 17 · ${sheet.length} questions`);
    expect(pages.length).toBeGreaterThan(5);
    pages.slice(1).forEach((page) => expect(page).toMatch(/^\s*\d+\./));
    pages.forEach((page, i) => expect(page).toContain(`Page ${i + 1} of ${pages.length}`));
    expect(text).not.toContain('not available');
    expect(text).toContain('insulating rod');
    expect(text.replace(/\s/g, '')).toContain('CHALLENGING');
    for (const p of problems) expect(text).toContain(`${p.number}.`);
  });

  it('the answer key marks every MCQ and prints every numeric answer', async () => {
    const text = (await pdfPages(sheet, true)).join(' ');
    expect((text.match(/✓ correct/g) ?? []).length).toBe(mcqs.length);
    expect((text.match(/Answer:/g) ?? []).length).toBe(numeric.length);
  });
});
