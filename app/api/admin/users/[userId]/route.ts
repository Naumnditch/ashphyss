/**
 * PATCH /api/admin/users/[userId]
 * Body: { role?: 'student'|'teacher'|'admin', status?: 'active'|'inactive'|'suspended' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { logAdminStudentEvent } from '@/lib/admin/studentEvents';

const VALID_ROLES = ['student', 'teacher', 'admin'];
const VALID_STATUSES = ['active', 'inactive', 'suspended'];

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  if (params.userId === admin.id) {
    return NextResponse.json(
      { success: false, error: "You can't change your own role or status here." },
      { status: 400 }
    );
  }

  const { role, status } = await req.json();

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }
  if (role === undefined && status === undefined) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  const target = await query('SELECT id, role FROM users WHERE id = $1', [params.userId]);
  if (target.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const sets: string[] = [];
  const values: any[] = [];
  if (role !== undefined) {
    values.push(role);
    sets.push(`role = $${values.length}`);
  }
  if (status !== undefined) {
    values.push(status);
    sets.push(`status = $${values.length}`);
  }
  values.push(params.userId);

  await query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);

  // Shows on the student's timeline at /admin/students/[id].
  if (target.rows[0].role === 'student' || role === 'student') {
    await logAdminStudentEvent(admin.id, params.userId, 'admin_account_update', {
      ...(role !== undefined ? { role } : {}),
      ...(status !== undefined ? { status } : {}),
    });
  }

  return NextResponse.json({ success: true });
}
