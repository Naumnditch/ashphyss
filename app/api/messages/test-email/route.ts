/**
 * POST /api/messages/test-email — admin only: sends a sample email (to
 * { to } or the admin's own address) and reports exactly what the email
 * service said, to check the setup end to end.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, readJson, requireAdmin, zodMessage } from '@/lib/messaging/http';
import { sendTestEmail } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const parsed = z.object({ to: z.string().trim().max(254).optional() }).safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const to = parsed.data.to || admin.email;
  const result = await sendTestEmail(to);
  return NextResponse.json({ success: true, to, ...result });
}
