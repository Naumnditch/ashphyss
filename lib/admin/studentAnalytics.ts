/**
 * The analytics block at the top of /admin/students/[id]: question outcomes
 * (right / wrong / skipped / not reached), accuracy by topic, chapter and
 * difficulty, why answers were marked wrong, the questions a student keeps
 * missing, and how much they use the site.
 *
 * Admin-only, server-side, same access model as lib/admin/students.ts.
 *
 * Definitions (also shown on the page):
 * - A question is "right" or "wrong" by the student's latest answer to it.
 * - "First-try right" is by their first answer to it.
 * - "Skipped" means skipped and never answered since. Skips are recorded from
 *   2026-10-17 (analytics_events 'practice_skip'); before that they lived only
 *   in the browser.
 * - "Not reached" counts the questions in the lessons they have opened in
 *   practice (per curriculum bank) that they have neither answered nor skipped.
 */

import { query } from '@/lib/db/client';
import { getTopicStats, type TopicStatRow } from '@/lib/practice/analytics';
import { ACTIVE_GAP_MINUTES } from '@/lib/admin/studentHistory';

export interface QuestionOutcomes {
  answered: number;
  right: number;
  wrong: number;
  firstTryRight: number;
  skipped: number;
  notReached: number;
  /** Questions in every lesson bank they have opened in practice. */
  inStartedLessons: number;
  submissions: number;
  correctSubmissions: number;
  hintsUsed: number;
  medianTimeMs: number | null;
  wrongReasons: { wrongValue: number; wrongUnit: number; unparseable: number; other: number };
}

export interface DifficultyRow {
  level: number;
  attempted: number;
  correct: number;
}

export interface MissedQuestion {
  problem_id: string;
  topic_id: string | null;
  problem_number: number | null;
  topic_name: string | null;
  question: string;
  wrong: number;
  tries: number;
  latest_correct: boolean;
  last_answer: string | null;
  last_at: string;
}

export interface UsageStats {
  totalActiveMinutes: number;
  activeMinutes7d: number;
  activeMinutes30d: number;
  activeDays: number;
  activeDays30d: number;
  logins30d: number;
  practiceSessions: number;
  lessonsOpened: number;
  simulationsStarted: number;
  solutionsOpened: number;
  downloads: number;
  videoRequests: number;
  firstActivityAt: string | null;
}

export interface WeeklyAnswers {
  week: string;
  correct: number;
  incorrect: number;
}

export interface StudentAnalytics {
  outcomes: QuestionOutcomes;
  topics: TopicStatRow[];
  difficulty: DifficultyRow[];
  missed: MissedQuestion[];
  usage: UsageStats;
  weeklyAnswers: WeeklyAnswers[];
  topicsMastered: number;
  bestStreak: number;
}

const n = (v: unknown) => Number(v ?? 0);

export async function getStudentAnalytics(studentId: string, weeks = 12): Promise<StudentAnalytics> {
  const [outcomes, topics, difficulty, missed, usage, weekly, mastery] = await Promise.all([
    query(
      `WITH latest AS (
         SELECT DISTINCT ON (problem_id) problem_id, is_correct
         FROM practice_attempts WHERE student_id = $1
         ORDER BY problem_id, created_at DESC
       ),
       first AS (
         SELECT DISTINCT ON (problem_id) problem_id, is_correct
         FROM practice_attempts WHERE student_id = $1
         ORDER BY problem_id, created_at ASC
       ),
       skips AS (
         SELECT DISTINCT e.metadata->>'problemId' AS problem_id
         FROM analytics_events e
         WHERE e.user_id = $1 AND e.event_type = 'practice_skip' AND e.metadata ? 'problemId'
       ),
       open_skips AS (
         SELECT s.problem_id FROM skips s
         WHERE NOT EXISTS (SELECT 1 FROM latest l WHERE l.problem_id::text = s.problem_id)
       ),
       banks AS (
         SELECT DISTINCT p.topic_id, p.curriculum_id
         FROM practice_attempts a JOIN problems p ON p.id = a.problem_id
         WHERE a.student_id = $1 AND p.topic_id IS NOT NULL
         UNION
         SELECT e.entity_id, COALESCE(e.metadata->>'curriculum', 'igcse')
         FROM analytics_events e
         WHERE e.user_id = $1 AND e.event_type = 'practice_start' AND e.entity_id IS NOT NULL
       ),
       bank_problems AS (
         SELECT p.id FROM problems p JOIN banks b ON b.topic_id = p.topic_id AND b.curriculum_id = p.curriculum_id
       ),
       subs AS (
         SELECT COUNT(*)::int AS submissions,
                COUNT(*) FILTER (WHERE is_correct)::int AS correct_submissions,
                COUNT(*) FILTER (WHERE hint_used)::int AS hints,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY time_spent_ms) AS median_ms,
                COUNT(*) FILTER (WHERE NOT is_correct AND grade_reason = 'wrong-value')::int AS r_value,
                COUNT(*) FILTER (WHERE NOT is_correct AND grade_reason = 'wrong-unit')::int AS r_unit,
                COUNT(*) FILTER (WHERE NOT is_correct AND grade_reason = 'unparseable')::int AS r_unparseable,
                COUNT(*) FILTER (WHERE NOT is_correct AND COALESCE(grade_reason, '') NOT IN ('wrong-value', 'wrong-unit', 'unparseable'))::int AS r_other
         FROM practice_attempts WHERE student_id = $1
       )
       SELECT
         (SELECT COUNT(*) FROM latest)::int AS answered,
         (SELECT COUNT(*) FROM latest WHERE is_correct)::int AS right_now,
         (SELECT COUNT(*) FROM latest WHERE NOT is_correct)::int AS wrong_now,
         (SELECT COUNT(*) FROM first WHERE is_correct)::int AS first_try_right,
         (SELECT COUNT(*) FROM open_skips)::int AS skipped,
         (SELECT COUNT(*) FROM bank_problems)::int AS in_started,
         (SELECT COUNT(*) FROM bank_problems bp
            WHERE NOT EXISTS (SELECT 1 FROM latest l WHERE l.problem_id = bp.id)
              AND NOT EXISTS (SELECT 1 FROM open_skips s WHERE s.problem_id = bp.id::text))::int AS not_reached,
         subs.*
       FROM subs`,
      [studentId]
    ),
    // Reuses the teacher analytics view (v_student_topic_stats); admins see everyone.
    getTopicStats({ id: 'admin', role: 'admin' }, studentId),
    query(
      `SELECT COALESCE(p.difficulty_level, 0) AS level, COUNT(*)::int AS attempted,
              COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
       FROM practice_attempts a JOIN problems p ON p.id = a.problem_id
       WHERE a.student_id = $1
       GROUP BY 1 ORDER BY 1`,
      [studentId]
    ),
    // Questions still wrong first, then the ones that took the most wrong tries.
    query(
      `SELECT a.problem_id, p.topic_id, p.problem_number, t.topic_name,
              left(regexp_replace(p.question_text, '\\s+', ' ', 'g'), 160) AS question,
              COUNT(*) FILTER (WHERE NOT a.is_correct)::int AS wrong,
              COUNT(*)::int AS tries,
              (array_agg(a.is_correct ORDER BY a.created_at DESC))[1] AS latest_correct,
              (array_agg(COALESCE(po.option_letter || ': ' || left(po.option_text, 60), left(a.raw_answer, 60))
                 ORDER BY a.created_at DESC))[1] AS last_answer,
              MAX(a.created_at) AS last_at
       FROM practice_attempts a
       JOIN problems p ON p.id = a.problem_id
       LEFT JOIN topics t ON t.id = p.topic_id
       LEFT JOIN problem_options po ON po.problem_id = a.problem_id AND po.id::text = a.raw_answer
       WHERE a.student_id = $1
       GROUP BY a.problem_id, p.topic_id, p.problem_number, t.topic_name, p.question_text
       HAVING COUNT(*) FILTER (WHERE NOT a.is_correct) > 0
       ORDER BY latest_correct ASC, wrong DESC, last_at DESC
       LIMIT 10`,
      [studentId]
    ),
    // Active time: gaps of up to ACTIVE_GAP_MINUTES between consecutive actions.
    query(
      `WITH acts AS (
         SELECT created_at AS at FROM analytics_events WHERE user_id = $1
         UNION ALL SELECT created_at FROM practice_attempts WHERE student_id = $1
         UNION ALL SELECT accessed_at FROM solution_access_log WHERE user_id = $1
       ),
       gaps AS (SELECT at, LEAD(at) OVER (ORDER BY at) - at AS gap FROM acts)
       SELECT
         COALESCE(SUM(EXTRACT(epoch FROM gap)) FILTER (WHERE gap <= make_interval(mins => $2)), 0) / 60 AS total_min,
         COALESCE(SUM(EXTRACT(epoch FROM gap)) FILTER (WHERE gap <= make_interval(mins => $2) AND at > now() - interval '7 days'), 0) / 60 AS min_7d,
         COALESCE(SUM(EXTRACT(epoch FROM gap)) FILTER (WHERE gap <= make_interval(mins => $2) AND at > now() - interval '30 days'), 0) / 60 AS min_30d,
         COUNT(DISTINCT (at AT TIME ZONE 'UTC')::date)::int AS active_days,
         COUNT(DISTINCT (at AT TIME ZONE 'UTC')::date) FILTER (WHERE at > now() - interval '30 days')::int AS active_days_30d,
         MIN(at) AS first_at,
         (SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'login' AND created_at > now() - interval '30 days')::int AS logins_30d,
         (SELECT COUNT(*) FROM practice_sessions WHERE student_id = $1)::int AS practice_sessions,
         (SELECT COUNT(DISTINCT entity_id) FROM analytics_events WHERE user_id = $1 AND event_type = 'lesson_view')::int AS lessons,
         (SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'simulation_start')::int AS sims,
         (SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'download')::int AS downloads,
         (SELECT COUNT(DISTINCT solution_id) FROM solution_access_log WHERE user_id = $1 AND action = 'view_full')::int AS solutions,
         (SELECT COUNT(*) FROM video_requests WHERE student_id = $1)::int AS video_requests
       FROM gaps`,
      [studentId, ACTIVE_GAP_MINUTES]
    ),
    query(
      `WITH weeks AS (
         SELECT generate_series(date_trunc('week', now()) - make_interval(weeks => $2 - 1), date_trunc('week', now()), interval '1 week') AS w
       )
       SELECT to_char(weeks.w, 'YYYY-MM-DD') AS week,
              COUNT(a.id) FILTER (WHERE a.is_correct)::int AS correct,
              COUNT(a.id) FILTER (WHERE NOT a.is_correct)::int AS incorrect
       FROM weeks
       LEFT JOIN practice_attempts a ON a.student_id = $1 AND date_trunc('week', a.created_at) = weeks.w
       GROUP BY weeks.w ORDER BY weeks.w`,
      [studentId, weeks]
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE mastered)::int AS mastered, COALESCE(MAX(best_streak), 0)::int AS best_streak
       FROM topic_mastery WHERE student_id = $1`,
      [studentId]
    ),
  ]);

  const o = outcomes.rows[0] ?? {};
  const u = usage.rows[0] ?? {};
  return {
    outcomes: {
      answered: n(o.answered),
      right: n(o.right_now),
      wrong: n(o.wrong_now),
      firstTryRight: n(o.first_try_right),
      skipped: n(o.skipped),
      notReached: n(o.not_reached),
      inStartedLessons: n(o.in_started),
      submissions: n(o.submissions),
      correctSubmissions: n(o.correct_submissions),
      hintsUsed: n(o.hints),
      medianTimeMs: o.median_ms === null || o.median_ms === undefined ? null : Number(o.median_ms),
      wrongReasons: {
        wrongValue: n(o.r_value),
        wrongUnit: n(o.r_unit),
        unparseable: n(o.r_unparseable),
        other: n(o.r_other),
      },
    },
    topics,
    difficulty: difficulty.rows.map((r) => ({ level: n(r.level), attempted: n(r.attempted), correct: n(r.correct) })),
    missed: missed.rows.map((r) => ({ ...r, wrong: n(r.wrong), tries: n(r.tries) })) as MissedQuestion[],
    usage: {
      totalActiveMinutes: Math.round(n(u.total_min)),
      activeMinutes7d: Math.round(n(u.min_7d)),
      activeMinutes30d: Math.round(n(u.min_30d)),
      activeDays: n(u.active_days),
      activeDays30d: n(u.active_days_30d),
      logins30d: n(u.logins_30d),
      practiceSessions: n(u.practice_sessions),
      lessonsOpened: n(u.lessons),
      simulationsStarted: n(u.sims),
      solutionsOpened: n(u.solutions),
      downloads: n(u.downloads),
      videoRequests: n(u.video_requests),
      firstActivityAt: u.first_at ?? null,
    },
    weeklyAnswers: weekly.rows.map((r) => ({ week: r.week, correct: n(r.correct), incorrect: n(r.incorrect) })),
    topicsMastered: n(mastery.rows[0]?.mastered),
    bestStreak: n(mastery.rows[0]?.best_streak),
  };
}
