/**
 * The practice write path.
 *
 * `practice_attempts` is append-only and is the source of truth for every
 * answer a student submits. `topic_mastery` is kept as the fast-read cache
 * the 5-in-a-row logic reads, but it is RECOMPUTED from practice_attempts on
 * every write rather than incremented, so the two can't drift apart.
 *
 * Everything here runs server-side only (the route handlers and the backfill
 * script). Nothing in this module is reachable from the browser, which is
 * what stops a student forging a correct attempt.
 */

import { query, queryOne } from '@/lib/db/client';
import type { GradeReason } from '@/lib/grading/numericAnswer';

export const MASTERY_STREAK = 5;

/** A run of practice on one topic; a gap this long starts a new session. */
const SESSION_IDLE_MINUTES = 45;

export interface MasteryState {
  correctStreak: number;
  bestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  mastered: boolean;
  streakNeeded: number;
}

export interface AttemptInput {
  studentId: string;
  problemId: string;
  topicId: string;
  chapterId?: string | null;
  sessionId?: string | null;
  rawAnswer: string;
  normalizedAnswer?: string | null;
  isCorrect: boolean;
  gradingMethod: 'numeric' | 'mcq' | 'text';
  gradeReason?: GradeReason | null;
  toleranceUsed?: number | null;
  hintUsed?: boolean;
  timeSpentMs?: number | null;
}

/**
 * Returns the student's currently open session for this topic, starting one
 * if their last activity was long enough ago to count as a new sitting.
 */
export async function openPracticeSession(studentId: string, topicId: string): Promise<string | null> {
  try {
    const existing = await queryOne(
      `SELECT id FROM practice_sessions
       WHERE student_id = $1 AND topic_id = $2 AND ended_at IS NULL
         AND last_activity_at > now() - ($3 || ' minutes')::interval
       ORDER BY started_at DESC LIMIT 1`,
      [studentId, topicId, String(SESSION_IDLE_MINUTES)]
    );
    if (existing) return existing.id;

    // Close anything stale so a student doesn't accumulate open sessions.
    await query(
      `UPDATE practice_sessions SET ended_at = last_activity_at
       WHERE student_id = $1 AND topic_id = $2 AND ended_at IS NULL`,
      [studentId, topicId]
    );

    const created = await queryOne(
      `INSERT INTO practice_sessions (student_id, topic_id) VALUES ($1, $2) RETURNING id`,
      [studentId, topicId]
    );
    return created?.id ?? null;
  } catch (err) {
    // A session is a convenience for analytics, not a precondition for
    // grading — never fail a student's submission over it.
    console.error('openPracticeSession failed', err);
    return null;
  }
}

/**
 * Logs one attempt and returns the mastery state derived from the full
 * attempt history for that student and topic.
 */
export async function recordAttempt(input: AttemptInput): Promise<MasteryState> {
  const previous = await queryOne(
    `SELECT COUNT(*)::int AS n FROM practice_attempts WHERE student_id = $1 AND problem_id = $2`,
    [input.studentId, input.problemId]
  );
  const attemptNumber = (previous?.n ?? 0) + 1;

  await query(
    `INSERT INTO practice_attempts
       (student_id, problem_id, topic_id, chapter_id, session_id, attempt_number,
        raw_answer, normalized_answer, is_correct, grading_method, grade_reason,
        tolerance_used, hint_used, time_spent_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      input.studentId,
      input.problemId,
      input.topicId,
      input.chapterId ?? null,
      input.sessionId ?? null,
      attemptNumber,
      input.rawAnswer,
      input.normalizedAnswer ?? null,
      input.isCorrect,
      input.gradingMethod,
      input.gradeReason ?? null,
      input.toleranceUsed ?? null,
      input.hintUsed ?? false,
      input.timeSpentMs ?? null,
    ]
  );

  if (input.sessionId) {
    await query(
      `UPDATE practice_sessions
       SET questions_attempted = questions_attempted + 1,
           questions_correct = questions_correct + $2,
           last_activity_at = now()
       WHERE id = $1`,
      [input.sessionId, input.isCorrect ? 1 : 0]
    );
  }

  const mastery = await syncTopicMastery(input.studentId, input.topicId);

  if (input.sessionId && mastery.mastered) {
    await query(`UPDATE practice_sessions SET mastery_achieved = true WHERE id = $1`, [input.sessionId]);
  }

  return mastery;
}

/**
 * Recomputes topic_mastery for one student and topic straight from
 * practice_attempts, and writes it back to the cache.
 *
 * correct_streak is the run of correct answers at the END of the history;
 * best_streak is the longest such run anywhere in it. `mastered` follows from
 * best_streak, which makes it sticky without needing a separate flag.
 */
export async function syncTopicMastery(studentId: string, topicId: string): Promise<MasteryState> {
  const derived = await queryOne(
    `WITH ordered AS (
       SELECT is_correct, created_at,
              ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
       FROM practice_attempts
       WHERE student_id = $1 AND topic_id = $2
     ),
     grouped AS (
       SELECT rn, is_correct,
              rn - ROW_NUMBER() OVER (PARTITION BY is_correct ORDER BY rn) AS run_id
       FROM ordered
     ),
     correct_runs AS (
       SELECT run_id, COUNT(*)::int AS run_length, MAX(rn) AS ends_at
       FROM grouped WHERE is_correct GROUP BY run_id
     )
     SELECT
       COALESCE((SELECT run_length FROM correct_runs
                 WHERE ends_at = (SELECT MAX(rn) FROM ordered)), 0)::int AS correct_streak,
       COALESCE((SELECT MAX(run_length) FROM correct_runs), 0)::int      AS best_streak,
       (SELECT COUNT(*) FROM ordered)::int                               AS total_attempted,
       (SELECT COUNT(*) FROM ordered WHERE is_correct)::int              AS total_correct,
       (SELECT MAX(created_at) FROM ordered)                             AS last_practiced_at`,
    [studentId, topicId]
  );

  const correctStreak: number = derived?.correct_streak ?? 0;
  const bestStreak: number = derived?.best_streak ?? 0;
  const totalAttempted: number = derived?.total_attempted ?? 0;
  const totalCorrect: number = derived?.total_correct ?? 0;
  const mastered = bestStreak >= MASTERY_STREAK;

  await query(
    `INSERT INTO topic_mastery
       (student_id, topic_id, correct_streak, best_streak, total_attempted, total_correct,
        mastered, mastered_at, last_practiced_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 THEN now() ELSE NULL END, COALESCE($8, now()), now())
     ON CONFLICT (student_id, topic_id) DO UPDATE SET
       correct_streak = EXCLUDED.correct_streak,
       best_streak = EXCLUDED.best_streak,
       total_attempted = EXCLUDED.total_attempted,
       total_correct = EXCLUDED.total_correct,
       mastered = EXCLUDED.mastered,
       mastered_at = CASE
         WHEN EXCLUDED.mastered THEN COALESCE(topic_mastery.mastered_at, now())
         ELSE NULL END,
       last_practiced_at = EXCLUDED.last_practiced_at,
       updated_at = now()`,
    [studentId, topicId, correctStreak, bestStreak, totalAttempted, totalCorrect, mastered, derived?.last_practiced_at ?? null]
  );

  return {
    correctStreak,
    bestStreak,
    totalAttempted,
    totalCorrect,
    mastered,
    streakNeeded: MASTERY_STREAK,
  };
}
