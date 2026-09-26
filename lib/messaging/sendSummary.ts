/**
 * Turns a send's per-recipient email outcomes into the notice the admin
 * sees: plain success, or a warning that the on-site message went through
 * but some emails didn't (and whether they'll be retried).
 */

import type { EmailStatus } from './types';

export interface EmailProblem {
  name: string;
  status: EmailStatus;
  error: string | null;
  retryAt: string | null;
}

export interface SendSummary {
  recipients: number;
  emailed: number;
  /** Every recipient whose email wasn't sent (any reason). */
  problems: EmailProblem[];
  firstSubscriberId?: string;
}

export interface SendNotice {
  tone: 'ok' | 'warn';
  title: string;
  detail?: string;
}

const NO_PROVIDER = 'No email provider configured';
const UNSUBSCRIBED = 'Unsubscribed from emails';

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

function reasonOf(p: EmailProblem): string {
  const e = (p.error ?? '').replace(/\s*\((not retried|gave up)[^)]*\)\s*$/, '');
  if (/^Invalid email address/.test(e)) return 'invalid email address';
  return e || 'email failed';
}

export function summarizeSend(s: SendSummary, providerConfigured: boolean, formatTime: (iso: string) => string): SendNotice {
  const noProvider = !providerConfigured || s.problems.some((p) => p.error === NO_PROVIDER);
  const unsubscribed = s.problems.filter((p) => p.error === UNSUBSCRIBED);
  const real = s.problems.filter((p) => p.error !== NO_PROVIDER && p.error !== UNSUBSCRIBED);
  const who = s.recipients === 1 && s.problems[0] ? s.problems[0].name : people(s.recipients);

  if (noProvider) {
    return { tone: 'ok', title: `Sent to ${who} on AshPhys`, detail: "Email isn't set up yet, so it wasn't emailed." };
  }
  if (!real.length) {
    const unsub = unsubscribed.length ? ` · ${unsubscribed.length} on AshPhys only (unsubscribed from email)` : '';
    return { tone: 'ok', title: `Sent to ${people(s.recipients)} · ${s.emailed} emailed${unsub}` };
  }

  const retrying = real.filter((p) => p.retryAt);
  const notRetrying = real.filter((p) => !p.retryAt);
  const parts: string[] = [];
  if (retrying.length === 1) parts.push(`Email to ${retrying[0].name} failed (${reasonOf(retrying[0])}); retrying automatically at ${formatTime(retrying[0].retryAt!)}.`);
  else if (retrying.length > 1) parts.push(`Email failed for ${retrying.length} people; retrying automatically.`);
  if (notRetrying.length === 1) parts.push(`Couldn't email ${notRetrying[0].name}: ${reasonOf(notRetrying[0])}.`);
  else if (notRetrying.length > 1)
    parts.push(`Couldn't email ${notRetrying.length} people: ${Array.from(new Set(notRetrying.map(reasonOf))).join('; ')}.`);

  return {
    tone: 'warn',
    title: s.recipients === 1 ? 'Delivered on AshPhys, but not by email yet' : `Delivered on AshPhys to ${people(s.recipients)} · ${s.emailed} emailed`,
    detail: parts.join(' '),
  };
}
