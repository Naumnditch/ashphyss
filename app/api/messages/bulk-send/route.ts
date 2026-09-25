/**
 * POST /api/messages/bulk-send — admin only.
 *   { filters, subject, body, templateId?, draftId?, preview: true }
 *     → how many people match (and how many can be emailed), with a sample.
 *   { filters, subject, body, templateId?, draftId?, expectedCount }
 *     → sends a personalised copy ({{first_name}} …) to everyone matching.
 *     expectedCount must equal the current match count, so nobody is
 *     messaged who wasn't in the list the admin confirmed.
 * GET /api/messages/bulk-send — recent bulk sends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audienceOptions, nameMaps } from '@/lib/messaging/audience';
import { emailProvider } from '@/lib/messaging/config';
import { describeFilters, recipientFiltersSchema } from '@/lib/messaging/filters';
import { isBlankHtml } from '@/lib/messaging/html';
import { fail, readJson, requireAdmin, zodMessage } from '@/lib/messaging/http';
import { createBulkSend, deleteDraft, finishBulkSend, listBulkSends, recipientsForFilters, sendToSubscribers } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_RECIPIENTS = 2000;

const schema = z.object({
  filters: recipientFiltersSchema,
  subject: z.string().max(300).default(''),
  body: z.string().max(100_000).default(''),
  templateId: z.string().uuid().nullable().optional(),
  draftId: z.string().uuid().nullable().optional(),
  preview: z.boolean().optional(),
  expectedCount: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const { filters, subject, body, templateId, draftId, preview, expectedCount } = parsed.data;

  const [recipients, options] = await Promise.all([recipientsForFilters(filters), audienceOptions()]);
  const { sectionNames, courseNames } = nameMaps(options);
  const label = describeFilters(filters, sectionNames, courseNames);
  const emailable = recipients.filter((r) => r.emailNotifications).length;

  if (preview) {
    return NextResponse.json({
      success: true,
      count: recipients.length,
      emailable,
      emailProvider: emailProvider(),
      label,
      sample: recipients.slice(0, 8).map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`.trim(), email: r.email, tierName: r.tierName })),
    });
  }

  if (!subject.trim()) return fail('Add a subject');
  if (isBlankHtml(body)) return fail('Write a message first');
  if (!recipients.length) return fail('No one matches these filters');
  if (recipients.length > MAX_RECIPIENTS) return fail(`That is ${recipients.length} people; narrow the filters to ${MAX_RECIPIENTS} or fewer.`);
  if (expectedCount === undefined) return fail('Preview the recipients before sending');
  if (expectedCount !== recipients.length) {
    return fail(`The recipient list changed (${expectedCount} → ${recipients.length}). Check the preview and send again.`, 409);
  }

  const bulkSendId = await createBulkSend(admin.id, { subject, body, filters, label, templateId, recipientCount: recipients.length });
  const outcome = await sendToSubscribers({ sender: admin, recipients, subject, body, bulkSendId });
  await finishBulkSend(bulkSendId, outcome.emailed);
  if (draftId) await deleteDraft(admin.id, draftId);

  return NextResponse.json({
    success: true,
    bulkSendId,
    sent: outcome.messages.length,
    emailed: outcome.emailed,
    failed: outcome.messages.filter((m) => m.emailStatus === 'failed').length,
    emailProvider: emailProvider(),
  });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return fail('Not authorized', 403);
  return NextResponse.json({ success: true, bulkSends: await listBulkSends() });
}
