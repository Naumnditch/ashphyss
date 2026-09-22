/**
 * Reads for the teacher analytics pages.
 *
 * Every function here takes the viewer and runs its query through
 * rosterScope(), so a teacher's queries are narrowed to students in their own
 * sections at the point the SQL is built. There is no unscoped read.
 */

import { query } from '@/lib/db/client';
import { rosterScope, type Viewer } from '@/lib/practice/access';

/** A question is flagged when fewer than this share of attempts are right. */
export const LOW_SUCCESS_RATE = 0.3;
/** ...or when more than this share of attempts couldn't be parsed at all. */
export const HIGH_UNPARSEABLE_RATE = 0.1;
/** Students below this accuracy are highlighted on the roster. */
export const STRUGGLING_ACCURACY = 0.5;
/** Students with no attempt in this many days are highlighted as inactive. */
export const INACTIVE_DAYS = 7;

export interface RosterRow {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  topics_practiced: number;
  total_attempted: number;
  total_correct: number;
  accuracy: number | null;
  total_time_ms: number;
  topics_mastered: number;
  current_day_streak: number;
  last_active_at: string | null;
}

export async function getRoster(viewer: Viewer): Promise<RosterRow[]> {
  const scope = rosterScope(viewer, 'o.student_id');
  const result = await query(
    `SELECT o.student_id, o.first_name, o.last_name, o.email, o.topics_practiced,
            o.total_attempted, o.total_correct, o.accuracy, o.total_time_ms,
            o.topics_mastered, o.current_day_streak, o.last_active_at
     FROM v_student_overview o
     WHERE ${scope.clause}
     ORDER BY o.last_active_at DESC NULLS LAST, o.last_name, o.first_name`,
    scope.params as unknown[]
  );
  return result.rows.map(normaliseRosterRow);
}

function normaliseRosterRow(row: Record<string, unknown>): RosterRow {
  return {
    student_id: String(row.student_id),
    first_name: (row.first_name as string) ?? null,
    last_name: (row.last_name as string) ?? null,
    email: String(row.email),
    topics_practiced: Number(row.topics_practiced ?? 0),
    total_attempted: Number(row.total_attempted ?? 0),
    total_correct: Number(row.total_correct ?? 0),
    accuracy: row.accuracy === null || row.accuracy === undefined ? null : Number(row.accuracy),
    total_time_ms: Number(row.total_time_ms ?? 0),
    topics_mastered: Number(row.topics_mastered ?? 0),
    current_day_streak: Number(row.current_day_streak ?? 0),
    last_active_at: (row.last_active_at as string) ?? null,
  };
}

export interface TopicStatRow {
  student_id: string;
  topic_id: string;
  topic_name: string;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  avg_time_ms: number | null;
  hints_used: number;
  unparseable: number;
  mastered: boolean;
  first_practiced_at: string;
  last_practiced_at: string;
}

export async function getTopicStats(viewer: Viewer, studentId?: string): Promise<TopicStatRow[]> {
  const scope = rosterScope(viewer, 's.student_id');
  const params = [...(scope.params as unknown[])];
  let extra = '';
  if (studentId) {
    params.push(studentId);
    extra = ` AND s.student_id = $${params.length}`;
  }
  const result = await query(
    `SELECT s.student_id, s.topic_id, s.topic_name, s.attempted, s.correct, s.incorrect,
            s.accuracy, s.avg_time_ms, s.hints_used, s.unparseable, s.mastered,
            s.first_practiced_at, s.last_practiced_at
     FROM v_student_topic_stats s
     WHERE ${scope.clause}${extra}
     ORDER BY s.topic_name`,
    params
  );
  return result.rows.map((row) => ({
    ...row,
    attempted: Number(row.attempted),
    correct: Number(row.correct),
    incorrect: Number(row.incorrect),
    accuracy: Number(row.accuracy),
    avg_time_ms: row.avg_time_ms === null ? null : Number(row.avg_time_ms),
    hints_used: Number(row.hints_used),
    unparseable: Number(row.unparseable),
  })) as TopicStatRow[];
}

export interface DailyAccuracyRow {
  day: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

/** Accuracy over time, for the line chart. */
export async function getDailyAccuracy(viewer: Viewer, studentId?: string): Promise<DailyAccuracyRow[]> {
  const scope = rosterScope(viewer, 'a.student_id');
  const params = [...(scope.params as unknown[])];
  let extra = '';
  if (studentId) {
    params.push(studentId);
    extra = ` AND a.student_id = $${params.length}`;
  }
  const result = await query(
    `SELECT (a.created_at AT TIME ZONE 'UTC')::date AS day,
            COUNT(*)::int AS attempted,
            COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
     FROM practice_attempts a
     WHERE ${scope.clause}${extra}
     GROUP BY 1 ORDER BY 1`,
    params
  );
  return result.rows.map((row) => ({
    day: new Date(row.day).toISOString().slice(0, 10),
    attempted: Number(row.attempted),
    correct: Number(row.correct),
    accuracy: Number(row.attempted) === 0 ? 0 : Number(row.correct) / Number(row.attempted),
  }));
}

export interface MasteryDistributionRow {
  topic_name: string;
  mastered: number;
  practising: number;
}

/** Per topic: how many of the class have mastered it vs are still working. */
export async function getMasteryDistribution(viewer: Viewer): Promise<MasteryDistributionRow[]> {
  const scope = rosterScope(viewer, 's.student_id');
  const result = await query(
    `SELECT s.topic_name,
            COUNT(*) FILTER (WHERE s.mastered)::int AS mastered,
            COUNT(*) FILTER (WHERE NOT s.mastered)::int AS practising
     FROM v_student_topic_stats s
     WHERE ${scope.clause}
     GROUP BY s.topic_name
     ORDER BY s.topic_name`,
    scope.params as unknown[]
  );
  return result.rows.map((row) => ({
    topic_name: row.topic_name,
    mastered: Number(row.mastered),
    practising: Number(row.practising),
  }));
}

export interface WrongAttemptRow {
  id: string;
  created_at: string;
  problem_number: number | null;
  question_text: string;
  topic_name: string;
  raw_answer: string | null;
  normalized_answer: string | null;
  answer_correct: string | null;
  answer_unit: string | null;
  grade_reason: string | null;
  grading_method: string | null;
  time_spent_ms: number | null;
}

/** The specific questions a student got wrong, most recent first. */
export async function getWrongAttempts(viewer: Viewer, studentId: string, limit = 100): Promise<WrongAttemptRow[]> {
  const scope = rosterScope(viewer, 'a.student_id');
  const params = [...(scope.params as unknown[]), studentId, limit];
  const result = await query(
    `SELECT a.id, a.created_at, p.problem_number, p.question_text, t.topic_name,
            a.raw_answer, a.normalized_answer, p.answer_correct, p.answer_unit,
            a.grade_reason, a.grading_method, a.time_spent_ms
     FROM practice_attempts a
     JOIN problems p ON p.id = a.problem_id
     LEFT JOIN topics t ON t.id = a.topic_id
     WHERE ${scope.clause}
       AND a.student_id = $${params.length - 1}
       AND NOT a.is_correct
     ORDER BY a.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows as WrongAttemptRow[];
}

export interface ProblemHealthRow {
  problem_id: string;
  problem_number: number | null;
  question_text: string;
  topic_name: string;
  answer_type: string;
  total_attempts: number;
  distinct_students: number;
  success_rate: number;
  unparseable_rate: number;
  avg_attempts_to_first_correct: number | null;
  last_attempted_at: string | null;
  flagged: boolean;
  flags: string[];
}

/**
 * Problem-level health, scoped to the viewer's own students. This is the
 * safety net for a repeat of the grading bug: a question whose success rate
 * collapses, or that students keep typing answers the grader can't read,
 * shows up here instead of waiting to surface in a classroom.
 */
export async function getProblemHealth(viewer: Viewer): Promise<ProblemHealthRow[]> {
  const scope = rosterScope(viewer, 'a.student_id');
  const result = await query(
    `SELECT p.id AS problem_id, p.problem_number, p.question_text, t.topic_name,
            p.answer_type::text AS answer_type,
            COUNT(a.id)::int AS total_attempts,
            COUNT(DISTINCT a.student_id)::int AS distinct_students,
            AVG(CASE WHEN a.is_correct THEN 1.0 ELSE 0.0 END) AS success_rate,
            COUNT(a.id) FILTER (WHERE a.grade_reason = 'unparseable')::numeric
              / NULLIF(COUNT(a.id), 0) AS unparseable_rate,
            AVG(CASE WHEN a.is_correct THEN a.attempt_number END) AS avg_attempts_to_first_correct,
            MAX(a.created_at) AS last_attempted_at
     FROM practice_attempts a
     JOIN problems p ON p.id = a.problem_id
     LEFT JOIN topics t ON t.id = p.topic_id
     WHERE ${scope.clause}
     GROUP BY p.id, p.problem_number, p.question_text, t.topic_name, p.answer_type
     HAVING COUNT(a.id) > 0
     ORDER BY AVG(CASE WHEN a.is_correct THEN 1.0 ELSE 0.0 END) ASC, COUNT(a.id) DESC`,
    scope.params as unknown[]
  );

  return result.rows.map((row) => {
    const successRate = Number(row.success_rate ?? 0);
    const unparseableRate = Number(row.unparseable_rate ?? 0);
    const flags: string[] = [];
    if (successRate < LOW_SUCCESS_RATE) flags.push('low success rate');
    if (unparseableRate > HIGH_UNPARSEABLE_RATE) flags.push('answers not being read');
    return {
      problem_id: String(row.problem_id),
      problem_number: row.problem_number === null ? null : Number(row.problem_number),
      question_text: row.question_text,
      topic_name: row.topic_name ?? '—',
      answer_type: row.answer_type,
      total_attempts: Number(row.total_attempts),
      distinct_students: Number(row.distinct_students),
      success_rate: successRate,
      unparseable_rate: unparseableRate,
      avg_attempts_to_first_correct:
        row.avg_attempts_to_first_correct === null ? null : Number(row.avg_attempts_to_first_correct),
      last_attempted_at: row.last_attempted_at,
      flagged: flags.length > 0,
      flags,
    };
  });
}

export async function getStudentSummary(viewer: Viewer, studentId: string): Promise<RosterRow | null> {
  const scope = rosterScope(viewer, 'o.student_id');
  const params = [...(scope.params as unknown[]), studentId];
  const result = await query(
    `SELECT o.student_id, o.first_name, o.last_name, o.email, o.topics_practiced,
            o.total_attempted, o.total_correct, o.accuracy, o.total_time_ms,
            o.topics_mastered, o.current_day_streak, o.last_active_at
     FROM v_student_overview o
     WHERE ${scope.clause} AND o.student_id = $${params.length}`,
    params
  );
  return result.rows.length ? normaliseRosterRow(result.rows[0]) : null;
}

/** Whether this teacher has any class set up yet, for the empty state. */
export async function getSectionCount(viewer: Viewer): Promise<number> {
  if (viewer.role === 'admin') {
    const all = await query(`SELECT COUNT(*)::int AS n FROM sections`);
    return Number(all.rows[0]?.n ?? 0);
  }
  const result = await query(`SELECT COUNT(*)::int AS n FROM sections WHERE teacher_id = $1`, [viewer.id]);
  return Number(result.rows[0]?.n ?? 0);
}
