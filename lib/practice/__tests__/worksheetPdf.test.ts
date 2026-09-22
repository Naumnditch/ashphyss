import { describe, it, expect } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getDiagram } from '@/components/practice/MomentumDiagrams';
import {
  renderWorksheetPdf,
  workingLines,
  toSvgMarkup,
  formatAnswer,
  worksheetFilename,
  type WorksheetInput,
  type WorksheetProblem,
} from '../worksheetPdf';

const topic = {
  topic_name: "17.4 Coulomb's law (extension)",
  chapter_number: 17,
  chapter_title: 'Static Electricity',
};

const mcq: WorksheetProblem = {
  id: 'p-mcq',
  problem_number: 1,
  question_text: "What is the value of Coulomb's constant, k?",
  question_image_url: null,
  answer_type: 'multiple_choice',
  answer_correct: '9.0 × 10⁹ N·m²/C²',
  answer_unit: null,
  difficulty_level: 1,
};

const numeric: WorksheetProblem = {
  id: 'p-num',
  problem_number: 2,
  question_text: 'Two point charges of +2.0 C and −4.0 C are placed 2.0 m apart. Calculate the force.',
  question_image_url: null,
  answer_type: 'numeric',
  answer_correct: '1.8e10',
  answer_unit: 'N',
  difficulty_level: 1,
};

const options = [
  { problem_id: 'p-mcq', option_text: '6.7 × 10⁻¹¹ N·m²/kg²', option_letter: 'A', is_correct: false },
  { problem_id: 'p-mcq', option_text: '9.0 × 10⁹ N·m²/C²', option_letter: 'B', is_correct: true },
];

async function pdfPages(input: WorksheetInput): Promise<string[]> {
  const buffer = await renderWorksheetPdf(input);
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages;
}

describe('the student worksheet PDF', () => {
  const pages = pdfPages({ topic, problems: [mcq, numeric], options, showAnswers: false });

  it('has the topic, chapter and a name line', async () => {
    const text = (await pages).join(' ');
    expect(text).toContain("17.4 Coulomb's law (extension)");
    expect(text).toContain('Chapter 17');
    // Letter-spaced labels come back from the PDF as "N A M E".
    expect(text.replace(/\s/g, '')).toContain('NAME');
  });

  it('keeps physics characters intact', async () => {
    const text = (await pages).join(' ');
    expect(text).toContain('−4.0 C');
    expect(text).toContain('10⁻¹¹');
  });

  it('lists the options and gives the numeric question an answer line with its unit', async () => {
    const text = (await pages).join(' ');
    expect(text).toContain('6.7 × 10⁻¹¹ N·m²/kg²');
    expect(text.replace(/\s/g, '')).toContain('ANSWER');
  });

  // The whole point of the student version.
  it('never contains an answer', async () => {
    const text = (await pages).join(' ');
    expect(text).not.toContain('correct');
    expect(text).not.toContain('1.8 × 10¹⁰');
    expect(text).not.toContain('Answer:');
  });
});

describe('the answer key PDF', () => {
  it('marks the correct option and prints numeric answers in standard form', async () => {
    const text = (await pdfPages({ topic, problems: [mcq, numeric], options, showAnswers: true })).join(' ');
    expect(text).toContain('correct');
    expect(text).toContain('Answer: 1.8 × 10¹⁰ N');
  });
});

describe('pagination', () => {
  it('starts every page after the first with a new question, never a split one', async () => {
    const problems = Array.from({ length: 30 }, (_, i) => ({ ...numeric, id: `p-${i}`, problem_number: i + 1, difficulty_level: 3 }));
    const pages = await pdfPages({ topic, problems, options: [], showAnswers: false });
    expect(pages.length).toBeGreaterThan(3);
    pages.slice(1).forEach((page) => expect(page).toMatch(/^\s*\d+\./));
    pages.forEach((page, i) => expect(page).toContain(`Page ${i + 1} of ${pages.length}`));
  });
});

describe('figures', () => {
  it('draws a question figure', async () => {
    const text = (await pdfPages({ topic, problems: [{ ...numeric, question_image_url: 'diagram:coulomb-three-inline' }], options: [], showAnswers: false })).join(' ');
    expect(text).toContain('0.20 m');
    expect(text).not.toContain('not available');
  });

  it('says so when a figure is missing rather than leaving a blank', async () => {
    const text = (await pdfPages({ topic, problems: [{ ...numeric, question_image_url: 'diagram:no-such-figure' }], options: [], showAnswers: false })).join(' ');
    expect(text).toContain('not available');
  });
});

// Every diagram key the problems table references.
const DIAGRAM_KEYS = [
  'momentum-stick-1', 'momentum-stick-2', 'momentum-explosion-1', 'momentum-separate-1',
  'momentum-headon-1', 'momentum-recoil-1', 'momentum-wall-1', 'momentum-oblique-1',
  'coulomb-two-spheres-unequal', 'coulomb-two-positive-equal', 'coulomb-pith-balls',
  'coulomb-three-inline', 'coulomb-right-angle',
];

describe('toSvgMarkup', () => {
  it('defines a figure for every diagram the questions reference', () => {
    expect(DIAGRAM_KEYS.filter((key) => !getDiagram(key))).toEqual([]);
  });

  // The PDF cannot use React's renderer inside a Next.js route, so its own
  // serialiser must produce exactly what React would (bar styling props).
  it.each(DIAGRAM_KEYS)('matches React for %s', (key) => {
    const element = getDiagram(key) as ReactElement;
    const fromReact = renderToStaticMarkup(element)
      .replace(/ (class|style)="[^"]*"/g, '')
      .replace(/<!-- -->/g, '');
    expect(toSvgMarkup(element)).toBe(fromReact);
  });
});

describe('workingLines', () => {
  it('gives no ruled space to a multiple-choice question', () => {
    expect(workingLines('multiple_choice', 3)).toBe(0);
  });

  it('gives more space to harder questions', () => {
    expect(workingLines('numeric', 1)).toBe(2);
    expect(workingLines('numeric', 3)).toBe(4);
    expect(workingLines('numeric', 5)).toBe(6);
  });

  it('assumes a middling question when difficulty is missing', () => {
    expect(workingLines('numeric', null)).toBe(4);
  });
});

describe('formatAnswer', () => {
  it('writes e-notation as standard form', () => {
    expect(formatAnswer('1.8e10')).toBe('1.8 × 10¹⁰');
    expect(formatAnswer('4.33e-6')).toBe('4.33 × 10⁻⁶');
    expect(formatAnswer('2.0E+4')).toBe('2.0 × 10⁴');
  });

  it('leaves anything else alone', () => {
    expect(formatAnswer('112.5')).toBe('112.5');
    expect(formatAnswer('B')).toBe('B');
  });
});

describe('worksheetFilename', () => {
  it('names the file after the topic and strips characters a filesystem rejects', () => {
    expect(worksheetFilename("17.4 Coulomb's law (extension)", false)).toBe("17.4 Coulomb's law (extension) - worksheet.pdf");
    expect(worksheetFilename('Forces: a/b', true)).toBe('Forces ab - answer key.pdf');
  });
});
