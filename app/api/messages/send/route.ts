/**
 * POST /api/messages/send
 *
 * Admin: { recipientIds, subject, body (HTML, may hold {{placeholders}}), draftId? }
 *   sends one message to each chosen person, on-site and by email.
 * Anyone else: { body (plain text) } writes to the AshPhys team in their own
 *   conversation; the admins get an email alert.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { emailProvider } from '@/lib/messaging/config';
import { isBlankHtml } from '@/lib/messaging/html';
import { fail, readJson, zodMessage } from '@/lib/messaging/http';
import { deleteDraft, deleteReplyDraft, getSubscriber, getSubscribers, recentInboundCount, recordInbound, sendToSubscribers } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const adminSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1, 'Choose at least one recipient').max(100, 'Use bulk send for more than 100 people'),
  subject: z.string().trim().min(1, 'Add a subject').max(300),
  body: z.string().max(100_000),
  draftId: z.string().uuid().nullable().optional(),
  replyDraftFor: z.string().uuid().nullable().optional(),
});

const subscriberSchema = z.object({ body: z.string().trim().min(1, 'Write a message first').max(10_000) });

const HOURLY_LIMIT = 20;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in', 401);
  const json = await readJson(req);

  if (user.role === 'admin') {
    const parsed = adminSchema.safeParse(json);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const { recipientIds, subject, body, draftId, replyDraftFor } = parsed.data;
    if (isBlankHtml(body)) return fail('Write a message first');

    const recipients = await getSubscribers(Array.from(new Set(recipientIds)));
    if (!recipients.length) return fail('None of those recipients exist', 404);

    const outcome = await sendToSubscribers({ sender: user, recipients, subject, body });
    if (draftId) await deleteDraft(user.id, draftId);
    if (replyDraftFor) await deleteReplyDraft(user.id, replyDraftFor);
    return NextResponse.json({ success: true, ...outcome, emailProvider: emailProvider() });
  }

  const parsed = subscriberSchema.safeParse(json);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  if ((await recentInboundCount(user.id, 60)) >= HOURLY_LIMIT) {
    return fail('You have sent a lot of messages in the last hour. Please wait a little before sending more.', 429);
  }
  const me = await getSubscriber(user.id);
  if (!me) return fail('Account not found', 404);
  const message = await recordInbound({ subscriber: me, text: parsed.data.body, channel: 'web' });
  return NextResponse.json({ success: true, message });
}
