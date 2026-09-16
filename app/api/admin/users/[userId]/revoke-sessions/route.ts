/**
 * POST /api/admin/users/[userId]/revoke-sessions
 * Signs a user out of every active device — useful when a join code or
 * account has clearly been passed around a whole class (many distinct
 * device labels/IPs rotating through a 2-device cap over a week is the
 * tell an admin would be reacting to here).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { revokeAllSessions } from '@/lib/auth/sessions';

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const revoked = await revokeAllSessions(params.userId);
  return NextResponse.json({ success: true, revoked });
}
