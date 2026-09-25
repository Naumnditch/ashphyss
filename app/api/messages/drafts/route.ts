/**
 * GET  /api/messages/drafts — admin's saved compose and bulk drafts.
 * POST /api/messages/drafts — autosave { id?, kind, subscriberId?, recipientIds?, filters?, subject, body } → { id }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, readJson, requireAdmin, zodMessage } from '@/lib/messaging/http';
import { listDrafts, saveDraft } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

const schema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    kind: z.enum(['compose', 'bulk', 'reply']),
    subscriberId: z.string().uuid().nullable().optional(),
    recipientIds: z.array(z.string().uuid()).max(100).optional(),
    filters: z.record(z.unknown()).optional(),
    subject: z.string().max(300).optional(),
    body: z.string().max(100_000).optional(),
  })
  .refine((d) => d.kind !== 'reply' || d.subscriberId, { message: 'subscriberId is required for a reply draft' });

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  return NextResponse.json({ success: true, drafts: await listDrafts(admin.id) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const id = await saveDraft(admin.id, parsed.data);
  return NextResponse.json({ success: true, id, savedAt: new Date().toISOString() });
}
