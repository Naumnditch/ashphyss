'use client';

/**
 * The line under "Messages" saying how email is set up, opening into a
 * panel with the details, recent delivery numbers, setup steps when email
 * isn't configured, and a "Send test email" button.
 */

import { useState } from 'react';
import type { EmailStatusSummary } from '@/lib/messaging/config';
import { api } from './api';
import { MailIcon } from './MailIcons';

export interface DeliveryStats {
  sent30d: number;
  retrying: number;
  gaveUp: number;
  sending: number;
}

const PROVIDER_NAME = { resend: 'Resend', sendgrid: 'SendGrid', smtp: 'SMTP' } as const;

interface TestResult {
  to: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

export function EmailSettingsPanel({ email, stats }: { email: EmailStatusSummary; stats: DeliveryStats }) {
  const [open, setOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const ok = Boolean(email.provider);
  const problems = stats.retrying + stats.gaveUp;

  const sendTest = async () => {
    setTesting(true);
    setTest(null);
    setTestError(null);
    try {
      setTest(await api<TestResult>('/api/messages/test-email', { method: 'POST', json: { to: testTo.trim() || undefined } }));
    } catch (err) {
      setTestError((err as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const dot = !ok ? 'bg-amber-500' : problems ? 'bg-amber-500' : 'bg-emerald-500';
  const line = !ok
    ? 'On-site delivery only · email not set up yet'
    : `Email via ${PROVIDER_NAME[email.provider!]}${problems ? ` · ${stats.retrying ? `${stats.retrying} retrying` : ''}${stats.retrying && stats.gaveUp ? ', ' : ''}${stats.gaveUp ? `${stats.gaveUp} failed` : ''}` : ' · working'}`;

  return (
    <div className="mt-0.5 text-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-left text-gray-500 hover:text-gray-800">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        {line}
        <MailIcon name="chevronDown" className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 max-w-2xl space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-[13px] leading-relaxed text-gray-600 shadow-sm">
          <dl className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-gray-400">Email service</dt>
            <dd className={ok ? 'text-gray-900' : 'font-medium text-amber-700'}>{ok ? PROVIDER_NAME[email.provider!] : 'Not set up'}</dd>
            <dt className="text-gray-400">Sent from</dt>
            <dd className="break-all text-gray-900">{email.from}</dd>
            <dt className="text-gray-400">Replies go to</dt>
            <dd className="text-gray-900">
              {email.replyTo ? <span className="break-all">{email.replyTo}</span> : 'Nowhere yet'}
              <span className="text-gray-500">{email.replySync ? ' (synced into this mailbox)' : ' (your inbox; answer by hand or here)'}</span>
            </dd>
            <dt className="text-gray-400">Failed emails</dt>
            <dd className="text-gray-900">{email.autoRetry ? 'Retried automatically for up to a day' : 'Retry by hand (automatic retries not configured)'}</dd>
            <dt className="text-gray-400">Footer address</dt>
            <dd className={email.postalAddressSet ? 'text-gray-900' : 'text-amber-700'}>{email.postalAddressSet ? 'Set' : 'Missing: add MAIL_POSTAL_ADDRESS (CAN-SPAM)'}</dd>
          </dl>

          {ok && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Emailed (30 days)', stats.sent30d, 'text-gray-900'],
                ['Retrying', stats.retrying, stats.retrying ? 'text-amber-700' : 'text-gray-900'],
                ['Failed', stats.gaveUp, stats.gaveUp ? 'text-red-600' : 'text-gray-900'],
              ].map(([label, n, cls]) => (
                <div key={label as string} className="rounded-lg bg-gray-50 px-2 py-2">
                  <p className={`text-lg font-semibold tabular-nums ${cls}`}>{n as number}</p>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">{label as string}</p>
                </div>
              ))}
            </div>
          )}

          {!ok && (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Create a free <strong>Resend</strong> account and an API key (or use SendGrid, or Gmail with an app password).
              </li>
              <li>
                In Vercel → Settings → Environment Variables add <code className="rounded bg-gray-100 px-1">RESEND_API_KEY</code>,{' '}
                <code className="rounded bg-gray-100 px-1">MAIL_FROM</code> (e.g. AshPhys &lt;messages@ashphys.org&gt;) and{' '}
                <code className="rounded bg-gray-100 px-1">MAIL_POSTAL_ADDRESS</code>, then redeploy.
              </li>
              <li>Verify ashphys.org in Resend (DNS records), then press “Send test email” here.</li>
            </ol>
          )}

          <div className="border-t border-gray-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Your email (leave blank for your account email)"
                aria-label="Send the test email to"
                className="min-w-[14rem] flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[13px] focus:border-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <MailIcon name="send" className="h-3.5 w-3.5" />
                {testing ? 'Sending…' : 'Send test email'}
              </button>
            </div>
            {test && (
              <p role="status" className={`mt-2 ${test.status === 'sent' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {test.status === 'sent' ? `Sent to ${test.to}. Check that inbox (and its spam folder).` : `Not sent to ${test.to}: ${test.error ?? 'unknown error'}`}
              </p>
            )}
            {testError && <p className="mt-2 text-red-600">{testError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
