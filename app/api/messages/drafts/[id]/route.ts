/** DELETE /api/messages/drafts/:id — discard a draft. */

import { NextResponse } from 'next/server';
import { fail, requireAdmin, UUID_RE } from '@/lib/messaging/http';
import { deleteDraft } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  if (!UUID_RE.test(params.id)) return fail('Draft not found', 404);
  await deleteDraft(admin.id, params.id);
  return NextResponse.json({ success: true });
}
