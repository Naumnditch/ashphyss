/** GET /api/messages/open/:id?sig= — 1×1 pixel in outgoing emails; records when the email was first opened. */

import { timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { openSignature } from '@/lib/messaging/emailLayout';
import { UUID_RE } from '@/lib/messaging/http';
import { markEmailOpened } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sig = req.nextUrl.searchParams.get('sig') ?? '';
  if (UUID_RE.test(params.id)) {
    const expected = Buffer.from(openSignature(params.id));
    const given = Buffer.from(sig);
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      try {
        await markEmailOpened(params.id);
      } catch (err) {
        console.error('open pixel:', err);
      }
    }
  }
  return new Response(GIF, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0', 'Content-Length': String(GIF.length) },
  });
}
