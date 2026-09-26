/**
 * GET|POST /api/cron/email-retry — sends failed emails whose retry time has
 * come (see lib/messaging/retryPolicy.ts). Called every 5 minutes by a
 * Supabase pg_cron job (only when something is due), authorised with
 * `Authorization: Bearer $CRON_SECRET`; an admin can also call it.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/messaging/http';
import { retryDueEmails } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function bearerOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(req: NextRequest) {
  if (!bearerOk(req) && !(await requireAdmin())) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  const result = await retryDueEmails(40);
  return NextResponse.json({ success: true, ...result });
}

export const GET = run;
export const POST = run;
