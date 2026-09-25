/** GET / PUT /api/messages/preferences — the signed-in user's email notification setting. */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { fail, readJson, zodMessage } from '@/lib/messaging/http';
import { setEmailNotifications } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in', 401);
  const res = await query(`SELECT email_notifications FROM users WHERE id = $1`, [user.id]);
  return NextResponse.json({ success: true, emailNotifications: Boolean(res.rows[0]?.email_notifications) });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in', 401);
  const parsed = z.object({ emailNotifications: z.boolean() }).safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  await setEmailNotifications(user.id, parsed.data.emailNotifications);
  return NextResponse.json({ success: true, emailNotifications: parsed.data.emailNotifications });
}
