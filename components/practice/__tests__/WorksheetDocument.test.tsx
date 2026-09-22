import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  WorksheetDocument,
  workingLines,
  type WorksheetProblem,
  type WorksheetOption,
} from '../WorksheetDocument';

const topic = {
  id: 'topic-1',
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

const options: WorksheetOption[] = [
  { id: 'o-a', problem_id: 'p-mcq', option_text: '6.7 × 10⁻¹¹ N·m²/kg²', option_letter: 'A', is_correct: false },
  { id: 'o-b', problem_id: 'p-mcq', option_text: '9.0 × 10⁹ N·m²/C²', option_letter: 'B', is_correct: true },
];

function render(showAnswers: boolean, opts: WorksheetOption[] = options) {
  return renderToStaticMarkup(
    <WorksheetDocument topic={topic} problems={[mcq, numeric]} options={opts} showAnswers={showAnswers} />
  );
}

describe('worksheet, as a student gets it', () => {
  const html = render(false);

  it('prints the topic, chapter and question count in the header', () => {
    // React escapes the apostrophe in static markup; the browser renders it
    // back as a normal quote.
    expect(html).toContain('17.4 Coulomb&#x27;s law (extension)');
    expect(html).toContain('Static Electricity');
    expect(html).toContain('Chapter 17');
    expect(html).toContain('2 question');
  });

  it('gives somewhere to write a name, class and date', () => {
    expect(html).toContain('Name');
    expect(html).toContain('Class');
    expect(html).toContain('Date');
  });

  it('numbers questions by their problem number', () => {
    expect(html).toContain('1.');
    expect(html).toContain('2.');
  });

  it('lists every option with its letter for a multiple-choice question', () => {
    expect(html).toContain('6.7 × 10⁻¹¹ N·m²/kg²');
    expect(html).toContain('9.0 × 10⁹ N·m²/C²');
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
  });

  it('gives a numeric question an answer line labelled with its unit', () => {
    expect(html).toContain('Answer');
    expect(html).toContain('>N<');
  });

  // The whole point of the student version.
  it('never marks which option is correct', () => {
    expect(html).not.toContain('correct');
  });

  it('never prints a numeric answer', () => {
    expect(html).not.toContain('1.8e10');
  });

  it('keeps physics characters intact rather than escaping them into entities', () => {
    expect(html).toContain('−4.0 C');
    expect(html).toContain('10⁻¹¹');
  });

  it('marks each question so it is not split across a page break', () => {
    expect(html.match(/break-inside-avoid/g)?.length).toBe(2);
  });
});

describe('worksheet, as staff get it with the key', () => {
  const html = render(true);

  it('marks the correct option', () => {
    expect(html).toContain('correct');
  });

  it('prints the numeric answer with its unit', () => {
    expect(html).toContain('1.8e10 N');
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

describe('a topic whose questions have no options rows', () => {
  it('still renders an answer line rather than an empty list', () => {
    const html = render(false, []);
    expect(html).toContain('Answer');
    expect(html).not.toContain('<ul');
  });
});

describe('questions that promise a figure', () => {
  const withFigure = (key: string) =>
    renderToStaticMarkup(
      <WorksheetDocument
        topic={topic}
        problems={[{ ...numeric, question_image_url: key }]}
        options={[]}
      />
    );

  it('renders a diagram that exists', () => {
    expect(withFigure('diagram:momentum-stick-1')).toContain('<svg');
  });

  // Five Coulomb questions say "as shown" but no figure is defined for their
  // key. Printing nothing there hands a student an unanswerable question.
  it('says so, visibly, when the figure is missing', () => {
    const html = withFigure('diagram:coulomb-pith-balls');
    expect(html).toContain('Figure not available');
    expect(html).not.toContain('<svg');
  });
});
