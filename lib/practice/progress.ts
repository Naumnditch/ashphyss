/**
 * Where a student stands on each question of a practice set, and which
 * question to offer next. Pure, so the order rules are testable on their own.
 */

export type QuestionStatus = 'untried' | 'correct' | 'wrong' | 'skipped';

export interface ProgressSummary {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  untried: number;
}

export function summarize(statuses: QuestionStatus[]): ProgressSummary {
  const summary: ProgressSummary = { total: statuses.length, correct: 0, wrong: 0, skipped: 0, untried: 0 };
  for (const s of statuses) summary[s] += 1;
  return summary;
}

/**
 * The question to show after `from`: the next one not yet tried, then the
 * skipped ones coming back round, then the ones answered wrongly. Each search
 * runs forward from `from` and wraps. When everything is correct it simply
 * moves on to the following question.
 */
export function nextQuestionIndex(statuses: QuestionStatus[], from: number): number {
  const n = statuses.length;
  if (n === 0) return 0;
  for (const wanted of ['untried', 'skipped', 'wrong'] as const) {
    for (let step = 1; step <= n; step++) {
      const i = (from + step) % n;
      if (statuses[i] === wanted && i !== from) return i;
    }
  }
  return (from + 1) % n;
}
