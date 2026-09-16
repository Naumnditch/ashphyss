/**
 * POST /api/admin/access — grant or extend a student's access
 * PATCH /api/admin/access — revoke (set expired)
 *
 * This is the manual half of the payment gate: Shopier's own storefront
 * checkout works today (a real purchase completed through it), while the
 * own-website API is still blocked at their end. So the student pays via
 * a Shopier product link and the teacher grants access here.
 *
 * Extension is deliberately GREATEST(end_date, now()) + months, so
 * renewing early adds to remaining time rather than throwing it away.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { billingCycleForMonths } from '@/lib/billing';

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { email, planId, months, reference } = await req.json();
  if (!email || !planId || !months) {
    return NextResponse.json({ success: false, error: 'email, planId and months are required' }, { status: 400 });
  }
  const m = parseInt(String(months), 10);
  if (!Number.isFinite(m) || m < 1 || m > 36) {
    return NextResponse.json({ success: false, error: 'months must be between 1 and 36' }, { status: 400 });
  }

  const userRes = await query(`SELECT id, email, first_name, last_name FROM users WHERE lower(email) = lower($1)`, [email]);
  if (userRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: `No account found for ${email}. The student must sign up first.` }, { status: 404 });
  }
  const student = userRes.rows[0];

  const planRes = await query(`SELECT id, name, tier_level FROM subscription_plans WHERE id = $1`, [planId]);
  if (planRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Unknown plan' }, { status: 400 });
  }
  const plan = planRes.rows[0];
  const tier = plan.tier_level > 0 ? 'premium' : 'free';

  await query(
    `INSERT INTO subscriptions (student_id, plan_id, tier, status, billing_cycle, start_date, end_date)
     VALUES ($1, $2, $3::subscription_tier, 'active'::subscription_status, $4, now(), now() + ($5 || ' months')::interval)
     ON CONFLICT (student_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       tier = EXCLUDED.tier,
       status = 'active'::subscription_status,
       billing_cycle = EXCLUDED.billing_cycle,
       end_date = GREATEST(COALESCE(subscriptions.end_date, now()), now()) + ($5 || ' months')::interval,
       updated_at = now()`,
    [student.id, plan.id, tier, billingCycleForMonths(m), m]
  );

  await query(
    `INSERT INTO access_grants (student_id, plan_id, months, reference, granted_by) VALUES ($1, $2, $3, $4, $5)`,
    [student.id, plan.id, m, reference || null, admin.id]
  );

  const after = await query(
    `SELECT s.end_date, s.status, p.name AS plan_name
     FROM subscriptions s LEFT JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.student_id = $1`,
    [student.id]
  );

  return NextResponse.json({
    success: true,
    student: { email: student.email, name: [student.first_name, student.last_name].filter(Boolean).join(' ') },
    subscription: after.rows[0],
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }
  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ success: false, error: 'studentId required' }, { status: 400 });
  await query(
    `UPDATE subscriptions SET status = 'expired'::subscription_status, tier = 'free'::subscription_tier, updated_at = now()
     WHERE student_id = $1`,
    [studentId]
  );
  return NextResponse.json({ success: true });
}
