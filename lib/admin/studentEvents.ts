/**
 * Logs admin actions taken on a student so they show up on the student's
 * timeline (/admin/students/[id]). Before 2026-10-16 revocations, role/status
 * changes and "sign out everywhere" left no trace.
 *
 * Rows go into analytics_events with the admin as user_id (they are the one
 * acting, so the daily-active counts stay honest) and the student as the
 * entity (entity_type = 'student'). Uses logEvent, which swallows its own
 * errors: a logging failure never fails the admin's request.
 */

import { logEvent } from '@/lib/analytics/track';
import { query } from '@/lib/db/client';
import type { AdminStudentEvent } from '@/lib/admin/studentHistory';

export async function logAdminStudentEvent(
  adminId: string,
  studentId: string,
  eventType: AdminStudentEvent,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await logEvent({ userId: adminId, eventType, entityType: 'student', entityId: studentId, metadata });
}

/** The plan a student is on right now, for the revoke log. Never throws. */
export async function currentPlanName(studentId: string): Promise<string | null> {
  try {
    const r = await query(
      `SELECT p.name FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
       WHERE s.student_id = $1 AND s.status = 'active'::subscription_status
         AND (s.end_date IS NULL OR s.end_date > now())`,
      [studentId]
    );
    return r.rows[0]?.name ?? null;
  } catch {
    return null;
  }
}
