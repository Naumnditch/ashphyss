/**
 * Who a bulk message goes to. Filters combine with AND; within a filter the
 * listed values combine with OR. Admins are never recipients.
 */

import { z } from 'zod';

export const recipientFiltersSchema = z.object({
  roles: z.array(z.enum(['student', 'teacher'])).default(['student']),
  tiers: z.array(z.number().int().min(0).max(2)).default([]),
  /** Section ids; 'none' means students not in any class. */
  sectionIds: z.array(z.string()).default([]),
  statuses: z.array(z.enum(['active', 'inactive', 'suspended'])).default(['active']),
  /** Engineering-course enrollment. */
  enrollment: z.enum(['any', 'enrolled', 'not_enrolled']).default('any'),
  courseId: z.string().uuid().nullable().optional(),
  joinedWithinDays: z.number().int().positive().max(3650).nullable().optional(),
  /** Paid subscription ends within N days (renewal reminders). */
  subscriptionEndsWithinDays: z.number().int().positive().max(365).nullable().optional(),
  /** Only people who still accept emails. */
  emailOptedInOnly: z.boolean().default(false),
});

export type RecipientFilters = z.infer<typeof recipientFiltersSchema>;

/** The subscriber's current tier, matching lib/subscriptions/getUserTier.ts. */
export const TIER_SQL = `COALESCE((
  SELECT MAX(p.tier_level) FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
  WHERE s.student_id = u.id AND s.status = 'active'::subscription_status
    AND (s.end_date IS NULL OR s.end_date > now())), 0)`;

/** WHERE clause (on users u) and its parameters, numbered from `start`. */
export function buildRecipientWhere(filters: RecipientFilters, start = 1): { where: string; params: unknown[] } {
  const clauses: string[] = [`u.role <> 'admin'`];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${start + params.length - 1}`;
  };

  if (filters.roles.length) clauses.push(`u.role::text = ANY(${p(filters.roles)}::text[])`);
  if (filters.statuses.length) clauses.push(`u.status::text = ANY(${p(filters.statuses)}::text[])`);
  if (filters.tiers.length) clauses.push(`${TIER_SQL} = ANY(${p(filters.tiers)}::int[])`);

  if (filters.sectionIds.length) {
    const ids = filters.sectionIds.filter((s) => s !== 'none');
    const parts: string[] = [];
    if (ids.length) parts.push(`u.section_id::text = ANY(${p(ids)}::text[])`);
    if (filters.sectionIds.includes('none')) parts.push('u.section_id IS NULL');
    clauses.push(`(${parts.join(' OR ')})`);
  }

  const activeEnrollment = (extra = '') =>
    `EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.student_id = u.id AND (ce.expires_at IS NULL OR ce.expires_at > now())${extra})`;
  if (filters.courseId) clauses.push(activeEnrollment(` AND ce.course_id = ${p(filters.courseId)}::uuid`));
  else if (filters.enrollment === 'enrolled') clauses.push(activeEnrollment());
  if (filters.enrollment === 'not_enrolled') clauses.push(`NOT ${activeEnrollment()}`);

  if (filters.joinedWithinDays) clauses.push(`u.created_at > now() - make_interval(days => ${p(filters.joinedWithinDays)}::int)`);
  if (filters.subscriptionEndsWithinDays) {
    clauses.push(`EXISTS (SELECT 1 FROM subscriptions s WHERE s.student_id = u.id AND s.status = 'active'::subscription_status
      AND s.end_date > now() AND s.end_date <= now() + make_interval(days => ${p(filters.subscriptionEndsWithinDays)}::int))`);
  }
  if (filters.emailOptedInOnly) clauses.push('u.email_notifications');

  return { where: clauses.join(' AND '), params };
}

/** A one-line description of a filter, for the confirm step and the bulk-send log. */
export function describeFilters(f: RecipientFilters, sectionNames: Record<string, string> = {}, courseNames: Record<string, string> = {}): string {
  const tierNames = ['Free', 'Plus', 'Pro'];
  const parts: string[] = [];
  parts.push(f.roles.length === 2 || !f.roles.length ? 'Students and teachers' : f.roles[0] === 'teacher' ? 'Teachers' : 'Students');
  if (f.tiers.length) parts.push(`on ${f.tiers.map((t) => tierNames[t]).join(' / ')}`);
  if (f.sectionIds.length) parts.push(`in ${f.sectionIds.map((s) => (s === 'none' ? 'no class' : sectionNames[s] ?? 'a class')).join(' / ')}`);
  if (f.courseId) parts.push(`enrolled in ${courseNames[f.courseId] ?? 'a course'}`);
  else if (f.enrollment === 'enrolled') parts.push('enrolled in a course');
  if (f.enrollment === 'not_enrolled') parts.push('not enrolled in any course');
  if (f.statuses.length && !(f.statuses.length === 1 && f.statuses[0] === 'active')) parts.push(`status ${f.statuses.join(' / ')}`);
  if (f.joinedWithinDays) parts.push(`joined in the last ${f.joinedWithinDays} days`);
  if (f.subscriptionEndsWithinDays) parts.push(`subscription ending within ${f.subscriptionEndsWithinDays} days`);
  if (f.emailOptedInOnly) parts.push('accepting emails');
  return parts.join(', ');
}
