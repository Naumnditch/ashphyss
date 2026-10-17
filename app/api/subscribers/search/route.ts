/** GET /api/subscribers/search?q=&limit= — admin only: find people to message by name or email. */

import { NextRequest, NextResponse } from 'next/server';
import { fail, requireAdmin } from '@/lib/messaging/http';
import { searchSubscribers } from '@/lib/messaging/store';
import { searchLimit } from '@/lib/messaging/subscriberSearch';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 100);
  const { subscribers, total } = await searchSubscribers(q, searchLimit(req.nextUrl.searchParams.get('limit')));
  return NextResponse.json({ success: true, subscribers, total });
}
