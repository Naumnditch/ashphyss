/** PUT / DELETE /api/messages/templates/:id — edit or remove a template. */

import { NextRequest, NextResponse } from 'next/server';
import { fail, readJson, requireAdmin, UUID_RE, zodMessage } from '@/lib/messaging/http';
import { deleteTemplate, updateTemplate } from '@/lib/messaging/store';
import { templateSchema } from '@/lib/messaging/schemas';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  if (!UUID_RE.test(params.id)) return fail('Template not found', 404);
  const parsed = templateSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const template = await updateTemplate(params.id, parsed.data);
  return template ? NextResponse.json({ success: true, template }) : fail('Template not found', 404);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  if (!UUID_RE.test(params.id)) return fail('Template not found', 404);
  await deleteTemplate(params.id);
  return NextResponse.json({ success: true });
}
