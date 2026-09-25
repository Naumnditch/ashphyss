/**
 * Numbers for the admin overview and the admin sidebar's "needs action" badges.
 */

import { query } from '@/lib/db/client';

export const OVERVIEW_DAYS = 30;

export interface PendingCounts {
  teacherApplications: number;
  paymentReceipts: number;
  videoRequests: number;
  tutoringToSchedule: number;
  unreadMessages: number;
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  activeUsers: number;
  correct: number;
  incorrect: number;
}

export interface OverviewData {
  students: number;
  teachers: number;
  activeUsers7d: number;
  attempts: number;
  correctAttempts: number;
  lessons: number;
  lessonsWithPractice: number;
  daily: DailyPoint[];
  activityMix: { label: string; count: number }[];
}

/** Things waiting on an admin; drives the sidebar badges and the overview's attention row. */
export async function getPendingCounts(): Promise<PendingCounts> {
  const res = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND status = 'inactive') AS teacher_applications,
      (SELECT COUNT(*) FROM payment_requests WHERE status = 'pending') AS payment_receipts,
      (SELECT COUNT(*) FROM video_requests WHERE status = 'open') AS video_requests,
      (SELECT COUNT(*) FROM addon_purchases WHERE status = 'paid') AS tutoring_to_schedule,
      (SELECT COUNT(*) FROM messages WHERE direction = 'inbound' AND read_at IS NULL) AS unread_messages
  `);
  const r = res.rows[0];
  return {
    teacherApplications: Number(r.teacher_applications),
    paymentReceipts: Number(r.payment_receipts),
    videoRequests: Number(r.video_requests),
    tutoringToSchedule: Number(r.tutoring_to_schedule),
    unreadMessages: Number(r.unread_messages),
  };
}

// Event types in the order the "what students did" chart lists them.
const ACTIVITY_LABELS: [string, string][] = [
  ['lesson_view', 'Lesson views'],
  ['page_view', 'Page views'],
  ['simulation_start', 'Simulations started'],
  ['practice_start', 'Practice sessions'],
  ['download', 'Downloads'],
  ['login', 'Logins'],
  ['signup', 'Sign-ups'],
];

export async function getOverviewData(): Promise<OverviewData> {
  const [totals, daily, mix] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND status = 'active') AS teachers,
        (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_seen_at > now() - interval '7 days') AS active_7d,
        (SELECT COUNT(*) FROM practice_attempts WHERE created_at > now() - make_interval(days => $1)) AS attempts,
        (SELECT COUNT(*) FROM practice_attempts WHERE is_correct AND created_at > now() - make_interval(days => $1)) AS correct,
        (SELECT COUNT(*) FROM topics) AS lessons,
        (SELECT COUNT(DISTINCT topic_id) FROM problems WHERE topic_id IS NOT NULL) AS lessons_with_practice
    `, [OVERVIEW_DAYS]),
    // Every day in the window, including the quiet ones, so the chart's x-axis is continuous.
    query(`
      WITH days AS (
        SELECT generate_series(date_trunc('day', now()) - make_interval(days => $1 - 1), date_trunc('day', now()), interval '1 day')::date AS day
      ),
      active AS (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(DISTINCT user_id) AS n
        FROM analytics_events
        WHERE user_id IS NOT NULL AND created_at > now() - make_interval(days => $1)
        GROUP BY 1
      ),
      practice AS (
        SELECT date_trunc('day', created_at)::date AS day,
               COUNT(*) FILTER (WHERE is_correct) AS correct,
               COUNT(*) FILTER (WHERE NOT is_correct) AS incorrect
        FROM practice_attempts
        WHERE created_at > now() - make_interval(days => $1)
        GROUP BY 1
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
             COALESCE(active.n, 0) AS active_users,
             COALESCE(practice.correct, 0) AS correct,
             COALESCE(practice.incorrect, 0) AS incorrect
      FROM days
      LEFT JOIN active ON active.day = days.day
      LEFT JOIN practice ON practice.day = days.day
      ORDER BY days.day
    `, [OVERVIEW_DAYS]),
    query(`
      SELECT event_type, COUNT(*) AS n
      FROM analytics_events
      WHERE created_at > now() - make_interval(days => $1)
      GROUP BY event_type
    `, [OVERVIEW_DAYS]),
  ]);

  const t = totals.rows[0];
  const counts = new Map<string, number>(mix.rows.map((r: { event_type: string; n: string }) => [r.event_type, Number(r.n)]));

  return {
    students: Number(t.students),
    teachers: Number(t.teachers),
    activeUsers7d: Number(t.active_7d),
    attempts: Number(t.attempts),
    correctAttempts: Number(t.correct),
    lessons: Number(t.lessons),
    lessonsWithPractice: Number(t.lessons_with_practice),
    daily: daily.rows.map((r: { day: string; active_users: string; correct: string; incorrect: string }) => ({
      day: r.day,
      activeUsers: Number(r.active_users),
      correct: Number(r.correct),
      incorrect: Number(r.incorrect),
    })),
    activityMix: ACTIVITY_LABELS.map(([type, label]) => ({ label, count: counts.get(type) ?? 0 })).sort(
      (a, b) => b.count - a.count
    ),
  };
}

export async function getRecentSignups(limit = 6) {
  const res = await query(
    `SELECT id, first_name, last_name, email, role, status, created_at
     FROM users ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
  }[];
}
