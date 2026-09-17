/**
 * POST /api/video-requests/upload
 * JSON: { path: string } — a filename, e.g. "problem-7-screenshot.png"
 *
 * Returns a signed upload URL for the private "video-request-screenshots"
 * bucket, scoped under the student's own id so one student can never
 * overwrite another's file. Mirrors app/api/admin/booklets/upload/route.ts
 * exactly (same lib/storage/signedUpload.ts helper) — the browser PUTs the
 * actual bytes straight to storage, this call only mints the token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PLUS } from '@/lib/subscriptions/getUserTier';
import { createSignedUploadUrl } from '@/lib/storage/signedUpload';

const BUCKET = 'video-request-screenshots';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 });
  }
  const tier = await getUserTier(user.id);
  if (tier < TIER_PLUS) {
    return NextResponse.json({ success: false, error: 'Video solve requests are available on Plus and Pro plans.' }, { status: 403 });
  }

  const { path } = (await req.json()) as { path?: string };
  if (!path) {
    return NextResponse.json({ success: false, error: 'path is required' }, { status: 400 });
  }
  const safeName = path.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\/+/, '');
  const fullPath = `${user.id}/${Date.now()}-${safeName}`;

  const signed = await createSignedUploadUrl(BUCKET, fullPath);
  if ('error' in signed) {
    return NextResponse.json({ success: false, error: signed.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, signedUrl: signed.signedUrl, path: fullPath });
}
