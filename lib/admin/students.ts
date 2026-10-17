/**
 * Reads for /admin/students and /admin/students/[id].
 *
 * Admin-only: the pages sit under app/admin/layout.tsx (role === 'admin'),
 * and like every other admin read they go through the server-side owner
 * connection — see lib/practice/access.ts for why RLS here is deny-by-default
 * for the API roles rather than per-row policies. Nothing in this module is
 * reachable from the browser.
 *
 * Every timeline entry comes from a row that already exists; nothing is
 * inferred except "paid access ran out", which is the subscription's own
 * end_date once it has passed.
 */

import { query } from '@/lib/db/client';
import {
  ACTIVE_GAP_MINUTES,
  STUDENTS_PAGE_SIZE,
  TIMELINE_PAGE_SIZE,
  type ActivityCategory,
  type ChapterAccuracy,
  type StudentListParams,
  type StudentSort,
  type TimelineFilters,
} from '@/lib/admin/studentHistory';

// ---------------------------------------------------------------------------
// Student list

export interface StudentListRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  account_status: string;
  joined_at: string;
  plan_name: string | null;
  /** The plan's own tier, whether or not it is still active. */
  plan_tier: number | null;
  /** The tier the student has right now (0 unless active and unexpired). */
  tier_level: number;
  sub_status: string | null;
  sub_end: string | null;
  /** Distinct questions answered. */
  questions: number;
  /** Answers submitted, retries included, and how many were right. */
  attempted: number;
  correct: number;
  last_active_at: string | null;
}

const SORT_SQL: Record<StudentSort, string> = {
  name: `lower(concat_ws(' ', first_name, last_name))`,
  email: `lower(email)`,
  tier: `tier_level`,
  expiry: `sub_end`,
  joined: `joined_at`,
  active: `last_active_at`,
  attempts: `questions`,
  accuracy: `CASE WHEN attempted > 0 THEN correct::float / attempted END`,
};

export async function listStudents(params: StudentListParams): Promise<{ rows: StudentListRow[]; total: number }> {
  const values: unknown[] = [];
  let where = `u.role = 'student'`;
  if (params.search) {
    values.push(`%${params.search.toLowerCase()}%`);
    where += ` AND (lower(concat_ws(' ', u.first_name, u.last_name)) LIKE $1 OR lower(u.email) LIKE $1)`;
  }
  values.push(STUDENTS_PAGE_SIZE, (params.page - 1) * STUDENTS_PAGE_SIZE);
  const limitIdx = values.length - 1;

  // SORT_SQL is a fixed whitelist, never user text.
  const order = `${SORT_SQL[params.sort]} ${params.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, id`;

  const result = await query(
    `WITH base AS (
       SELECT u.id, u.first_name, u.last_name, u.email, u.status::text AS account_status,
              u.created_at AT TIME ZONE 'UTC' AS joined_at,
              p.name AS plan_name, p.tier_level AS plan_tier,
              CASE WHEN s.status = 'active' AND (s.end_date IS NULL OR s.end_date > now())
                   THEN COALESCE(p.tier_level, 0) ELSE 0 END AS tier_level,
              s.status::text AS sub_status,
              s.end_date AT TIME ZONE 'UTC' AS sub_end,
              COALESCE(pa.questions, 0) AS questions,
              COALESCE(pa.attempted, 0) AS attempted,
              COALESCE(pa.correct, 0) AS correct,
              GREATEST(ss.last_seen, ae.last_event, pa.last_attempt) AS last_active_at
       FROM users u
       LEFT JOIN subscriptions s ON s.student_id = u.id
       LEFT JOIN subscription_plans p ON p.id = s.plan_id
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT problem_id)::int AS questions, COUNT(*)::int AS attempted,
                COUNT(*) FILTER (WHERE is_correct)::int AS correct, MAX(created_at) AS last_attempt
         FROM practice_attempts WHERE student_id = u.id
       ) pa ON true
       LEFT JOIN LATERAL (SELECT MAX(last_seen_at) AS last_seen FROM sessions WHERE user_id = u.id) ss ON true
       LEFT JOIN LATERAL (SELECT MAX(created_at) AS last_event FROM analytics_events WHERE user_id = u.id) ae ON true
       WHERE ${where}
     )
     SELECT base.*, COUNT(*) OVER () AS total
     FROM base
     ORDER BY ${order}
     LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
    values
  );

  let total = Number(result.rows[0]?.total ?? 0);
  if (result.rows.length === 0 && params.page > 1) {
    // Past the last page: still report the real total for the pager.
    const c = await query(
      `SELECT COUNT(*)::int AS n FROM users u WHERE ${where}`,
      params.search ? [values[0]] : []
    );
    total = Number(c.rows[0]?.n ?? 0);
  }

  return {
    total,
    rows: result.rows.map((r) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      account_status: r.account_status,
      joined_at: r.joined_at,
      plan_name: r.plan_name,
      plan_tier: r.plan_tier === null ? null : Number(r.plan_tier),
      tier_level: Number(r.tier_level),
      sub_status: r.sub_status,
      sub_end: r.sub_end,
      questions: Number(r.questions),
      attempted: Number(r.attempted),
      correct: Number(r.correct),
      last_active_at: r.last_active_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// One student

export interface StudentProfile extends StudentListRow {
  school_name: string | null;
  section_name: string | null;
  billing_cycle: string | null;
  sub_start: string | null;
  active_devices: number;
  last_login_at: string | null;
}

export async function getStudentProfile(id: string): Promise<StudentProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.status::text AS account_status,
            u.created_at AT TIME ZONE 'UTC' AS joined_at, u.school_name, sec.name AS section_name,
            p.name AS plan_name, p.tier_level AS plan_tier,
            CASE WHEN s.status = 'active' AND (s.end_date IS NULL OR s.end_date > now())
                 THEN COALESCE(p.tier_level, 0) ELSE 0 END AS tier_level,
            s.status::text AS sub_status, s.billing_cycle,
            s.start_date AT TIME ZONE 'UTC' AS sub_start,
            s.end_date AT TIME ZONE 'UTC' AS sub_end,
            (SELECT COUNT(DISTINCT problem_id)::int FROM practice_attempts WHERE student_id = u.id) AS questions,
            (SELECT COUNT(*)::int FROM practice_attempts WHERE student_id = u.id) AS attempted,
            (SELECT COUNT(*)::int FROM practice_attempts WHERE student_id = u.id AND is_correct) AS correct,
            (SELECT COUNT(*)::int FROM sessions WHERE user_id = u.id AND revoked_at IS NULL
               AND created_at > now() - interval '90 days') AS active_devices,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = u.id AND event_type = 'login') AS last_login_at,
            GREATEST(
              (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = u.id),
              (SELECT MAX(created_at) FROM analytics_events WHERE user_id = u.id),
              (SELECT MAX(created_at) FROM practice_attempts WHERE student_id = u.id)
            ) AS last_active_at
     FROM users u
     LEFT JOIN sections sec ON sec.id = u.section_id
     LEFT JOIN subscriptions s ON s.student_id = u.id
     LEFT JOIN subscription_plans p ON p.id = s.plan_id
     WHERE u.id = $1 AND u.role = 'student'`,
    [id]
  );
  const r = result.rows[0];
  if (!r) return null;
  return {
    ...r,
    plan_tier: r.plan_tier === null ? null : Number(r.plan_tier),
    tier_level: Number(r.tier_level),
    questions: Number(r.questions),
    attempted: Number(r.attempted),
    correct: Number(r.correct),
    active_devices: Number(r.active_devices),
  };
}

export interface PaymentRequestRow {
  id: string;
  created_at: string;
  status: string;
  amount_claimed: string | null;
  detected_amount: string | null;
  detected_currency: string | null;
  detection_confidence: string | null;
  detection_note: string | null;
  auto_approved: boolean | null;
  months: number | null;
  plan_name: string | null;
  detected_plan_name: string | null;
  detected_months: number | null;
  course_title: string | null;
  reference: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
}

export interface ShopierOrderRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  amount: string | null;
  currency: string | null;
  billing_cycle: string | null;
  is_test: boolean | null;
  item_name: string | null;
}

export async function getPaymentHistory(id: string): Promise<{
  requests: PaymentRequestRow[];
  shopier: ShopierOrderRow[];
}> {
  const [requests, shopier] = await Promise.all([
    query(
      `SELECT pr.id, pr.created_at, pr.status, pr.amount_claimed, pr.detected_amount, pr.detected_currency,
              pr.detection_confidence, pr.detection_note, pr.auto_approved, pr.months,
              p.name AS plan_name, dp.name AS detected_plan_name, pr.detected_months,
              c.title AS course_title, pr.reference, pr.admin_note, pr.reviewed_at,
              NULLIF(concat_ws(' ', rv.first_name, rv.last_name), '') AS reviewer_name
       FROM payment_requests pr
       LEFT JOIN subscription_plans p ON p.id = pr.plan_id
       LEFT JOIN subscription_plans dp ON dp.id = pr.detected_plan_id
       LEFT JOIN courses c ON c.id = pr.course_id
       LEFT JOIN users rv ON rv.id = pr.reviewed_by
       WHERE pr.student_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 200`,
      [id]
    ),
    query(
      `SELECT o.id, o.created_at, o.updated_at, o.status, o.amount, o.currency, o.billing_cycle, o.is_test,
              COALESCE(p.name, a.name) AS item_name
       FROM shopier_orders o
       LEFT JOIN subscription_plans p ON p.id = o.plan_id
       LEFT JOIN addon_services a ON a.id = o.addon_id
       WHERE o.student_id = $1
       ORDER BY o.created_at DESC
       LIMIT 200`,
      [id]
    ),
  ]);
  return { requests: requests.rows, shopier: shopier.rows };
}

// ---------------------------------------------------------------------------
// Timeline

export interface TimelineEntry {
  at: string;
  category: ActivityCategory;
  title: string;
  detail: string | null;
}

/**
 * One SELECT per source, each yielding (at, category, title, detail). $1 is
 * always the student id. Only the categories the admin asked for are put
 * into the UNION, so unselected sources are never scanned.
 */
function timelineSources(categories: ActivityCategory[], hasActivityEvents: boolean): string[] {
  const sources: Record<ActivityCategory, string[]> = {
    account: [
      `SELECT u.created_at AT TIME ZONE 'UTC' AS at, 'account' AS category, 'Signed up' AS title,
              NULLIF(concat_ws(' · ', u.school_name), '') AS detail
       FROM users u WHERE u.id = $1`,
      `SELECT e.created_at, 'account', CASE e.event_type WHEN 'login' THEN 'Logged in' ELSE 'Logged out' END, NULL
       FROM analytics_events e WHERE e.user_id = $1 AND e.event_type IN ('login', 'logout')`,
      `SELECT e.created_at, 'account',
              CASE e.event_type WHEN 'admin_sessions_revoke' THEN 'Signed out of all devices by an admin'
                                ELSE 'Account changed by an admin' END,
              concat_ws(' · ',
                CASE WHEN e.metadata ? 'role' THEN 'role → ' || (e.metadata->>'role') END,
                CASE WHEN e.metadata ? 'status' THEN 'status → ' || (e.metadata->>'status') END,
                CASE WHEN e.metadata ? 'revoked' THEN (e.metadata->>'revoked') || ' device(s)' END,
                NULLIF('by ' || concat_ws(' ', a.first_name, a.last_name), 'by '))
       FROM analytics_events e LEFT JOIN users a ON a.id = e.user_id
       WHERE e.entity_type = 'student' AND e.entity_id = $1
         AND e.event_type IN ('admin_account_update', 'admin_sessions_revoke')`,
    ],
    subscription: [
      `SELECT g.created_at, 'subscription',
              'Granted ' || COALESCE(p.name, 'a plan') || ' for ' || g.months || CASE WHEN g.months = 1 THEN ' month' ELSE ' months' END,
              concat_ws(' · ',
                CASE WHEN g.granted_by IS NULL THEN 'automatic (receipt matched a plan price)'
                     ELSE 'by ' || concat_ws(' ', a.first_name, a.last_name) END,
                NULLIF(g.reference, ''))
       FROM access_grants g
       LEFT JOIN subscription_plans p ON p.id = g.plan_id
       LEFT JOIN users a ON a.id = g.granted_by
       WHERE g.student_id = $1`,
      `SELECT e.created_at, 'subscription', 'Access revoked (set to Free)',
              concat_ws(' · ',
                CASE WHEN e.metadata->>'previous_plan' IS NOT NULL THEN 'was ' || (e.metadata->>'previous_plan') END,
                NULLIF('by ' || concat_ws(' ', a.first_name, a.last_name), 'by '))
       FROM analytics_events e LEFT JOIN users a ON a.id = e.user_id
       WHERE e.entity_type = 'student' AND e.entity_id = $1 AND e.event_type = 'admin_subscription_revoke'`,
      `SELECT s.end_date AT TIME ZONE 'UTC', 'subscription', 'Paid access ran out', p.name
       FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
       WHERE s.student_id = $1 AND p.tier_level > 0 AND s.end_date IS NOT NULL AND s.end_date < now()`,
    ],
    payment: [
      `SELECT pr.created_at, 'payment', 'Uploaded a payment receipt',
              concat_ws(' · ',
                COALESCE(p.name, c.title),
                CASE WHEN pr.amount_claimed IS NOT NULL THEN 'claimed ' || pr.amount_claimed END,
                CASE WHEN pr.detected_amount IS NOT NULL
                     THEN 'read as ' || pr.detected_amount || ' ' || COALESCE(pr.detected_currency, '') END)
       FROM payment_requests pr
       LEFT JOIN subscription_plans p ON p.id = pr.plan_id
       LEFT JOIN courses c ON c.id = pr.course_id
       WHERE pr.student_id = $1`,
      `SELECT pr.reviewed_at, 'payment',
              CASE WHEN pr.auto_approved THEN 'Receipt auto-approved'
                   WHEN pr.status = 'approved' THEN 'Receipt approved'
                   WHEN pr.status = 'rejected' THEN 'Receipt rejected'
                   ELSE 'Receipt reviewed' END,
              concat_ws(' · ', COALESCE(p.name, c.title),
                CASE WHEN pr.months IS NOT NULL AND pr.course_id IS NULL THEN pr.months || ' mo' END,
                NULLIF(pr.admin_note, ''))
       FROM payment_requests pr
       LEFT JOIN subscription_plans p ON p.id = pr.plan_id
       LEFT JOIN courses c ON c.id = pr.course_id
       WHERE pr.student_id = $1 AND pr.reviewed_at IS NOT NULL`,
      `SELECT o.created_at, 'payment',
              'Started Shopier checkout' || CASE WHEN o.is_test THEN ' (test)' ELSE '' END,
              concat_ws(' · ', COALESCE(p.name, a.name), o.billing_cycle,
                CASE WHEN o.amount IS NOT NULL THEN o.amount || ' ' || COALESCE(o.currency, '') END)
       FROM shopier_orders o
       LEFT JOIN subscription_plans p ON p.id = o.plan_id
       LEFT JOIN addon_services a ON a.id = o.addon_id
       WHERE o.student_id = $1`,
      `SELECT COALESCE(o.updated_at, o.created_at), 'payment',
              'Shopier payment completed' || CASE WHEN o.is_test THEN ' (test)' ELSE '' END,
              concat_ws(' · ', COALESCE(p.name, a.name),
                CASE WHEN o.amount IS NOT NULL THEN o.amount || ' ' || COALESCE(o.currency, '') END)
       FROM shopier_orders o
       LEFT JOIN subscription_plans p ON p.id = o.plan_id
       LEFT JOIN addon_services a ON a.id = o.addon_id
       WHERE o.student_id = $1 AND o.status = 'success'`,
      `SELECT ap.created_at, 'payment', 'Bought ' || COALESCE(s.name, 'an add-on'),
              concat_ws(' · ', ap.status, CASE WHEN ap.price_paid_try IS NOT NULL THEN ap.price_paid_try || ' TRY' END)
       FROM addon_purchases ap LEFT JOIN addon_services s ON s.id = ap.addon_id
       WHERE ap.student_id = $1`,
      `SELECT e.created_at, 'payment',
              CASE e.event_type WHEN 'subscribe_click' THEN 'Clicked subscribe' ELSE 'Saw the paywall' END,
              COALESCE(e.path, t.topic_name)
       FROM analytics_events e LEFT JOIN topics t ON e.entity_type = 'topic' AND t.id = e.entity_id
       WHERE e.user_id = $1 AND e.event_type IN ('subscribe_click', 'paywall_shown')`,
    ],
    learning: [
      `SELECT e.created_at, 'learning',
              CASE e.event_type
                WHEN 'lesson_view' THEN 'Opened lesson'
                WHEN 'simulation_start' THEN 'Started simulation'
                WHEN 'simulation_complete' THEN 'Finished simulation'
                WHEN 'download' THEN 'Downloaded'
                ELSE 'Switched curriculum' END,
              CASE WHEN e.event_type = 'curriculum_select'
                   THEN concat_ws(' → ', e.metadata->>'from', e.metadata->>'to')
                   ELSE COALESCE(t.topic_name, sim.title, b.title,
                          CASE WHEN pp.id IS NOT NULL THEN concat_ws(' ', pp.syllabus_code, pp.year, pp.session, 'P' || pp.paper_number) END,
                          e.path) END
       FROM analytics_events e
       LEFT JOIN topics t ON e.entity_type = 'topic' AND t.id = e.entity_id
       LEFT JOIN simulations sim ON e.entity_type = 'simulation' AND sim.id = e.entity_id
       LEFT JOIN booklets b ON e.entity_type = 'booklet' AND b.id = e.entity_id
       LEFT JOIN past_papers pp ON e.entity_type = 'past_paper' AND pp.id = e.entity_id
       WHERE e.user_id = $1
         AND e.event_type IN ('lesson_view', 'simulation_start', 'simulation_complete', 'download', 'curriculum_select')`,
      `SELECT ce.created_at, 'learning', 'Enrolled in a course', c.title
       FROM course_enrollments ce LEFT JOIN courses c ON c.id = ce.course_id
       WHERE ce.student_id = $1`,
      ...(hasActivityEvents
        ? [
            `SELECT ev.created_at, 'learning', 'Watched a lesson video', t.topic_name
             FROM activity_events ev LEFT JOIN topics t ON t.id = ev.lesson_id
             WHERE ev.student_id = $1 AND ev.type = 'video_view'`,
          ]
        : []),
    ],
    practice: [
      `SELECT e.created_at, 'practice', 'Started practice', t.topic_name
       FROM analytics_events e LEFT JOIN topics t ON t.id = e.entity_id
       WHERE e.user_id = $1 AND e.event_type = 'practice_start'`,
      `SELECT e.created_at, 'practice', 'Skipped a question' || COALESCE(' · Q' || pr.problem_number, ''), t.topic_name
       FROM analytics_events e
       LEFT JOIN topics t ON t.id = e.entity_id
       LEFT JOIN problems pr ON pr.id::text = e.metadata->>'problemId'
       WHERE e.user_id = $1 AND e.event_type = 'practice_skip'`,
      `SELECT a.created_at, 'practice',
              CASE WHEN a.is_correct THEN 'Answered correctly' ELSE 'Answered incorrectly' END
                || COALESCE(' · Q' || pr.problem_number, ''),
              concat_ws(' · ', t.topic_name,
                -- Multiple-choice answers are stored as the chosen option's id.
                CASE WHEN po.id IS NOT NULL
                     THEN 'chose ' || COALESCE(po.option_letter || ': ', '') || left(po.option_text, 60)
                     WHEN a.raw_answer IS NOT NULL AND a.raw_answer <> ''
                     THEN '“' || left(a.raw_answer, 60) || '”' END,
                CASE WHEN a.hint_used THEN 'hint used' END,
                CASE WHEN a.attempt_number > 1 THEN 'try ' || a.attempt_number END)
       FROM practice_attempts a
       LEFT JOIN problems pr ON pr.id = a.problem_id
       LEFT JOIN problem_options po ON po.problem_id = a.problem_id AND po.id::text = a.raw_answer
       LEFT JOIN topics t ON t.id = a.topic_id
       WHERE a.student_id = $1`,
      `SELECT ps.updated_at, 'practice', 'Recorded a past-paper score',
              concat_ws(' · ', concat_ws(' ', pp.syllabus_code, pp.year, pp.session, 'P' || pp.paper_number),
                ps.score || COALESCE(' / ' || pp.max_marks, ''))
       FROM paper_scores ps LEFT JOIN past_papers pp ON pp.id = ps.paper_id
       WHERE ps.student_id = $1`,
    ],
    solution: [
      `SELECT l.accessed_at, 'solution',
              CASE l.action WHEN 'view_full' THEN 'Opened a solution'
                            WHEN 'view_preview' THEN 'Previewed a solution'
                            WHEN 'blocked' THEN 'Blocked from a solution'
                            WHEN 'attempted_upgrade' THEN 'Tried to unlock a solution'
                            ELSE 'Solution: ' || l.action END,
              s.problem_title
       FROM solution_access_log l LEFT JOIN solutions s ON s.id = l.solution_id
       WHERE l.user_id = $1`,
    ],
    request: [
      `SELECT vr.created_at, 'request', 'Asked for a video explanation',
              concat_ws(' · ', t.topic_name, vr.status)
       FROM video_requests vr LEFT JOIN topics t ON t.id = vr.topic_id
       WHERE vr.student_id = $1`,
      `SELECT m.created_at, 'request',
              CASE WHEN m.sender_id = $1 THEN 'Sent a message' ELSE 'Received a message' END,
              NULLIF(m.subject, '')
       FROM messages m
       WHERE m.sender_id = $1 OR m.recipient_id = $1`,
    ],
    page: [
      `SELECT e.created_at, 'page', 'Viewed a page', e.path
       FROM analytics_events e WHERE e.user_id = $1 AND e.event_type = 'page_view'`,
    ],
  };
  return categories.flatMap((c) => sources[c]);
}

let activityEventsChecked: { at: number; exists: boolean } | null = null;

/** activity_events comes from migration 02, which may not be applied yet. */
async function hasActivityEventsTable(): Promise<boolean> {
  if (activityEventsChecked && Date.now() - activityEventsChecked.at < 60_000) return activityEventsChecked.exists;
  const r = await query(`SELECT to_regclass('public.activity_events') IS NOT NULL AS ok`);
  activityEventsChecked = { at: Date.now(), exists: Boolean(r.rows[0]?.ok) };
  return activityEventsChecked.exists;
}

export async function getTimeline(
  studentId: string,
  filters: TimelineFilters
): Promise<{ entries: TimelineEntry[]; hasMore: boolean; counts: Partial<Record<ActivityCategory, number>> }> {
  const sources = timelineSources(filters.categories, await hasActivityEventsTable());
  if (sources.length === 0) return { entries: [], hasMore: false, counts: {} };

  const values: unknown[] = [studentId];
  const conds = ['ev.at IS NOT NULL'];
  if (filters.from) {
    values.push(filters.from);
    conds.push(`ev.at >= $${values.length}::date`);
  }
  if (filters.to) {
    values.push(filters.to);
    conds.push(`ev.at < $${values.length}::date + 1`);
  }
  const union = `(${sources.join('\nUNION ALL\n')}) AS ev(at, category, title, detail)`;
  const where = conds.join(' AND ');

  const pageValues = [...values, TIMELINE_PAGE_SIZE + 1, (filters.page - 1) * TIMELINE_PAGE_SIZE];
  const [page, counts] = await Promise.all([
    query(
      `SELECT ev.at, ev.category, ev.title, NULLIF(ev.detail, '') AS detail
       FROM ${union}
       WHERE ${where}
       ORDER BY ev.at DESC
       LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    ),
    query(`SELECT ev.category, COUNT(*)::int AS n FROM ${union} WHERE ${where} GROUP BY ev.category`, values),
  ]);

  const rows = page.rows as TimelineEntry[];
  return {
    entries: rows.slice(0, TIMELINE_PAGE_SIZE),
    hasMore: rows.length > TIMELINE_PAGE_SIZE,
    counts: Object.fromEntries(counts.rows.map((r) => [r.category, Number(r.n)])),
  };
}

// ---------------------------------------------------------------------------
// Summary stats

export interface WeeklyActivity {
  week: string; // Monday, YYYY-MM-DD
  activeMinutes: number;
  practiceMinutes: number;
  attempts: number;
}

export interface StudentStats {
  weekly: WeeklyActivity[];
  chapters: (ChapterAccuracy & { last_at: string })[];
}

export const STATS_WEEKS = 12;

export async function getStudentStats(studentId: string): Promise<StudentStats> {
  const [weekly, chapters] = await Promise.all([
    // Active time is estimated from the gaps between consecutive recorded
    // actions (events, answers, solution opens): a gap of up to
    // ACTIVE_GAP_MINUTES counts in full, a longer one is a break.
    query(
      `WITH acts AS (
         SELECT created_at AS at FROM analytics_events
           WHERE user_id = $1 AND created_at >= date_trunc('week', now()) - make_interval(weeks => $2 - 1)
         UNION ALL
         SELECT created_at FROM practice_attempts
           WHERE student_id = $1 AND created_at >= date_trunc('week', now()) - make_interval(weeks => $2 - 1)
         UNION ALL
         SELECT accessed_at FROM solution_access_log
           WHERE user_id = $1 AND accessed_at >= date_trunc('week', now()) - make_interval(weeks => $2 - 1)
       ),
       gaps AS (
         SELECT date_trunc('week', at) AS w, LEAD(at) OVER (ORDER BY at) - at AS gap FROM acts
       ),
       active AS (
         SELECT w, SUM(EXTRACT(epoch FROM gap)) / 60 AS minutes
         FROM gaps WHERE gap <= make_interval(mins => $3)
         GROUP BY w
       ),
       practice AS (
         SELECT date_trunc('week', created_at) AS w, COUNT(*)::int AS attempts,
                COALESCE(SUM(LEAST(time_spent_ms, 30 * 60 * 1000)), 0)::bigint AS ms
         FROM practice_attempts
         WHERE student_id = $1 AND created_at >= date_trunc('week', now()) - make_interval(weeks => $2 - 1)
         GROUP BY 1
       ),
       weeks AS (
         SELECT generate_series(date_trunc('week', now()) - make_interval(weeks => $2 - 1), date_trunc('week', now()), interval '1 week') AS w
       )
       SELECT to_char(weeks.w, 'YYYY-MM-DD') AS week,
              ROUND(COALESCE(active.minutes, 0))::int AS active_minutes,
              COALESCE(practice.ms, 0) AS practice_ms,
              COALESCE(practice.attempts, 0) AS attempts
       FROM weeks
       LEFT JOIN practice ON practice.w = weeks.w
       LEFT JOIN active ON active.w = weeks.w
       ORDER BY weeks.w`,
      [studentId, STATS_WEEKS, ACTIVE_GAP_MINUTES]
    ),
    query(
      `SELECT a.chapter_id,
              concat_ws(' ', 'Ch ' || ch.chapter_number, ch.title) || COALESCE(' (' || c.code || ')', '') AS label,
              COUNT(*)::int AS attempted,
              COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
              MAX(a.created_at) AS last_at
       FROM practice_attempts a
       JOIN chapters ch ON ch.id = a.chapter_id
       LEFT JOIN courses c ON c.id = ch.course_id
       WHERE a.student_id = $1
       GROUP BY a.chapter_id, ch.chapter_number, ch.title, c.code
       ORDER BY attempted DESC`,
      [studentId]
    ),
  ]);

  return {
    weekly: weekly.rows.map((r) => ({
      week: r.week,
      activeMinutes: Number(r.active_minutes),
      practiceMinutes: Math.round(Number(r.practice_ms) / 60000),
      attempts: Number(r.attempts),
    })),
    chapters: chapters.rows.map((r) => ({
      chapter_id: r.chapter_id,
      label: r.label,
      attempted: Number(r.attempted),
      correct: Number(r.correct),
      last_at: r.last_at,
    })),
  };
}
