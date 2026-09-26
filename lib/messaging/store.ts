/**
 * Database side of the mailbox: threads, messages, drafts, templates and
 * bulk sends, plus delivery (on-site always; by email when a provider is
 * configured and the person hasn't unsubscribed).
 */

import { query } from '@/lib/db/client';
import { tierName } from '@/lib/subscriptions/getUserTier';
import { adminNotifyOverride, configuredReplyTo, emailProvider, siteUrl } from './config';
import { buildEmail, openPixelUrl, unsubscribeHeaders } from './emailLayout';
import { escapeHtml, htmlToText, previewOf, sanitizeMessageHtml, textToHtml } from './html';
import { sendMail } from './mailer';
import { nextRetryAt, SEND_LEASE_MIN } from './retryPolicy';
import { checkEmail } from './validateEmail';
import { fillPlaceholders, placeholderValues } from './placeholders';
import { buildRecipientWhere, TIER_SQL, type RecipientFilters } from './filters';
import type {
  BulkSendDTO,
  DraftDTO,
  EmailStatus,
  InboxFilter,
  MessageDTO,
  SubscriberDTO,
  TemplateDTO,
  ThreadSummaryDTO,
} from './types';

// ---------------------------------------------------------------- subscribers

export interface SubscriberRow extends SubscriberDTO {
  unsubscribeToken: string;
}

const SUBSCRIBER_COLUMNS = `u.id, u.first_name, u.last_name, u.email, u.role::text AS role, u.status::text AS status,
  u.section_id, sec.name AS section_name, u.email_notifications, u.unsubscribe_token, u.created_at, ${TIER_SQL} AS tier`;
const SUBSCRIBER_FROM = `users u LEFT JOIN sections sec ON sec.id = u.section_id`;

function toSubscriber(r: any): SubscriberRow {
  const tier = Number(r.tier ?? 0);
  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email,
    role: r.role,
    status: r.status,
    tier,
    tierName: tierName(tier),
    sectionId: r.section_id,
    sectionName: r.section_name ?? null,
    emailNotifications: Boolean(r.email_notifications),
    joinedAt: new Date(r.created_at).toISOString(),
    unsubscribeToken: r.unsubscribe_token,
  };
}

export function publicSubscriber(s: SubscriberRow): SubscriberDTO {
  const { unsubscribeToken: _omit, ...rest } = s;
  return rest;
}

export async function getSubscriber(id: string): Promise<SubscriberRow | null> {
  const res = await query(`SELECT ${SUBSCRIBER_COLUMNS} FROM ${SUBSCRIBER_FROM} WHERE u.id = $1 AND u.role <> 'admin'`, [id]);
  return res.rows[0] ? toSubscriber(res.rows[0]) : null;
}

export async function getSubscribers(ids: string[]): Promise<SubscriberRow[]> {
  if (!ids.length) return [];
  const res = await query(`SELECT ${SUBSCRIBER_COLUMNS} FROM ${SUBSCRIBER_FROM} WHERE u.id = ANY($1::uuid[]) AND u.role <> 'admin'`, [ids]);
  return res.rows.map(toSubscriber);
}

export async function searchSubscribers(q: string, limit = 12): Promise<SubscriberDTO[]> {
  const term = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const res = await query(
    `SELECT ${SUBSCRIBER_COLUMNS} FROM ${SUBSCRIBER_FROM}
     WHERE u.role <> 'admin'
       AND ($1 = '%%' OR (u.first_name || ' ' || u.last_name) ILIKE $1 OR u.email ILIKE $1)
     ORDER BY u.first_name, u.last_name
     LIMIT $2`,
    [term, limit]
  );
  return res.rows.map((r) => publicSubscriber(toSubscriber(r)));
}

export async function recipientsForFilters(filters: RecipientFilters): Promise<SubscriberRow[]> {
  const { where, params } = buildRecipientWhere(filters);
  const res = await query(`SELECT ${SUBSCRIBER_COLUMNS} FROM ${SUBSCRIBER_FROM} WHERE ${where} ORDER BY u.first_name, u.last_name`, params);
  return res.rows.map(toSubscriber);
}

// ---------------------------------------------------------------- threads

interface ThreadRef {
  threadId: string;
  replyToken: string;
}

export async function ensureThreads(subscriberIds: string[], adminId: string | null): Promise<Map<string, ThreadRef>> {
  const res = await query(
    `INSERT INTO message_threads (subscriber_id, admin_id)
     SELECT unnest($1::uuid[]), $2::uuid
     ON CONFLICT (subscriber_id) DO UPDATE SET admin_id = COALESCE(message_threads.admin_id, EXCLUDED.admin_id)
     RETURNING id, subscriber_id, reply_token`,
    [subscriberIds, adminId]
  );
  return new Map(res.rows.map((r) => [r.subscriber_id as string, { threadId: r.id as string, replyToken: r.reply_token as string }]));
}

async function touchThreads(rows: { threadId: string; preview: string; direction: 'inbound' | 'outbound' }[]) {
  if (!rows.length) return;
  await query(
    `UPDATE message_threads t SET last_message_at = now(), updated_at = now(),
       last_message_preview = x.preview, last_direction = x.direction
     FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS preview, unnest($3::text[]) AS direction) x
     WHERE t.id = x.id`,
    [rows.map((r) => r.threadId), rows.map((r) => r.preview), rows.map((r) => r.direction)]
  );
}

export async function getThreadByToken(token: string) {
  const res = await query(`SELECT id, subscriber_id, reply_token FROM message_threads WHERE reply_token = $1`, [token]);
  return res.rows[0] ?? null;
}

export async function getThreadIdForSubscriber(subscriberId: string): Promise<string | null> {
  const res = await query(`SELECT id FROM message_threads WHERE subscriber_id = $1`, [subscriberId]);
  return res.rows[0]?.id ?? null;
}

export async function listThreads(opts: { q?: string; filter?: InboxFilter; page?: number; pageSize?: number; adminId: string }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, opts.pageSize ?? 20));
  const params: unknown[] = [opts.adminId];
  const where: string[] = ['EXISTS (SELECT 1 FROM messages m WHERE m.thread_id = t.id)'];
  const q = opts.q?.trim();
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const i = params.length;
    where.push(`((u.first_name || ' ' || u.last_name) ILIKE $${i} OR u.email ILIKE $${i}
      OR EXISTS (SELECT 1 FROM messages m WHERE m.thread_id = t.id AND (m.body_text ILIKE $${i} OR m.subject ILIKE $${i})))`);
  }
  if (opts.filter === 'unread') where.push(`EXISTS (SELECT 1 FROM messages m WHERE m.thread_id = t.id AND m.direction = 'inbound' AND m.read_at IS NULL)`);
  if (opts.filter === 'received') where.push(`t.last_direction = 'inbound'`);
  if (opts.filter === 'sent') where.push(`t.last_direction = 'outbound'`);

  params.push(pageSize, (page - 1) * pageSize);
  const res = await query(
    `SELECT t.id, t.subscriber_id, t.last_message_at, t.last_message_preview, t.last_direction,
            u.first_name, u.last_name, u.email, u.role::text AS role, ${TIER_SQL} AS tier,
            (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id AND m.direction = 'inbound' AND m.read_at IS NULL) AS unread,
            (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id) AS message_count,
            EXISTS (SELECT 1 FROM message_drafts d WHERE d.kind = 'reply' AND d.subscriber_id = t.subscriber_id AND d.admin_id = $1 AND d.body <> '') AS has_draft,
            COUNT(*) OVER () AS total
     FROM message_threads t JOIN users u ON u.id = t.subscriber_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.last_message_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const threads: ThreadSummaryDTO[] = res.rows.map((r) => ({
    threadId: r.id,
    subscriber: {
      id: r.subscriber_id,
      firstName: r.first_name ?? '',
      lastName: r.last_name ?? '',
      email: r.email,
      role: r.role,
      tierName: tierName(Number(r.tier ?? 0)),
    },
    lastMessageAt: new Date(r.last_message_at).toISOString(),
    lastMessagePreview: r.last_message_preview,
    lastDirection: r.last_direction,
    unread: Number(r.unread),
    messageCount: Number(r.message_count),
    hasDraft: Boolean(r.has_draft),
  }));
  return { threads, total: Number(res.rows[0]?.total ?? 0), page, pageSize };
}

// ---------------------------------------------------------------- messages

function toMessage(r: any): MessageDTO {
  return {
    id: r.id,
    threadId: r.thread_id,
    direction: r.direction,
    channel: r.channel,
    subject: r.subject,
    body: r.body,
    senderName: r.sender_first ? `${r.sender_first} ${r.sender_last ?? ''}`.trim() : null,
    createdAt: new Date(r.created_at).toISOString(),
    readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
    emailStatus: r.email_status,
    emailError: r.email_error,
    emailOpenedAt: r.email_opened_at ? new Date(r.email_opened_at).toISOString() : null,
    emailAttempts: Number(r.email_attempts ?? 0),
    emailNextAttemptAt: r.email_next_attempt_at ? new Date(r.email_next_attempt_at).toISOString() : null,
    emailSentAt: r.email_sent_at ? new Date(r.email_sent_at).toISOString() : null,
    bulk: Boolean(r.bulk_send_id),
  };
}

const MESSAGE_SELECT = `SELECT m.*, s.first_name AS sender_first, s.last_name AS sender_last
  FROM messages m LEFT JOIN users s ON s.id = m.sender_id`;

/** Newest `limit` messages of a thread, oldest first (optionally only those before a message). */
export async function getThreadMessages(threadId: string, opts: { limit?: number; before?: string | null } = {}) {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const params: unknown[] = [threadId, limit + 1];
  let cursor = '';
  if (opts.before) {
    params.push(opts.before);
    cursor = `AND m.created_at < (SELECT created_at FROM messages WHERE id = $3)`;
  }
  const res = await query(`${MESSAGE_SELECT} WHERE m.thread_id = $1 ${cursor} ORDER BY m.created_at DESC LIMIT $2`, params);
  const hasMore = res.rows.length > limit;
  return { messages: res.rows.slice(0, limit).reverse().map(toMessage), hasMore };
}

export async function getMessage(id: string) {
  const res = await query(`SELECT m.*, t.subscriber_id FROM messages m JOIN message_threads t ON t.id = m.thread_id WHERE m.id = $1`, [id]);
  return res.rows[0] ?? null;
}

/** Marks everything the viewer received in a thread as read. */
export async function markThreadRead(threadId: string, as: 'admin' | 'subscriber'): Promise<number> {
  const res = await query(
    `UPDATE messages SET read_at = now() WHERE thread_id = $1 AND direction = $2 AND read_at IS NULL`,
    [threadId, as === 'admin' ? 'inbound' : 'outbound']
  );
  return res.rowCount ?? 0;
}

export async function markMessageRead(id: string): Promise<string | null> {
  const res = await query(`UPDATE messages SET read_at = COALESCE(read_at, now()) WHERE id = $1 RETURNING read_at`, [id]);
  return res.rows[0]?.read_at ? new Date(res.rows[0].read_at).toISOString() : null;
}

export async function markEmailOpened(id: string) {
  await query(`UPDATE messages SET email_opened_at = COALESCE(email_opened_at, now()) WHERE id = $1 AND direction = 'outbound'`, [id]);
}

export async function unreadCount(user: { id: string; role: string }): Promise<number> {
  const res =
    user.role === 'admin'
      ? await query(`SELECT COUNT(*) AS n FROM messages WHERE direction = 'inbound' AND read_at IS NULL`)
      : await query(
          `SELECT COUNT(*) AS n FROM messages m JOIN message_threads t ON t.id = m.thread_id
           WHERE t.subscriber_id = $1 AND m.direction = 'outbound' AND m.read_at IS NULL`,
          [user.id]
        );
  return Number(res.rows[0]?.n ?? 0);
}

export async function recentInboundCount(subscriberId: string, minutes: number): Promise<number> {
  const res = await query(
    `SELECT COUNT(*) AS n FROM messages m JOIN message_threads t ON t.id = m.thread_id
     WHERE t.subscriber_id = $1 AND m.direction = 'inbound' AND m.created_at > now() - make_interval(mins => $2::int)`,
    [subscriberId, minutes]
  );
  return Number(res.rows[0]?.n ?? 0);
}

// ---------------------------------------------------------------- sending

interface Sender {
  id: string;
  firstName: string;
  lastName: string;
}

let adminEmailCache: { email: string | null; at: number } | null = null;

/** The admin inbox that gets students' email replies when no reply inbox is configured. */
export async function adminReplyEmail(): Promise<string | null> {
  const override = adminNotifyOverride()[0];
  if (override) return override;
  if (adminEmailCache && Date.now() - adminEmailCache.at < 10 * 60_000) return adminEmailCache.email;
  const res = await query(`SELECT email FROM users WHERE role = 'admin' AND status = 'active' ORDER BY created_at LIMIT 1`);
  adminEmailCache = { email: res.rows[0]?.email ?? null, at: Date.now() };
  return adminEmailCache.email;
}

async function replyToFor(token: string): Promise<{ address: string | null; synced: boolean }> {
  const configured = configuredReplyTo(token);
  if (configured) return configured;
  return { address: await adminReplyEmail(), synced: false };
}

export interface EmailOutcome {
  status: EmailStatus;
  error: string | null;
  /** Set when a failed email will be retried automatically. */
  retryAt: string | null;
}

interface OutboundEmail {
  id: string;
  subject: string;
  body: string;
  /** Attempts already made before this one. */
  attempts: number;
}

async function recordSkip(id: string, reason: string): Promise<EmailOutcome> {
  await query(`UPDATE messages SET email_status = 'skipped', email_error = $2, email_next_attempt_at = NULL WHERE id = $1`, [id, reason]);
  return { status: 'skipped', error: reason, retryAt: null };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Emails one outbound message to its subscriber and records what happened:
 * skipped (unsubscribed, invalid address, no provider), sent, or failed
 * with a retry scheduled (see retryPolicy.ts). `quickRetry` tries a
 * transient failure once more straight away (used when the admin is
 * waiting on the send; the background job doesn't).
 */
async function emailOutbound(m: OutboundEmail, to: SubscriberRow, replyToken: string, { quickRetry = true } = {}): Promise<EmailOutcome> {
  if (!to.emailNotifications) return recordSkip(m.id, 'Unsubscribed from emails');
  if (!emailProvider()) return recordSkip(m.id, 'No email provider configured');
  const check = await checkEmail(to.email);
  if (!check.ok) return recordSkip(m.id, check.reason);

  const replyTo = await replyToFor(replyToken);
  const site = siteUrl();
  const { html, text } = buildEmail({
    title: m.subject,
    bodyHtml: m.body,
    action: { href: `${site}/dashboard/messages#m-${m.id}`, label: 'View in AshPhys' },
    note: replyTo.address ? 'You can reply to this email, or read and reply on AshPhys.' : 'Read and reply on AshPhys.',
    reason: "You're receiving this because you have an AshPhys account",
    unsubscribeToken: to.unsubscribeToken,
    pixelUrl: openPixelUrl(m.id),
    replyMarker: replyTo.synced,
  });
  const mail = {
    to: to.email.trim(),
    toName: `${to.firstName} ${to.lastName}`.trim(),
    subject: m.subject,
    html,
    text,
    replyTo: replyTo.address,
    headers: unsubscribeHeaders(to.unsubscribeToken),
  };

  let attempts = m.attempts;
  let result = await sendMail(mail);
  attempts++;
  if (result.status === 'failed' && !result.permanent && quickRetry) {
    await sleep(800);
    result = await sendMail(mail);
    attempts++;
  }

  if (result.status === 'sent') {
    await query(
      `UPDATE messages SET email_status = 'sent', email_error = NULL, email_attempts = $2, email_last_attempt_at = now(),
         email_sent_at = now(), email_next_attempt_at = NULL, email_provider_id = $3 WHERE id = $1`,
      [m.id, attempts, result.providerId ?? null]
    );
    return { status: 'sent', error: null, retryAt: null };
  }
  if (result.status === 'skipped') return recordSkip(m.id, result.error ?? 'Not sent');

  const retryAt = nextRetryAt(attempts, Boolean(result.permanent));
  const error = `${result.error ?? 'Email failed'}${retryAt ? '' : result.permanent ? ' (not retried: rejected by the email service)' : ` (gave up after ${attempts} attempts)`}`;
  await query(
    `UPDATE messages SET email_status = 'failed', email_error = $2, email_attempts = $3, email_last_attempt_at = now(),
       email_next_attempt_at = $4 WHERE id = $1`,
    [m.id, error.slice(0, 600), attempts, retryAt]
  );
  return { status: 'failed', error, retryAt: retryAt?.toISOString() ?? null };
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

export interface SendOutcome {
  messages: { id: string; subscriberId: string; name: string; emailStatus: EmailStatus; emailError: string | null; retryAt: string | null }[];
  emailed: number;
}

/**
 * Sends a message (subject and body may hold {{placeholders}}) to each
 * recipient: one message per person, in their own thread. The on-site
 * message is saved first; the email follows, and its outcome never undoes
 * the on-site delivery.
 */
export async function sendToSubscribers(opts: {
  sender: Sender;
  recipients: SubscriberRow[];
  subject: string;
  body: string;
  bulkSendId?: string | null;
}): Promise<SendOutcome> {
  const { sender, recipients } = opts;
  if (!recipients.length) return { messages: [], emailed: 0 };
  const threads = await ensureThreads(recipients.map((r) => r.id), sender.id);
  const site = siteUrl();

  const rows = recipients.map((r) => {
    const values = placeholderValues(r, site);
    const subject = fillPlaceholders(opts.subject, values, { html: false }).trim() || 'Message from AshPhys';
    const body = sanitizeMessageHtml(fillPlaceholders(opts.body, values, { html: true }));
    return { r, thread: threads.get(r.id)!, subject, body, text: htmlToText(body) };
  });

  // 'pending' with a lease: if this request dies before emailing, the retry job picks them up.
  const inserted = await query(
    `INSERT INTO messages (thread_id, sender_id, recipient_id, direction, channel, subject, body, body_text, bulk_send_id,
                           email_status, email_next_attempt_at)
     SELECT x.thread_id, $1::uuid, x.recipient_id, 'outbound', 'web', x.subject, x.body, x.body_text, $2::uuid,
            'pending', now() + make_interval(mins => $8::int)
     FROM unnest($3::uuid[], $4::uuid[], $5::text[], $6::text[], $7::text[]) AS x(thread_id, recipient_id, subject, body, body_text)
     RETURNING id, recipient_id`,
    [
      sender.id,
      opts.bulkSendId ?? null,
      rows.map((x) => x.thread.threadId),
      rows.map((x) => x.r.id),
      rows.map((x) => x.subject),
      rows.map((x) => x.body),
      rows.map((x) => x.text),
      SEND_LEASE_MIN,
    ]
  );
  const idFor = new Map(inserted.rows.map((r) => [r.recipient_id as string, r.id as string]));
  await touchThreads(rows.map((x) => ({ threadId: x.thread.threadId, preview: previewOf(`${x.subject} — ${x.text}`), direction: 'outbound' })));

  const messages: SendOutcome['messages'] = [];
  await inBatches(rows, 5, async (x) => {
    const id = idFor.get(x.r.id)!;
    let outcome: EmailOutcome;
    try {
      outcome = await emailOutbound({ id, subject: x.subject, body: x.body, attempts: 0 }, x.r, x.thread.replyToken);
    } catch (err) {
      // A database or validation hiccup: the message is saved, the lease lets the retry job finish the email.
      console.error('emailOutbound failed unexpectedly for', id, err);
      outcome = { status: 'pending', error: 'Email queued for retry', retryAt: null };
    }
    messages.push({
      id,
      subscriberId: x.r.id,
      name: `${x.r.firstName} ${x.r.lastName}`.trim() || x.r.email,
      emailStatus: outcome.status,
      emailError: outcome.error,
      retryAt: outcome.retryAt,
    });
  });
  return { messages, emailed: messages.filter((m) => m.emailStatus === 'sent').length };
}

/**
 * The background half of retries: claims emails whose retry time has come
 * (or whose send was interrupted), and tries each once more. Safe to run
 * from several places at once: rows are claimed with SKIP LOCKED and a lease.
 */
export async function retryDueEmails(limit = 25): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const claimed = await query(
    `UPDATE messages m SET email_status = 'pending', email_next_attempt_at = now() + make_interval(mins => $2::int)
     WHERE m.id IN (
       SELECT id FROM messages
       WHERE direction = 'outbound' AND email_status IN ('failed', 'pending') AND email_next_attempt_at <= now()
       ORDER BY email_next_attempt_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED)
     RETURNING m.id, m.subject, m.body, m.email_attempts, m.recipient_id, m.thread_id`,
    [limit, SEND_LEASE_MIN]
  );
  const out = { processed: claimed.rows.length, sent: 0, failed: 0, skipped: 0 };
  if (!claimed.rows.length) return out;

  const subscribers = new Map((await getSubscribers(claimed.rows.map((r) => r.recipient_id))).map((s) => [s.id, s]));
  const tokens = new Map(
    (await query(`SELECT id, reply_token FROM message_threads WHERE id = ANY($1::uuid[])`, [claimed.rows.map((r) => r.thread_id)])).rows.map((r) => [
      r.id as string,
      r.reply_token as string,
    ])
  );
  await inBatches(claimed.rows, 5, async (r) => {
    const to = subscribers.get(r.recipient_id);
    if (!to) {
      await recordSkip(r.id, 'Recipient account no longer exists');
      out.skipped++;
      return;
    }
    const outcome = await emailOutbound(
      { id: r.id, subject: r.subject ?? 'Message from AshPhys', body: r.body, attempts: r.email_attempts },
      to,
      tokens.get(r.thread_id) ?? '',
      { quickRetry: false }
    );
    if (outcome.status === 'sent') out.sent++;
    else if (outcome.status === 'failed') out.failed++;
    else out.skipped++;
  });
  return out;
}

/** An admin's "Retry now" on one message: also re-tries ones that gave up or were skipped for a fixable reason. */
export async function retryEmailNow(messageId: string): Promise<EmailOutcome | null> {
  const res = await query(
    `UPDATE messages SET email_status = 'pending', email_next_attempt_at = now() + make_interval(mins => $2::int)
     WHERE id = $1 AND direction = 'outbound' AND email_status IN ('failed', 'skipped')
     RETURNING id, subject, body, email_attempts, recipient_id, thread_id`,
    [messageId, SEND_LEASE_MIN]
  );
  const r = res.rows[0];
  if (!r) return null;
  const to = await getSubscriber(r.recipient_id);
  if (!to) return recordSkip(r.id, 'Recipient account no longer exists');
  const token = (await query(`SELECT reply_token FROM message_threads WHERE id = $1`, [r.thread_id])).rows[0]?.reply_token ?? '';
  // A manual retry starts a fresh schedule if this one fails too.
  return emailOutbound({ id: r.id, subject: r.subject ?? 'Message from AshPhys', body: r.body, attempts: 0 }, to, token);
}

/** Emails sent, failed and waiting, for the status panel. */
export async function emailDeliveryStats() {
  const res = await query(`
    SELECT
      COUNT(*) FILTER (WHERE email_status = 'sent' AND email_sent_at > now() - interval '30 days') AS sent_30d,
      COUNT(*) FILTER (WHERE email_status = 'failed' AND email_next_attempt_at IS NOT NULL) AS retrying,
      COUNT(*) FILTER (WHERE email_status = 'failed' AND email_next_attempt_at IS NULL) AS gave_up,
      COUNT(*) FILTER (WHERE email_status = 'pending') AS sending
    FROM messages WHERE direction = 'outbound'`);
  const r = res.rows[0];
  return { sent30d: Number(r.sent_30d), retrying: Number(r.retrying), gaveUp: Number(r.gave_up), sending: Number(r.sending) };
}

/** Sends a sample message email to one address, to check the email setup end to end. */
export async function sendTestEmail(to: string) {
  const check = await checkEmail(to);
  if (!check.ok) return { status: 'skipped' as const, provider: emailProvider(), error: check.reason };
  const site = siteUrl();
  const replyTo = await replyToFor('0'.repeat(32));
  const { html, text } = buildEmail({
    title: 'AshPhys email test',
    bodyHtml: `<p>This is a test email from your AshPhys mailbox.</p><p>If you can read this, messages you send from <a href="${site}/admin/messages">the mailbox</a> will reach students by email too.</p>`,
    action: { href: `${site}/admin/messages`, label: 'View in AshPhys' },
    note: replyTo.address ? `Replies to mailbox emails go to ${replyTo.address}.` : undefined,
    reason: "You're receiving this because you asked AshPhys to send a test email",
  });
  return sendMail({ to, subject: 'AshPhys email test', html, text, replyTo: replyTo.address });
}

/** A subscriber writing to the team (on-site or by replying to an email). */
export async function recordInbound(opts: { subscriber: SubscriberRow; text: string; channel: 'web' | 'email'; subject?: string | null }) {
  const threads = await ensureThreads([opts.subscriber.id], null);
  const thread = threads.get(opts.subscriber.id)!;
  const text = opts.text.trim();
  const body = sanitizeMessageHtml(textToHtml(text));
  const res = await query(
    `INSERT INTO messages (thread_id, sender_id, direction, channel, subject, body, body_text, email_status)
     VALUES ($1, $2, 'inbound', $3, $4, $5, $6, 'none') RETURNING *`,
    [thread.threadId, opts.subscriber.id, opts.channel, opts.subject?.trim() || null, body, text]
  );
  await touchThreads([{ threadId: thread.threadId, preview: previewOf(text), direction: 'inbound' }]);
  await notifyAdmins(opts.subscriber, thread, text);
  return toMessage({ ...res.rows[0], sender_first: opts.subscriber.firstName, sender_last: opts.subscriber.lastName });
}

/** Emails the admins that a subscriber wrote in; replying to that email answers the subscriber. */
async function notifyAdmins(from: SubscriberRow, thread: ThreadRef, text: string) {
  if (!emailProvider()) return;
  const override = adminNotifyOverride();
  const admins: { email: string; token: string | null }[] = override.length
    ? override.map((email) => ({ email, token: null }))
    : (
        await query(`SELECT email, unsubscribe_token FROM users WHERE role = 'admin' AND status = 'active' AND email_notifications`)
      ).rows.map((r) => ({ email: r.email as string, token: r.unsubscribe_token as string }));
  if (!admins.length) return;

  const name = `${from.firstName} ${from.lastName}`.trim() || from.email;
  // Replying to the alert: with reply sync it lands back in the thread; otherwise it goes straight to the student.
  const synced = configuredReplyTo(thread.replyToken);
  const replyTo = synced?.synced ? synced.address : from.email;
  const bodyHtml = `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(from.email)}, ${escapeHtml(from.tierName)}) sent a message:</p>
<blockquote style="margin:12px 0;padding:10px 14px;border-left:3px solid #1d4ed8;background:#f8fafc;color:#111827;">${textToHtml(text)}</blockquote>
<p style="color:#6b7280;font-size:13px;">${
    synced?.synced
      ? 'Reply to this email to answer them (your reply is saved in the conversation), or open it below.'
      : 'Replying to this email writes to them directly by email; to keep the reply in their AshPhys inbox, answer from the conversation below.'
  }</p>`;
  await inBatches(admins, 5, async (a) => {
    const { html, text: plain } = buildEmail({
      bodyHtml,
      action: { href: `${siteUrl()}/admin/messages?s=${from.id}`, label: 'Open the conversation' },
      reason: "You're receiving this because you're an AshPhys admin",
      unsubscribeToken: a.token,
      replyMarker: Boolean(synced?.synced),
    });
    await sendMail({
      to: a.email,
      subject: `New message from ${name}`,
      html,
      text: plain,
      replyTo,
      headers: a.token ? unsubscribeHeaders(a.token) : undefined,
    });
  });
}

// ---------------------------------------------------------------- drafts

function toDraft(r: any, people: Map<string, { name: string; email: string }>): DraftDTO {
  return {
    id: r.id,
    kind: r.kind,
    subscriberId: r.subscriber_id,
    recipients: (r.recipient_ids as string[]).filter((id) => people.has(id)).map((id) => ({ id, ...people.get(id)! })),
    filters: r.filters ?? {},
    subject: r.subject,
    body: r.body,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

async function peopleFor(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; email: string }>();
  const res = await query(`SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1::uuid[])`, [ids]);
  return new Map(res.rows.map((r) => [r.id as string, { name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(), email: r.email as string }]));
}

export async function listDrafts(adminId: string): Promise<DraftDTO[]> {
  const res = await query(
    `SELECT * FROM message_drafts WHERE admin_id = $1 AND kind IN ('compose', 'bulk') ORDER BY updated_at DESC LIMIT 50`,
    [adminId]
  );
  const people = await peopleFor(Array.from(new Set(res.rows.flatMap((r) => r.recipient_ids as string[]))));
  return res.rows.map((r) => toDraft(r, people));
}

export async function getReplyDraft(adminId: string, subscriberId: string): Promise<DraftDTO | null> {
  const res = await query(`SELECT * FROM message_drafts WHERE admin_id = $1 AND kind = 'reply' AND subscriber_id = $2`, [adminId, subscriberId]);
  return res.rows[0] ? toDraft(res.rows[0], new Map()) : null;
}

export async function saveDraft(
  adminId: string,
  d: { id?: string | null; kind: 'compose' | 'bulk' | 'reply'; subscriberId?: string | null; recipientIds?: string[]; filters?: Record<string, unknown>; subject?: string; body?: string }
): Promise<string> {
  const body = sanitizeMessageHtml(d.body ?? '');
  const subject = (d.subject ?? '').slice(0, 300);
  if (d.kind === 'reply') {
    const res = await query(
      `INSERT INTO message_drafts (admin_id, kind, subscriber_id, subject, body) VALUES ($1, 'reply', $2, $3, $4)
       ON CONFLICT (admin_id, subscriber_id) WHERE kind = 'reply' DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, updated_at = now()
       RETURNING id`,
      [adminId, d.subscriberId, subject, body]
    );
    return res.rows[0].id;
  }
  if (d.id) {
    const res = await query(
      `UPDATE message_drafts SET recipient_ids = $3::uuid[], filters = $4::jsonb, subject = $5, body = $6, updated_at = now()
       WHERE id = $1 AND admin_id = $2 RETURNING id`,
      [d.id, adminId, d.recipientIds ?? [], JSON.stringify(d.filters ?? {}), subject, body]
    );
    if (res.rows[0]) return res.rows[0].id;
  }
  const res = await query(
    `INSERT INTO message_drafts (admin_id, kind, recipient_ids, filters, subject, body) VALUES ($1, $2, $3::uuid[], $4::jsonb, $5, $6) RETURNING id`,
    [adminId, d.kind, d.recipientIds ?? [], JSON.stringify(d.filters ?? {}), subject, body]
  );
  return res.rows[0].id;
}

export async function deleteDraft(adminId: string, id: string) {
  await query(`DELETE FROM message_drafts WHERE id = $1 AND admin_id = $2`, [id, adminId]);
}

export async function deleteReplyDraft(adminId: string, subscriberId: string) {
  await query(`DELETE FROM message_drafts WHERE admin_id = $1 AND kind = 'reply' AND subscriber_id = $2`, [adminId, subscriberId]);
}

// ---------------------------------------------------------------- templates

function toTemplate(r: any): TemplateDTO {
  return { id: r.id, slug: r.slug, name: r.name, category: r.category, subject: r.subject, body: r.body };
}

export async function listTemplates(): Promise<TemplateDTO[]> {
  const res = await query(`SELECT * FROM message_templates ORDER BY category, name`);
  return res.rows.map(toTemplate);
}

export async function getTemplate(id: string): Promise<TemplateDTO | null> {
  const res = await query(`SELECT * FROM message_templates WHERE id = $1`, [id]);
  return res.rows[0] ? toTemplate(res.rows[0]) : null;
}

export async function createTemplate(adminId: string, t: { name: string; category?: string; subject: string; body: string }) {
  const res = await query(
    `INSERT INTO message_templates (name, category, subject, body, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [t.name.trim(), t.category?.trim() || 'general', t.subject, sanitizeMessageHtml(t.body), adminId]
  );
  return toTemplate(res.rows[0]);
}

export async function updateTemplate(id: string, t: { name: string; category?: string; subject: string; body: string }) {
  const res = await query(
    `UPDATE message_templates SET name = $2, category = $3, subject = $4, body = $5, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, t.name.trim(), t.category?.trim() || 'general', t.subject, sanitizeMessageHtml(t.body)]
  );
  return res.rows[0] ? toTemplate(res.rows[0]) : null;
}

export async function deleteTemplate(id: string) {
  await query(`DELETE FROM message_templates WHERE id = $1`, [id]);
}

// ---------------------------------------------------------------- bulk sends

export async function createBulkSend(adminId: string, b: { subject: string; body: string; filters: RecipientFilters; label: string; templateId?: string | null; recipientCount: number }) {
  const res = await query(
    `INSERT INTO bulk_sends (admin_id, subject, body_html, filters, template_id, recipient_count) VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING id`,
    [adminId, b.subject, sanitizeMessageHtml(b.body), JSON.stringify({ ...b.filters, label: b.label }), b.templateId ?? null, b.recipientCount]
  );
  return res.rows[0].id as string;
}

export async function finishBulkSend(id: string, emailed: number) {
  await query(`UPDATE bulk_sends SET emailed_count = $2 WHERE id = $1`, [id, emailed]);
}

export async function listBulkSends(limit = 20): Promise<BulkSendDTO[]> {
  const res = await query(`SELECT * FROM bulk_sends ORDER BY created_at DESC LIMIT $1`, [limit]);
  return res.rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    filtersLabel: r.filters?.label ?? '',
    recipientCount: r.recipient_count,
    emailedCount: r.emailed_count,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// ---------------------------------------------------------------- preferences

export async function setEmailNotifications(userId: string, on: boolean) {
  await query(
    `UPDATE users SET email_notifications = $2, unsubscribed_at = CASE WHEN $2 THEN NULL ELSE now() END WHERE id = $1`,
    [userId, on]
  );
}

export async function userByUnsubscribeToken(token: string) {
  const res = await query(`SELECT id, email, first_name, email_notifications FROM users WHERE unsubscribe_token = $1`, [token]);
  return res.rows[0] ?? null;
}
