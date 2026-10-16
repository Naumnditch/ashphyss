/**
 * POST /api/admin/access — grant or extend a student's access
 * PATCH /api/admin/access — revoke (set expired)
 *
 * This is the manual half of the payment gate: Shopier's own storefront
 * checkout works today (a real purchase completed through it), while the
 * own-website API is still blocked at their end. So the student pays via
 * a Shopier product link or bank transfer and the teacher grants access
 * here — or, since the receipt-scanning feature, most bank transfers grant
 * themselves automatically and this becomes the override/correction tool.
 *
 * Extension is deliberately GREATEST(end_date, now()) + months, so
 * renewing early adds to remaining time rather than throwing it away.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { grantSubscription, revokeSubscription } from '@/lib/access/grant';
import { currentPlanName, logAdminStudentEvent } from '@/lib/admin/studentEvents';

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { email, studentId, planId, months, reference } = await req.json();
  if ((!email && !studentId) || !planId || !months) {
    return NextResponse.json({ success: false, error: 'email (or studentId), planId and months are required' }, { status: 400 });
  }
  const m = parseInt(String(months), 10);
  if (!Number.isFinite(m) || m < 1 || m > 36) {
    return NextResponse.json({ success: false, error: 'months must be between 1 and 36' }, { status: 400 });
  }

  const userRes = studentId
    ? await query(`SELECT id, email, first_name, last_name FROM users WHERE id = $1`, [studentId])
    : await query(`SELECT id, email, first_name, last_name FROM users WHERE lower(email) = lower($1)`, [email]);
  if (userRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: email ? `No account found for ${email}. The student must sign up first.` : 'Student not found' }, { status: 404 });
  }
  const student = userRes.rows[0];

  let result;
  try {
    result = await grantSubscription({ studentId: student.id, planId, months: m, reference: reference || null, grantedBy: admin.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown plan' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    student: { email: student.email, name: [student.first_name, student.last_name].filter(Boolean).join(' ') },
    subscription: { end_date: result.endDate, plan_name: result.planName },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }
  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ success: false, error: 'studentId required' }, { status: 400 });
  const previousPlan = await currentPlanName(studentId);
  await revokeSubscription(studentId);
  // Grants are already in access_grants; this gives revocations a history too.
  await logAdminStudentEvent(admin.id, studentId, 'admin_subscription_revoke', { previous_plan: previousPlan });
  return NextResponse.json({ success: true });
}
