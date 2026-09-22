/**
 * 1C re-grade backfill.
 *
 * Replays every numeric attempt in practice_attempts through the current
 * grader and flips any row that was only ever wrong because the old
 * parseFloat()-based grader could not read the student's answer. Rows are
 * stamped with regraded_at so a second run is visible as a no-op, and
 * topic_mastery is recomputed from the corrected log afterwards.
 *
 *   DATABASE_URL=... npx tsx scripts/regrade-attempts.ts [--apply]
 *
 * Without --apply it prints what it would change and writes nothing.
 */

import { query } from '../lib/db/client';
import { gradeNumeric, specFromProblem } from '../lib/grading/numericAnswer';
import { syncTopicMastery } from '../lib/practice/attempts';

async function main() {
  const apply = process.argv.includes('--apply');

  const { rows } = await query(
    `SELECT a.id, a.student_id, a.topic_id, a.raw_answer, a.is_correct,
            p.problem_number, p.answer_correct, p.answer_unit, p.answer_unit_required,
            p.answer_tolerance, p.answer_sign_sensitive, p.answer_alternates
     FROM practice_attempts a
     JOIN problems p ON p.id = a.problem_id
     WHERE a.grading_method = 'numeric'
     ORDER BY a.created_at`
  );

  let flipped = 0;
  let unchanged = 0;
  const touched = new Set<string>();

  for (const row of rows) {
    const spec = specFromProblem(row);
    if (!spec) continue;

    const result = gradeNumeric(String(row.raw_answer ?? ''), spec);
    const flips = result.correct && !row.is_correct;

    if (flips) {
      flipped++;
      touched.add(`${row.student_id}:${row.topic_id}`);
      console.log(
        `FLIP  Q${row.problem_number}  ${JSON.stringify(row.raw_answer)} vs ${row.answer_correct}` +
          ` -> read as ${result.parsedValue} (${result.reason})`
      );
    } else {
      unchanged++;
    }

    // A row that stays wrong still gets its reason recorded, so the
    // problem-health view can see unparseable rates from day one.
    if (apply) {
      await query(
        `UPDATE practice_attempts
         SET is_correct = $2, grade_reason = $3, normalized_answer = $4,
             tolerance_used = $5, regraded_at = now()
         WHERE id = $1`,
        [
          row.id,
          result.correct || row.is_correct,
          result.reason,
          result.parsedValue === null ? null : String(result.parsedValue),
          spec.tolerance ?? 0.02,
        ]
      );
    }
  }

  if (apply) {
    for (const key of touched) {
      const [studentId, topicId] = key.split(':');
      await syncTopicMastery(studentId, topicId);
    }
  }

  console.log(
    `\n${rows.length} numeric attempts re-graded: ${flipped} flipped to correct, ` +
      `${unchanged} unchanged. ${apply ? 'Applied.' : 'Dry run — nothing written.'}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
