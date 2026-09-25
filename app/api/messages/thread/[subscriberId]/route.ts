/**
 * GET /api/messages/thread/:subscriberId — admin only.
 * The subscriber's profile, their conversation (newest `limit` messages,
 * ?before=<messageId> pages back) and the admin's unsent reply draft.
 * ?markRead=1 marks the subscriber's messages as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fail, requireAdmin, UUID_RE } from '@/lib/messaging/http';
import { getReplyDraft, getSubscriber, getThreadIdForSubscriber, getThreadMessages, markThreadRead, publicSubscriber } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { subscriberId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  if (!UUID_RE.test(params.subscriberId)) return fail('Unknown subscriber', 404);

  const subscriber = await getSubscriber(params.subscriberId);
  if (!subscriber) return fail('Unknown subscriber', 404);

  const sp = req.nextUrl.searchParams;
  const threadId = await getThreadIdForSubscriber(subscriber.id);
  const before = sp.get('before');
  const [thread, draft] = await Promise.all([
    threadId
      ? getThreadMessages(threadId, { limit: Number(sp.get('limit')) || 50, before: before && UUID_RE.test(before) ? before : null })
      : Promise.resolve({ messages: [], hasMore: false }),
    getReplyDraft(admin.id, subscriber.id),
  ]);
  const markedRead = threadId && sp.get('markRead') === '1' ? await markThreadRead(threadId, 'admin') : 0;

  return NextResponse.json({
    success: true,
    subscriber: publicSubscriber(subscriber),
    threadId,
    messages: thread.messages,
    hasMore: thread.hasMore,
    draft,
    markedRead,
  });
}
