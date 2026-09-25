/**
 * GET  /api/messages/templates — every saved template.
 * POST /api/messages/templates — save { name, category?, subject, body } as a new template.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fail, readJson, requireAdmin, zodMessage } from '@/lib/messaging/http';
import { createTemplate, listTemplates } from '@/lib/messaging/store';
import { templateSchema } from '@/lib/messaging/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  return NextResponse.json({ success: true, templates: await listTemplates() });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const parsed = templateSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  return NextResponse.json({ success: true, template: await createTemplate(admin.id, parsed.data) });
}
