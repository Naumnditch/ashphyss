/**
 * POST /api/auth/sessions/revoke
 * Body: { sessionId: string, preAuthToken?: string }
 *
 * Two ways to be allowed to revoke a session, both proving you actually
 * control the account it belongs to:
 *   1. Fully authenticated (the httpOnly `token` cookie) and the session
 *      you're revoking is your own — the normal case from /account/devices.
 *   2. Mid-login: you just supplied the correct password for this account
 *      (the login route's 409 device_limit response hands back a 10-minute
 *      preAuthToken for exactly this), but weren't issued a real session
 *      because you were already at the device limit. Without this, a
 *      device_limit response would let a stranger who only knows someone's
 *      email revoke their sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyPreAuthToken } from '@/lib/auth/jwt';
import { getSessionOwner, revokeSession } from '@/lib/auth/sessions';

export async function POST(req: NextRequest) {
  const { sessionId, preAuthToken } = (await req.json()) as { sessionId?: string; preAuthToken?: string };
  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
  }

  const ownerId = await getSessionOwner(sessionId);
  if (!ownerId) {
    // Already gone (or never existed) — treat as success, nothing left to revoke.
    return NextResponse.json({ success: true });
  }

  const currentUser = await getCurrentUser();
  const authorized =
    currentUser?.id === ownerId ||
    (preAuthToken ? verifyPreAuthToken(preAuthToken)?.userId === ownerId : false);

  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  await revokeSession(sessionId);
  return NextResponse.json({ success: true });
}
