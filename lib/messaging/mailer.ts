/**
 * One sendMail() over three providers (Resend, SendGrid, SMTP/Nodemailer),
 * picked by env vars (see config.ts). Never throws: callers record the
 * outcome on the message ('sent' | 'failed' | 'skipped').
 */

import nodemailer from 'nodemailer';
import { emailProvider, mailFrom, type EmailProvider } from './config';

export interface OutgoingEmail {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
}

export interface SendResult {
  status: 'sent' | 'failed' | 'skipped';
  provider: EmailProvider | null;
  error?: string;
}

/** "AshPhys <a@b.c>" → { name: 'AshPhys', email: 'a@b.c' } */
export function parseAddress(s: string): { name?: string; email: string } {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return { email: s.trim() };
}

async function sendResend(mail: OutgoingEmail): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mailFrom(),
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendSendGrid(mail: OutgoingEmail): Promise<void> {
  const from = parseAddress(mailFrom());
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }] }],
      from,
      ...(mail.replyTo ? { reply_to: { email: mail.replyTo } } : {}),
      subject: mail.subject,
      content: [
        { type: 'text/plain', value: mail.text },
        { type: 'text/html', value: mail.html },
      ],
      ...(mail.headers ? { headers: mail.headers } : {}),
    }),
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

let transporter: nodemailer.Transporter | null = null;

async function sendSmtp(mail: OutgoingEmail): Promise<void> {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: mailFrom(),
    to: mail.toName ? { name: mail.toName, address: mail.to } : mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    ...(mail.headers ? { headers: mail.headers } : {}),
  });
}

export async function sendMail(mail: OutgoingEmail): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) return { status: 'skipped', provider: null, error: 'No email provider configured' };
  try {
    if (provider === 'resend') await sendResend(mail);
    else if (provider === 'sendgrid') await sendSendGrid(mail);
    else await sendSmtp(mail);
    return { status: 'sent', provider };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`sendMail (${provider}) to ${mail.to} failed:`, error);
    return { status: 'failed', provider, error: error.slice(0, 500) };
  }
}
