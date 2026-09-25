/** GET /api/subscribers/search?q= — admin only: find people to message by name or email. */

import { NextRequest, NextResponse } from 'next/server';
import { fail, requireAdmin } from '@/lib/messaging/http';
import { searchSubscribers } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 100);
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get('limit')) || 12);
  return NextResponse.json({ success: true, subscribers: await searchSubscribers(q, limit) });
}
