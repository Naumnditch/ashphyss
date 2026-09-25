/**
 * PUT /api/messages/:messageId/read — marks one message read. Admins can
 * mark messages from subscribers; a subscriber can mark messages sent to them.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { fail, UUID_RE } from '@/lib/messaging/http';
import { getMessage, markMessageRead } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function PUT(_req: Request, { params }: { params: { messageId: string } }) {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in', 401);
  if (!UUID_RE.test(params.messageId)) return fail('Message not found', 404);

  const m = await getMessage(params.messageId);
  const allowed = m && (user.role === 'admin' ? m.direction === 'inbound' : m.direction === 'outbound' && m.subscriber_id === user.id);
  if (!allowed) return fail('Message not found', 404);

  const readAt = await markMessageRead(params.messageId);
  return NextResponse.json({ success: true, readAt });
}
