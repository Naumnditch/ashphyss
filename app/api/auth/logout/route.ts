import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { revokeSession } from '@/lib/auth/sessions';
import { logEvent } from '@/lib/analytics/track';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (token) {
    const payload = verifyToken(token);
    if (payload?.sessionId) {
      await revokeSession(payload.sessionId);
    }
    if (payload?.id) {
      await logEvent({ userId: payload.id, eventType: 'logout' });
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { path: '/', maxAge: 0 });
  return response;
}
