/**
 * One sendMail() over three providers (Resend, SendGrid, SMTP/Nodemailer),
 * picked by env vars (see config.ts). Never throws: callers record the
 * outcome on the message. A failure is marked `permanent` when retrying
 * the same email can't help (the provider rejected the address or the
 * message); everything else (timeouts, rate limits, outages, a wrong API
 * key that may be fixed later) is worth retrying.
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
  /** Retrying won't help (bad address, rejected content). */
  permanent?: boolean;
  /** The provider's id for the email, for looking it up in their dashboard. */
  providerId?: string;
}

const TIMEOUT_MS = 12_000;

/** "AshPhys <a@b.c>" → { name: 'AshPhys', email: 'a@b.c' } */
export function parseAddress(s: string): { name?: string; email: string } {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return { email: s.trim() };
}

class SendError extends Error {
  constructor(message: string, readonly permanent: boolean) {
    super(message);
  }
}

/**
 * HTTP APIs: 400/404/422 mean the request itself is bad (usually the
 * recipient); 401/403 are credentials, which get fixed, so they retry;
 * 408/429/5xx are transient.
 */
export function httpFailureIsPermanent(status: number): boolean {
  return status === 400 || status === 404 || status === 413 || status === 422;
}

/** SMTP: 5xx replies are permanent except authentication/relay problems (530, 535, 554 policy blocks retry). */
export function smtpFailureIsPermanent(responseCode: number | undefined): boolean {
  if (!responseCode) return false;
  if (responseCode === 530 || responseCode === 535 || responseCode === 554) return false;
  return responseCode >= 500 && responseCode < 600;
}

async function httpSend(url: string, apiKey: string | undefined, body: unknown, label: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new SendError(`${label}: ${(err as Error).name === 'TimeoutError' ? 'timed out' : (err as Error).message}`, false);
  }
  if (!res.ok) throw new SendError(`${label} ${res.status}: ${(await res.text()).slice(0, 300)}`, httpFailureIsPermanent(res.status));
  return res;
}

async function sendResend(mail: OutgoingEmail): Promise<string | undefined> {
  const res = await httpSend(
    'https://api.resend.com/emails',
    process.env.RESEND_API_KEY,
    {
      from: mailFrom(),
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
    },
    'Resend'
  );
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return data.id;
}

async function sendSendGrid(mail: OutgoingEmail): Promise<string | undefined> {
  const from = parseAddress(mailFrom());
  const res = await httpSend(
    'https://api.sendgrid.com/v3/mail/send',
    process.env.SENDGRID_API_KEY,
    {
      personalizations: [{ to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }] }],
      from,
      ...(mail.replyTo ? { reply_to: { email: mail.replyTo } } : {}),
      subject: mail.subject,
      content: [
        { type: 'text/plain', value: mail.text },
        { type: 'text/html', value: mail.html },
      ],
      ...(mail.headers ? { headers: mail.headers } : {}),
    },
    'SendGrid'
  );
  return res.headers.get('x-message-id') ?? undefined;
}

let transporter: nodemailer.Transporter | null = null;

async function sendSmtp(mail: OutgoingEmail): Promise<string | undefined> {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      to: mail.toName ? { name: mail.toName, address: mail.to } : mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
    });
    return info.messageId;
  } catch (err) {
    const e = err as Error & { responseCode?: number };
    throw new SendError(`SMTP: ${e.message}`, smtpFailureIsPermanent(e.responseCode));
  }
}

export async function sendMail(mail: OutgoingEmail): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) return { status: 'skipped', provider: null, error: 'No email provider configured' };
  try {
    const providerId =
      provider === 'resend' ? await sendResend(mail) : provider === 'sendgrid' ? await sendSendGrid(mail) : await sendSmtp(mail);
    return { status: 'sent', provider, providerId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const permanent = err instanceof SendError ? err.permanent : false;
    console.error(`sendMail (${provider}) to ${mail.to} failed${permanent ? ' permanently' : ''}:`, error);
    return { status: 'failed', provider, error: error.slice(0, 500), permanent };
  }
}
