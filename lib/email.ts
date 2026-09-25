/**
 * Email sending helper for one-off transactional mail (password resets).
 *
 * Goes through the same provider switch as the mailbox (lib/messaging:
 * Resend, SendGrid or SMTP, chosen by env vars). If none is configured,
 * sendEmail returns { sent: false } instead of throwing - callers use this
 * to fall back to displaying the content directly (e.g. showing a password
 * reset link on-screen) rather than pretending an email went out when it
 * didn't.
 */

import { emailProvider } from '@/lib/messaging/config';
import { htmlToText } from '@/lib/messaging/html';
import { sendMail } from '@/lib/messaging/mailer';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return emailProvider() !== null;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    console.warn('sendEmail: no email provider configured, skipping send to', to);
    return { sent: false };
  }
  const result = await sendMail({ to, subject, html, text: htmlToText(html) });
  return { sent: result.status === 'sent' };
}
