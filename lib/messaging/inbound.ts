/**
 * Reading emailed replies that come back through an inbound-email webhook.
 * Providers post different shapes; normalizeInbound() accepts the common
 * ones: SendGrid Inbound Parse (multipart form), Mailgun routes (form),
 * Postmark (JSON), a {data:{…}} event envelope, and a plain
 * {from,to,subject,text} (e.g. from a Cloudflare Email Worker).
 */

import { htmlToText } from './html';
import { REPLY_MARKER } from './emailLayout';

export interface InboundEmail {
  from: string;
  fromName?: string;
  recipients: string[];
  subject: string;
  text: string;
}

const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function emailsIn(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(emailsIn);
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return emailsIn(o.email ?? o.Email ?? o.address ?? o.to ?? '');
  }
  return String(value).match(EMAIL_RE) ?? [];
}

function str(...values: unknown[]): string {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v;
  return '';
}

function nameIn(from: unknown): string | undefined {
  if (typeof from === 'string') {
    const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
    return m?.[1].trim() || undefined;
  }
  if (from && typeof from === 'object') {
    const n = (from as Record<string, unknown>).name ?? (from as Record<string, unknown>).Name;
    return typeof n === 'string' && n.trim() ? n.trim() : undefined;
  }
  return undefined;
}

export function normalizeInbound(raw: Record<string, unknown>): InboundEmail | null {
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;

  let envelope: Record<string, unknown> = {};
  if (typeof data.envelope === 'string') {
    try {
      envelope = JSON.parse(data.envelope);
    } catch {
      /* not JSON */
    }
  } else if (data.envelope && typeof data.envelope === 'object') envelope = data.envelope as Record<string, unknown>;

  const fromRaw = data.from ?? data.From ?? data.FromFull ?? data.sender ?? envelope.from;
  const from = emailsIn(data.FromFull ?? fromRaw)[0];
  if (!from) return null;

  const recipients = Array.from(
    new Set(
      [data.to, data.To, data.ToFull, data.cc, data.Cc, data.recipient, data.OriginalRecipient, envelope.to, data['Delivered-To']]
        .flatMap(emailsIn)
        .map((e) => e.toLowerCase())
    )
  );

  const text =
    str(data['stripped-text'], data.StrippedTextReply, data.text, data.TextBody, data['body-plain'], data.plain) ||
    htmlToText(str(data.html, data.HtmlBody, data['body-html'], data['stripped-html']));

  return {
    from: from.toLowerCase(),
    fromName: nameIn(fromRaw),
    recipients,
    subject: str(data.subject, data.Subject).trim(),
    text,
  };
}

/** The thread token from a plus-addressed reply address (messages+<token>@…). */
export function replyTokenFrom(recipients: string[]): string | null {
  for (const r of recipients) {
    const m = r.match(/\+([a-f0-9]{32})@/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/** Keeps only what the person wrote: drops the quoted original and signatures' reply headers. */
export function stripQuotedReply(text: string): string {
  let t = text.replace(/\r\n?/g, '\n');
  const cuts = [
    t.indexOf(REPLY_MARKER),
    t.search(/^[ \t]*On\b[^\n]*(\n[^\n]*){0,2}?\bwrote:[ \t]*$/m),
    t.search(/^[ \t]*-{2,}\s*Original Message\s*-{2,}/im),
    t.search(/^[ \t]*_{8,}\s*\n[ \t]*From:/m),
    t.search(/^[ \t]*From:\s.*\n[ \t]*(Sent|Date):\s/m),
  ].filter((i) => i >= 0);
  if (cuts.length) t = t.slice(0, Math.min(...cuts));
  // Trailing quoted lines ("> …") and blank lines.
  const lines = t.split('\n');
  while (lines.length && (/^\s*>/.test(lines[lines.length - 1]) || !lines[lines.length - 1].trim())) lines.pop();
  return lines.join('\n').trim().slice(0, 20000);
}
