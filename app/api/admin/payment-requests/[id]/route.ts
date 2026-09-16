/**
 * POST /api/admin/payment-requests/[id] — approve or reject a receipt.
 * Approving grants access in the same step, so the two can never drift apart.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { billingCycleForMonths } from '@/lib/billing';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { action, adminNote, planId, months } = await req.json();
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ success: false, error: 'action must be approve or reject' }, { status: 400 });
  }

  const reqRes = await query(`SELECT * FROM payment_requests WHERE id = $1`, [params.id]);
  if (reqRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }
  const pr = reqRes.rows[0];
  if (pr.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'This request has already been reviewed' }, { status: 409 });
  }

  if (action === 'reject') {
    await query(
      `UPDATE payment_requests SET status = 'rejected', admin_note = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1`,
      [params.id, adminNote || null, admin.id]
    );
    return NextResponse.json({ success: true });
  }

  // A course purchase enrols the student in that one course (lifetime access)
  // rather than touching their subscription — the two are separate products.
  if (pr.course_id) {
    await query(
      `INSERT INTO course_enrollments (student_id, course_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, course_id) DO UPDATE SET granted_by = EXCLUDED.granted_by, expires_at = NULL`,
      [pr.student_id, pr.course_id, admin.id]
    );
    await query(
      `UPDATE payment_requests SET status = 'approved', admin_note = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1`,
      [params.id, adminNote || null, admin.id]
    );
    return NextResponse.json({ success: true, enrolledCourse: true });
  }

  // otherwise it's a subscription: the admin may correct the plan/duration chosen
  const finalPlanId = planId || pr.plan_id;
  const finalMonths = parseInt(String(months ?? pr.months), 10) || 1;
  if (!finalPlanId) {
    return NextResponse.json({ success: false, error: 'Choose a plan before approving' }, { status: 400 });
  }

  const planRes = await query(`SELECT id, tier_level FROM subscription_plans WHERE id = $1`, [finalPlanId]);
  if (planRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Unknown plan' }, { status: 400 });
  }
  const tier = planRes.rows[0].tier_level > 0 ? 'premium' : 'free';

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
    [pr.student_id, finalPlanId, tier, billingCycleForMonths(finalMonths), finalMonths]
  );

  await query(
    `INSERT INTO access_grants (student_id, plan_id, months, reference, granted_by) VALUES ($1, $2, $3, $4, $5)`,
    [pr.student_id, finalPlanId, finalMonths, pr.reference || `receipt:${params.id}`, admin.id]
  );

  await query(
    `UPDATE payment_requests SET status = 'approved', admin_note = $2, reviewed_by = $3, reviewed_at = now(),
       plan_id = $4, months = $5 WHERE id = $1`,
    [params.id, adminNote || null, admin.id, finalPlanId, finalMonths]
  );

  return NextResponse.json({ success: true });
}
