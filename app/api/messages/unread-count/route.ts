/** GET /api/messages/unread-count — the badge number (polled by the navbar and mailbox). */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { unreadCount } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: true, count: 0, signedIn: false });
  return NextResponse.json({ success: true, count: await unreadCount(user), signedIn: true });
}
