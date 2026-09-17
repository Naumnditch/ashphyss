/**
 * Single source of truth for "this user's active tier".
 *
 * There was no prior consolidated version of this lookup — every existing
 * tier_level reference in the codebase is either subscription_plans catalog
 * display (pricing page) or an admin granting access to SOME OTHER user
 * (app/api/admin/access). This is the first self-lookup gate, and every
 * new tier check added after it must call this function rather than
 * re-querying subscriptions/subscription_plans directly, so the "active"
 * definition can't drift between call sites.
 */

import { query } from '@/lib/db/client';

export const TIER_FREE = 0;
export const TIER_PLUS = 1;
export const TIER_PRO = 2;

/**
 * Returns the tier_level of the user's currently active subscription,
 * or TIER_FREE (0) if they have none, it's expired, or userId is falsy.
 * "Active" mirrors app/api/admin/access: status = 'active' and
 * (end_date IS NULL OR end_date > now()).
 */
export async function getUserTier(userId: string | null | undefined): Promise<number> {
  if (!userId) return TIER_FREE;

  const result = await query(
    `SELECT p.tier_level
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.student_id = $1
       AND s.status = 'active'::subscription_status
       AND (s.end_date IS NULL OR s.end_date > now())`,
    [userId]
  );

  return result.rows[0]?.tier_level ?? TIER_FREE;
}

export function tierName(tier: number): string {
  if (tier >= TIER_PRO) return 'Pro';
  if (tier >= TIER_PLUS) return 'Plus';
  return 'Free';
}
