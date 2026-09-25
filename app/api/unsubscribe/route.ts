/**
 * POST /api/unsubscribe — { token, action: 'unsubscribe' | 'resubscribe' } from
 * the /unsubscribe page, or a one-click unsubscribe from a mail app
 * (RFC 8058: POST ?token=… with body "List-Unsubscribe=One-Click").
 * GET  /api/unsubscribe?token=… — forwards to the /unsubscribe page.
 *
 * Unsubscribing only stops emails; messages still arrive in the on-site inbox.
 */

import { NextRequest, NextResponse } from 'next/server';
import { siteUrl } from '@/lib/messaging/config';
import { setEmailNotifications, userByUnsubscribeToken } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let token = req.nextUrl.searchParams.get('token') ?? '';
  let action = 'unsubscribe';
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const body = await req.json();
      token = String(body.token ?? token);
      if (body.action === 'resubscribe') action = 'resubscribe';
    } else if (type.includes('form')) {
      const form = await req.formData();
      token = String(form.get('token') ?? token);
      if (form.get('action') === 'resubscribe') action = 'resubscribe';
    }
  } catch {
    /* one-click posts may have an empty body */
  }

  if (!/^[a-f0-9]{32}$/i.test(token)) return NextResponse.json({ success: false, error: 'Invalid link' }, { status: 400 });
  const user = await userByUnsubscribeToken(token);
  if (!user) return NextResponse.json({ success: false, error: 'This link is no longer valid' }, { status: 404 });

  const subscribed = action === 'resubscribe';
  await setEmailNotifications(user.id, subscribed);
  return NextResponse.json({ success: true, subscribed });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  return NextResponse.redirect(`${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`);
}
