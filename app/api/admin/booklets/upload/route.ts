/**
 * POST /api/admin/booklets/upload
 * JSON: { path: string } — the storage object path, e.g. "chapter-3/ch3-momentum-booklet.pdf"
 *
 * Returns a signed upload URL for the "booklets" bucket; the browser PUTs
 * the actual file bytes there directly (see lib/storage/signedUpload.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSignedUploadUrl, publicStorageUrl } from '@/lib/storage/signedUpload';

const BUCKET = 'booklets';

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { path } = (await req.json()) as { path?: string };
  if (!path) {
    return NextResponse.json({ success: false, error: 'path is required' }, { status: 400 });
  }
  const safePath = path.replace(/[^a-zA-Z0-9/_-]/g, '-').replace(/^\/+/, '');

  const signed = await createSignedUploadUrl(BUCKET, safePath);
  if ('error' in signed) {
    return NextResponse.json({ success: false, error: signed.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, signedUrl: signed.signedUrl, publicUrl: publicStorageUrl(BUCKET, safePath) });
}
