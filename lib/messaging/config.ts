/**
 * Email settings, all from env vars so the provider can be switched without
 * a code change:
 *
 *   EMAIL_PROVIDER        resend | sendgrid | smtp (optional; otherwise the first configured one below)
 *   RESEND_API_KEY        Resend
 *   SENDGRID_API_KEY      SendGrid
 *   SMTP_HOST/PORT/USER/PASS   any SMTP server, e.g. Gmail with an app password
 *   MAIL_FROM             "AshPhys <messages@ashphys.org>" (falls back to SMTP_FROM)
 *   MAIL_REPLY_TO         where students' email replies go. Optional: without it, replies go
 *                         to the admin's own email address (ADMIN_NOTIFY_EMAIL or the admin
 *                         account's email), to read and answer by hand.
 *   MAIL_INBOUND_SECRET   with MAIL_REPLY_TO, turns on reply sync: each email's Reply-To is
 *                         plus-addressed (messages+<thread token>@…) and the inbound webhook
 *                         (?secret=…) files the reply in the right conversation.
 *   MAIL_VALIDATE_DNS     'off' skips the domain check before sending (see validateEmail.ts)
 *   CRON_SECRET           bearer token for /api/cron/email-retry (automatic retries)
 *   ADMIN_NOTIFY_EMAIL    where "a student replied" alerts go (comma-separated; defaults to every admin)
 *   MAIL_POSTAL_ADDRESS   physical postal address printed in every email's footer (CAN-SPAM)
 */

export type EmailProvider = 'resend' | 'sendgrid' | 'smtp';

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailProvider(): EmailProvider | null {
  const chosen = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (chosen === 'resend') return process.env.RESEND_API_KEY ? 'resend' : null;
  if (chosen === 'sendgrid') return process.env.SENDGRID_API_KEY ? 'sendgrid' : null;
  if (chosen === 'smtp' || chosen === 'nodemailer' || chosen === 'gmail') return smtpConfigured() ? 'smtp' : null;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (smtpConfigured()) return 'smtp';
  return null;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.ashphys.org').replace(/\/+$/, '');
}

export function mailFrom(): string {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'AshPhys <messages@ashphys.org>';
}

/** messages@reply.ashphys.org + token → messages+token@reply.ashphys.org */
export function replyAddress(token: string): string | null {
  const base = process.env.MAIL_REPLY_TO?.trim();
  if (!base) return null;
  const m = base.match(/^(.*<)?\s*([^@<>\s]+)@([^@<>\s]+?)\s*(>)?$/);
  if (!m) return null;
  const local = m[2].split('+')[0];
  return `${local}+${token}@${m[3]}`;
}

/**
 * The Reply-To for an email in a thread, from env vars alone: a synced
 * plus-address when reply sync is on, the plain reply inbox when only
 * MAIL_REPLY_TO is set, or null (the caller then falls back to the admin).
 */
export function configuredReplyTo(token: string): { address: string; synced: boolean } | null {
  const base = process.env.MAIL_REPLY_TO?.trim();
  if (!base) return null;
  if (inboundConfigured()) {
    const plus = replyAddress(token);
    if (plus) return { address: plus, synced: true };
  }
  const m = base.match(/<([^>]+)>/);
  return { address: (m ? m[1] : base).trim(), synced: false };
}

export function inboundConfigured(): boolean {
  return Boolean(process.env.MAIL_INBOUND_SECRET && process.env.MAIL_REPLY_TO);
}

export function postalAddress(): string {
  return process.env.MAIL_POSTAL_ADDRESS?.trim() || 'AshPhys';
}

export function adminNotifyOverride(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface EmailStatusSummary {
  provider: EmailProvider | null;
  from: string;
  replySync: boolean;
  /** Where students' email replies land (null: nowhere yet). */
  replyTo: string | null;
  postalAddressSet: boolean;
  autoRetry: boolean;
}

/** `adminEmail` is the fallback Reply-To when MAIL_REPLY_TO isn't set. */
export function emailStatusSummary(adminEmail: string | null = null): EmailStatusSummary {
  const configured = process.env.MAIL_REPLY_TO?.trim();
  return {
    provider: emailProvider(),
    from: mailFrom(),
    replySync: inboundConfigured(),
    replyTo: configured ? configured.replace(/^.*<([^>]+)>.*$/, '$1') : adminNotifyOverride()[0] ?? adminEmail,
    postalAddressSet: Boolean(process.env.MAIL_POSTAL_ADDRESS?.trim()),
    autoRetry: Boolean(process.env.CRON_SECRET),
  };
}
