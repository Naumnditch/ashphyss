/**
 * Email settings, all from env vars so the provider can be switched without
 * a code change:
 *
 *   EMAIL_PROVIDER        resend | sendgrid | smtp (optional; otherwise the first configured one below)
 *   RESEND_API_KEY        Resend
 *   SENDGRID_API_KEY      SendGrid
 *   SMTP_HOST/PORT/USER/PASS   any SMTP server, e.g. Gmail with an app password
 *   MAIL_FROM             "AshPhys <messages@ashphys.org>" (falls back to SMTP_FROM)
 *   MAIL_REPLY_TO         the dedicated inbox replies go to, e.g. messages@reply.ashphys.org.
 *                         Each email's Reply-To is plus-addressed (messages+<thread token>@…)
 *                         so an inbound webhook can file the reply in the right conversation.
 *   MAIL_INBOUND_SECRET   shared secret the inbound webhook URL must carry (?secret=…)
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
  postalAddressSet: boolean;
}

export function emailStatusSummary(): EmailStatusSummary {
  return {
    provider: emailProvider(),
    from: mailFrom(),
    replySync: inboundConfigured(),
    postalAddressSet: Boolean(process.env.MAIL_POSTAL_ADDRESS?.trim()),
  };
}
