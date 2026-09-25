/**
 * GET /api/messages/inbox
 *
 * Admin: conversations, newest first. ?q= searches names, emails and message
 *   text; ?filter=all|unread|received|sent; ?page=&pageSize= paginate.
 * Anyone else: their own conversation with the team, newest `limit`
 *   messages (?before=<messageId> pages back); ?markRead=1 marks it read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { fail, UUID_RE } from '@/lib/messaging/http';
import { getThreadIdForSubscriber, getThreadMessages, listThreads, markThreadRead, unreadCount } from '@/lib/messaging/store';
import type { InboxFilter } from '@/lib/messaging/types';

export const dynamic = 'force-dynamic';

const FILTERS: InboxFilter[] = ['all', 'unread', 'received', 'sent'];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in', 401);
  const sp = req.nextUrl.searchParams;

  if (user.role === 'admin') {
    const filter = FILTERS.includes(sp.get('filter') as InboxFilter) ? (sp.get('filter') as InboxFilter) : 'all';
    const [list, unread] = await Promise.all([
      listThreads({
        adminId: user.id,
        q: sp.get('q') ?? undefined,
        filter,
        page: Number(sp.get('page')) || 1,
        pageSize: Number(sp.get('pageSize')) || 20,
      }),
      unreadCount(user),
    ]);
    return NextResponse.json({ success: true, ...list, unreadTotal: unread });
  }

  const threadId = await getThreadIdForSubscriber(user.id);
  if (!threadId) return NextResponse.json({ success: true, messages: [], hasMore: false, unreadTotal: 0 });
  const before = sp.get('before');
  const { messages, hasMore } = await getThreadMessages(threadId, {
    limit: Number(sp.get('limit')) || 50,
    before: before && UUID_RE.test(before) ? before : null,
  });
  if (sp.get('markRead') === '1') await markThreadRead(threadId, 'subscriber');
  return NextResponse.json({ success: true, messages, hasMore, unreadTotal: await unreadCount(user) });
}
