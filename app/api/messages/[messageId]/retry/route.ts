/** POST /api/messages/:messageId/retry — admin only: try a failed (or skipped) email again now. */

import { NextResponse } from 'next/server';
import { fail, requireAdmin, UUID_RE } from '@/lib/messaging/http';
import { retryEmailNow } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: { messageId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  if (!UUID_RE.test(params.messageId)) return fail('Message not found', 404);
  const outcome = await retryEmailNow(params.messageId);
  if (!outcome) return fail('This email is already sent or being sent', 409);
  return NextResponse.json({ success: true, ...outcome });
}
