'use client';

import { summarize, type QuestionStatus } from '@/lib/practice/progress';

const SQUARE: Record<QuestionStatus, string> = {
  correct: 'bg-green-500 border-green-500 text-white hover:bg-green-600',
  wrong: 'bg-red-500 border-red-500 text-white hover:bg-red-600',
  skipped: 'bg-gray-200 border-gray-400 border-dashed text-gray-700 hover:bg-gray-300',
  untried: 'bg-white border-gray-300 text-gray-600 hover:border-gray-500',
};

// A mark as well as a colour, so the state never rests on colour alone.
const MARK: Record<QuestionStatus, string> = { correct: '✓', wrong: '✕', skipped: '–', untried: '' };

const LABEL: Record<QuestionStatus, string> = {
  correct: 'correct',
  wrong: 'wrong',
  skipped: 'skipped',
  untried: 'not tried yet',
};

const BAR: Record<Exclude<QuestionStatus, 'untried'>, string> = {
  correct: 'bg-green-500',
  wrong: 'bg-red-500',
  skipped: 'bg-gray-400',
};

export function QuestionMap({
  numbers,
  statuses,
  current,
  onSelect,
}: {
  numbers: number[];
  statuses: QuestionStatus[];
  current: number;
  onSelect: (index: number) => void;
}) {
  const s = summarize(statuses);

  return (
    <section aria-label="Your progress" className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
        <h2 className="text-sm font-semibold text-gray-900">
          Your progress <span className="font-normal text-gray-500">· {s.correct + s.wrong} of {s.total} answered</span>
        </h2>
        {s.total > 0 && s.correct === s.total && (
          <span className="text-xs font-semibold text-green-700">Every question correct ✓</span>
        )}
      </div>

      {/* One bar for the whole set, in the same colours as the squares. */}
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px mb-3" aria-hidden="true">
        {(['correct', 'wrong', 'skipped'] as const).map((k) =>
          s[k] > 0 ? <div key={k} className={BAR[k]} style={{ width: `${(s[k] / s.total) * 100}%` }} /> : null
        )}
      </div>

      <ol className="flex flex-wrap gap-1.5">
        {statuses.map((status, i) => {
          const isCurrent = i === current;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Question ${numbers[i]}, ${LABEL[status]}${isCurrent ? ', current question' : ''}`}
                className={`relative w-9 h-9 rounded-md border text-xs font-semibold tabular-nums transition-colors ${SQUARE[status]} ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                }`}
              >
                {numbers[i]}
                {MARK[status] && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-[9px] leading-[14px] text-gray-900 shadow-sm">
                    {MARK[status]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
        <LegendItem swatch="bg-green-500 border-green-500" mark="✓" label="Correct" count={s.correct} />
        <LegendItem swatch="bg-red-500 border-red-500" mark="✕" label="Wrong" count={s.wrong} />
        <LegendItem swatch="bg-gray-200 border-gray-400 border-dashed" mark="–" label="Skipped" count={s.skipped} />
        <LegendItem swatch="bg-white border-gray-300" label="Not tried" count={s.untried} />
      </ul>
    </section>
  );
}

function LegendItem({ swatch, mark, label, count }: { swatch: string; mark?: string; label: string; count: number }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm border ${swatch}`} aria-hidden="true" />
      {label}
      {mark && <span aria-hidden="true" className="text-gray-400">{mark}</span>}
      <span className="font-semibold text-gray-900 tabular-nums">{count}</span>
    </li>
  );
}
