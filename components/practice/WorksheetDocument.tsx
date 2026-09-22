/**
 * The printable worksheet itself: pure presentation, all data in via props.
 *
 * It is kept separate from the page so it can be rendered outside Next.js —
 * the verification script in scripts/ renders this exact component with real
 * question rows and prints it through a headless browser, which is the only
 * way to be sure the pagination and page-break rules actually hold on paper.
 */

import { MomentumDiagram, hasDiagram } from '@/components/practice/MomentumDiagrams';

export interface WorksheetTopic {
  id: string;
  topic_name: string;
  chapter_number: number;
  chapter_title: string;
}

export interface WorksheetProblem {
  id: string;
  problem_number: number | null;
  question_text: string;
  question_image_url: string | null;
  answer_type: string;
  answer_correct: string | null;
  answer_unit: string | null;
  difficulty_level: number | null;
}

export interface WorksheetOption {
  id: string;
  problem_id: string;
  option_text: string;
  option_letter: string;
  is_correct: boolean;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Warm-up',
  2: 'Standard',
  3: 'Standard',
  4: 'Challenging',
  5: 'Challenging',
};

/** How many ruled lines of working space a question gets. */
export function workingLines(answerType: string, difficulty: number | null): number {
  if (answerType === 'multiple_choice') return 0;
  const level = difficulty ?? 2;
  if (level <= 1) return 2;
  if (level <= 3) return 4;
  return 6;
}

export function WorksheetDocument({
  topic,
  problems,
  options,
  showAnswers = false,
}: {
  topic: WorksheetTopic;
  problems: WorksheetProblem[];
  options: WorksheetOption[];
  showAnswers?: boolean;
}) {
  const optionsByProblem = new Map<string, WorksheetOption[]>();
  for (const option of options) {
    const list = optionsByProblem.get(option.problem_id) ?? [];
    list.push(option);
    optionsByProblem.set(option.problem_id, list);
  }

  return (
    <article className="worksheet">
      <header className="border-b-2 border-gray-900 pb-3 mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900">AshPhys</span>
          <span className="text-[11px] text-gray-500">
            Chapter {topic.chapter_number} · {problems.length} question
            {problems.length === 1 ? '' : 's'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-2">{topic.topic_name}</h1>
        <p className="text-[11px] text-gray-500 mt-0.5">{topic.chapter_title}</p>

        <div className="grid grid-cols-3 gap-4 mt-4 text-[11px] text-gray-500">
          <NameField label="Name" />
          <NameField label="Class" />
          <NameField label="Date" />
        </div>
      </header>

      <ol className="space-y-6">
        {problems.map((problem, index) => {
          const number = problem.problem_number ?? index + 1;
          const choices = optionsByProblem.get(problem.id) ?? [];
          const lines = workingLines(problem.answer_type, problem.difficulty_level);
          const difficulty = problem.difficulty_level ? DIFFICULTY_LABELS[problem.difficulty_level] : null;

          return (
            <li key={problem.id} className="question break-inside-avoid">
              <div className="flex items-start gap-3">
                <span className="font-bold text-gray-900 tabular-nums w-7 shrink-0">{number}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] text-gray-900 leading-relaxed">{problem.question_text}</p>
                    {difficulty && (
                      <span className="text-[9px] uppercase tracking-wider text-gray-500 border border-gray-300 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                        {difficulty}
                      </span>
                    )}
                  </div>

                  {problem.question_image_url?.startsWith('diagram:') &&
                    (hasDiagram(problem.question_image_url) ? (
                      <div className="my-3 max-w-md">
                        <MomentumDiagram diagramKey={problem.question_image_url} />
                      </div>
                    ) : (
                      // The question says "as shown" but no figure is defined
                      // for this key. Say so on the paper rather than handing
                      // a student a question they cannot answer.
                      <p className="my-3 text-[11px] text-gray-500 border border-dashed border-gray-300 rounded px-3 py-2">
                        Figure not available for this question — use the on-screen version.
                      </p>
                    ))}
                  {problem.question_image_url && !problem.question_image_url.startsWith('diagram:') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={problem.question_image_url}
                      alt=""
                      className="my-3 w-full max-w-sm rounded border border-gray-200"
                    />
                  )}

                  {choices.length > 0 ? (
                    <ul className="mt-2.5 space-y-1.5">
                      {choices.map((option) => (
                        <li key={option.id} className="flex items-start gap-2 text-[13px] text-gray-900">
                          <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm mt-0.5 shrink-0" />
                          <span className="font-semibold w-4 shrink-0">{option.option_letter}</span>
                          <span className="leading-snug">{option.option_text}</span>
                          {showAnswers && option.is_correct && (
                            <span className="text-[11px] font-bold text-gray-900 whitespace-nowrap">&larr; correct</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      {lines > 0 && (
                        <div className="mt-3">
                          {Array.from({ length: lines }).map((_, i) => (
                            <div key={i} className="border-b border-gray-200 h-6" />
                          ))}
                        </div>
                      )}
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 shrink-0">
                          Answer
                        </span>
                        <span className="flex-1 border-b-2 border-gray-400 h-5" />
                        {problem.answer_unit && (
                          <span className="text-[12px] font-semibold text-gray-700 shrink-0">
                            {problem.answer_unit}
                          </span>
                        )}
                      </div>
                      {showAnswers && (
                        <p className="text-[11px] font-bold text-gray-900 mt-1">
                          Answer: {problem.answer_correct}
                          {problem.answer_unit ? ` ${problem.answer_unit}` : ''}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between">
        <span>{topic.topic_name} — AshPhys</span>
        <span>ashphys.org</span>
      </footer>
    </article>
  );
}

function NameField({ label }: { label: string }) {
  return (
    <div>
      <span className="uppercase tracking-wide">{label}</span>
      <div className="border-b border-gray-400 h-5 mt-0.5" />
    </div>
  );
}

/**
 * Print rules Tailwind can't express: the paper size and margins, and
 * keeping a question from being split across two pages.
 */
export function WorksheetPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4 portrait;
          margin: 14mm 13mm;
        }
        html, body {
          background: #fff !important;
        }
        .question {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        a[href]::after {
          content: none !important;
        }
      }
    `}</style>
  );
}
