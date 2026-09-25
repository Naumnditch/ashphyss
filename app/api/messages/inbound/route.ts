/**
 * POST /api/messages/inbound?secret=MAIL_INBOUND_SECRET
 *
 * Inbound-email webhook: point your provider's inbound parse at this URL
 * (SendGrid Inbound Parse, Postmark, Mailgun, or a Cloudflare Email Worker
 * posting JSON). Replies to messages+<token>@… are filed in that
 * conversation:
 *   - from the subscriber → a received message (admins are alerted);
 *   - from an admin (replying to an alert email) → sent to the subscriber.
 * Mail with no token is filed by matching the sender to an account.
 * Always answers 200 for mail it chooses to ignore, so providers don't retry.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { textToHtml } from '@/lib/messaging/html';
import { normalizeInbound, replyTokenFrom, stripQuotedReply } from '@/lib/messaging/inbound';
import { getSubscriber, getThreadByToken, recordInbound, sendToSubscribers } from '@/lib/messaging/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function secretOk(req: NextRequest): boolean {
  const expected = process.env.MAIL_INBOUND_SECRET;
  if (!expected) return false;
  const given = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-inbound-secret') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await req.json()) as Record<string, unknown>;
  const form = await req.formData();
  const out: Record<string, unknown> = {};
  form.forEach((value, key) => {
    if (typeof value === 'string') out[key] = value;
  });
  return out;
}

const ignored = (reason: string) => NextResponse.json({ success: true, ignored: reason });

export async function POST(req: NextRequest) {
  if (!process.env.MAIL_INBOUND_SECRET) return NextResponse.json({ success: false, error: 'Inbound email is not configured' }, { status: 503 });
  if (!secretOk(req)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  let payload: Record<string, unknown>;
  try {
    payload = await readPayload(req);
  } catch {
    return NextResponse.json({ success: false, error: 'Unreadable payload' }, { status: 400 });
  }
  const email = normalizeInbound(payload);
  if (!email) return ignored('no sender');
  const text = stripQuotedReply(email.text);
  if (!text) return ignored('empty message');

  const token = replyTokenFrom(email.recipients);
  const thread = token ? await getThreadByToken(token) : null;
  const sender = (
    await query(`SELECT id, role::text AS role, first_name, last_name, status::text AS status FROM users WHERE lower(email) = $1`, [email.from])
  ).rows[0];

  if (thread) {
    const subscriber = await getSubscriber(thread.subscriber_id);
    if (!subscriber) return ignored('subscriber gone');
    if (sender?.id === subscriber.id) {
      const message = await recordInbound({ subscriber, text, channel: 'email', subject: email.subject });
      return NextResponse.json({ success: true, filed: 'inbound', messageId: message.id });
    }
    if (sender?.role === 'admin' && sender.status === 'active') {
      const subject = /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject || 'your message'}`;
      const outcome = await sendToSubscribers({
        sender: { id: sender.id, firstName: sender.first_name, lastName: sender.last_name },
        recipients: [subscriber],
        subject,
        body: textToHtml(text),
      });
      return NextResponse.json({ success: true, filed: 'outbound', messageId: outcome.messages[0]?.id });
    }
    return ignored('sender does not match the conversation');
  }

  if (sender && sender.role !== 'admin') {
    const subscriber = await getSubscriber(sender.id);
    if (subscriber) {
      const message = await recordInbound({ subscriber, text, channel: 'email', subject: email.subject });
      return NextResponse.json({ success: true, filed: 'inbound', messageId: message.id });
    }
  }
  return ignored('unknown sender');
}
