/**
 * The email wrapped around a mailbox message: a plain, readable layout
 * (inline styles only, as mail clients need), a button to read and reply on
 * AshPhys, and a CAN-SPAM footer with the sender's postal address and a
 * working unsubscribe link. The same unsubscribe URL goes in the
 * List-Unsubscribe headers so mail apps can offer one-click unsubscribe.
 */

import { createHmac } from 'crypto';
import { escapeHtml, htmlToText } from './html';
import { postalAddress, siteUrl } from './config';

export const REPLY_MARKER = '— Reply above this line to answer AshPhys —';

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function oneClickUnsubscribeUrl(token: string): string {
  return `${siteUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function signingKey() {
  return process.env.JWT_SECRET || 'ashphys-messaging';
}

/** A short signature so the open-tracking pixel can't be triggered for arbitrary message ids. */
export function openSignature(messageId: string): string {
  return createHmac('sha256', signingKey()).update(`open:${messageId}`).digest('hex').slice(0, 24);
}

export function openPixelUrl(messageId: string): string {
  return `${siteUrl()}/api/messages/open/${messageId}?sig=${openSignature(messageId)}`;
}

export function unsubscribeHeaders(token: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl(token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

interface LayoutInput {
  /** Shown as a heading above the body (the message subject). */
  title?: string;
  bodyHtml: string;
  /** The button under the message. */
  action: { href: string; label: string };
  /** A short line under the button, e.g. how to reply. */
  note?: string;
  /** Why they got this email, e.g. "You have an AshPhys account". */
  reason: string;
  unsubscribeToken?: string | null;
  pixelUrl?: string | null;
  /** Show the "reply above this line" marker (only when replies are synced back). */
  replyMarker?: boolean;
}

export function buildEmail({ title, bodyHtml, action, note, reason, unsubscribeToken, pixelUrl, replyMarker }: LayoutInput): { html: string; text: string } {
  const address = postalAddress();
  const unsub = unsubscribeToken ? unsubscribeUrl(unsubscribeToken) : null;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
${replyMarker ? `<div style="display:none;max-height:0;overflow:hidden;color:#f4f5f7;font-size:1px;">${escapeHtml(REPLY_MARKER)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
<tr><td style="padding:22px 28px 8px;font-family:${font};font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1d4ed8;">AshPhys</td></tr>
${title ? `<tr><td style="padding:6px 28px 2px;font-family:${font};font-size:20px;line-height:1.35;font-weight:700;color:#111827;">${escapeHtml(title)}</td></tr>` : ''}
<tr><td style="padding:8px 28px 4px;font-family:${font};font-size:15px;line-height:1.65;color:#111827;">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px ${note ? '10px' : '26px'};font-family:${font};">
<a href="${escapeHtml(action.href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">${escapeHtml(action.label)}</a>
</td></tr>
${note ? `<tr><td style="padding:0 28px 24px;font-family:${font};font-size:13px;line-height:1.5;color:#6b7280;">${escapeHtml(note)}</td></tr>` : ''}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:16px 28px;font-family:${font};font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
${escapeHtml(reason)}.${unsub ? ` <a href="${escapeHtml(unsub)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from AshPhys emails</a>.` : ''}<br>
${escapeHtml(address)}
</td></tr>
</table>
${pixelUrl ? `<img src="${escapeHtml(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">` : ''}
</td></tr></table>
</body></html>`;

  const text = [
    replyMarker ? REPLY_MARKER : null,
    title ?? null,
    htmlToText(bodyHtml),
    `${action.label}: ${action.href}`,
    note ?? null,
    '--',
    `${reason}.`,
    unsub ? `Unsubscribe from AshPhys emails: ${unsub}` : null,
    address,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { html, text };
}
