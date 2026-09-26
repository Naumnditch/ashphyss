'use client';

import { useState } from 'react';
import type { MessageDTO } from '@/lib/messaging/types';
import { formatMessageTime } from '@/lib/messaging/time';
import { MailIcon } from './MailIcons';

/**
 * One message in a conversation. `viewer` decides which side is "mine":
 * the admin sees their own (outbound) messages on the right; a student sees
 * theirs (inbound) on the right.
 */
export function MessageItem({
  message,
  viewer,
  now,
  onRetryEmail,
}: {
  message: MessageDTO;
  viewer: 'admin' | 'subscriber';
  now?: number;
  onRetryEmail?: (messageId: string) => Promise<unknown>;
}) {
  const mine = viewer === 'admin' ? message.direction === 'outbound' : message.direction === 'inbound';
  const author = message.direction === 'outbound' ? (viewer === 'admin' ? message.senderName ?? 'AshPhys' : 'AshPhys') : viewer === 'admin' ? message.senderName ?? 'Student' : 'You';

  return (
    <article id={`m-${message.id}`} className={`flex scroll-mt-4 ${mine ? 'justify-end' : 'justify-start'}`} aria-label={`Message from ${author}`}>
      <div className={`max-w-[88%] sm:max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl border px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
            mine ? 'rounded-br-md border-blue-100 bg-blue-50/70 text-gray-900' : 'rounded-bl-md border-gray-200 bg-white text-gray-900'
          }`}
        >
          {message.subject && <p className="mb-1.5 text-sm font-semibold text-gray-900">{message.subject}</p>}
          <div className="message-body" dangerouslySetInnerHTML={{ __html: message.body }} />
        </div>
        <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px] text-gray-500 ${mine ? 'justify-end' : ''}`}>
          <span className="font-medium text-gray-600">{author}</span>
          <time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString('en-GB')}>
            {formatMessageTime(message.createdAt, now)}
          </time>
          {message.bulk && viewer === 'admin' && <span className="rounded bg-violet-100 px-1.5 py-px font-medium text-violet-700">Bulk</span>}
          {message.channel === 'email' && message.direction === 'inbound' && (
            <span className="inline-flex items-center gap-1">
              <MailIcon name="mail" className="w-3 h-3" /> by email
            </span>
          )}
          {message.direction === 'outbound' && viewer === 'admin' && <DeliveryStatus message={message} now={now} onRetry={onRetryEmail} />}
          {message.direction === 'inbound' && viewer === 'subscriber' && message.readAt && <span>Seen</span>}
        </div>
      </div>
    </article>
  );
}

/** Where an outgoing message has got to: read on-site, opened in email, emailed, retrying, or on-site only. */
export function DeliveryStatus({ message, now, onRetry }: { message: MessageDTO; now?: number; onRetry?: (id: string) => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const retryButton =
    onRetry && (
      <button
        type="button"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true);
          setRetryError(null);
          try {
            await onRetry(message.id);
          } catch (err) {
            setRetryError((err as Error).message);
          } finally {
            setRetrying(false);
          }
        }}
        className="rounded border border-current px-1.5 py-px font-semibold hover:bg-white disabled:opacity-50"
      >
        {retrying ? 'Retrying…' : 'Retry now'}
      </button>
    );
  const err = retryError && <span className="text-red-600">{retryError}</span>;

  if (message.readAt) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-blue-700" title={`Read on AshPhys ${formatMessageTime(message.readAt, now)}`}>
        <MailIcon name="checks" className="w-3.5 h-3.5" /> Read
      </span>
    );
  }
  if (message.emailOpenedAt) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-blue-700" title={`Email opened ${formatMessageTime(message.emailOpenedAt, now)} (opens are approximate: some mail apps load images automatically)`}>
        <MailIcon name="eye" className="w-3.5 h-3.5" /> Opened in email
      </span>
    );
  }
  switch (message.emailStatus) {
    case 'sent':
      return (
        <span
          className="inline-flex items-center gap-1"
          title={`Delivered on AshPhys and emailed${message.emailSentAt ? ` ${formatMessageTime(message.emailSentAt, now)}` : ''}; not read yet`}
        >
          <MailIcon name="checks" className="w-3.5 h-3.5" /> Emailed
        </span>
      );
    case 'pending':
      return <span>Emailing…</span>;
    case 'failed':
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-amber-700" title={message.emailError ?? 'The email service rejected it'}>
          <MailIcon name="alert" className="w-3.5 h-3.5" />
          {message.emailNextAttemptAt
            ? `Email failed · retrying ${formatMessageTime(message.emailNextAttemptAt, now).replace(/^Today /, 'at ')}`
            : 'Email failed · on AshPhys only'}
          {retryButton}
          {err}
        </span>
      );
    default: {
      const reason = message.emailError ?? '';
      const label = /^Unsubscribed/.test(reason)
        ? 'On AshPhys (unsubscribed from email)'
        : /^Invalid email address/.test(reason)
          ? 'On AshPhys (invalid email address)'
          : 'Delivered on AshPhys';
      const fixable = /^Invalid email address|^No email provider/.test(reason);
      return (
        <span className={`inline-flex flex-wrap items-center gap-1.5 ${/^Invalid/.test(reason) ? 'text-amber-700' : ''}`} title={reason || 'Delivered to their AshPhys inbox'}>
          <MailIcon name="check" className="w-3.5 h-3.5" />
          {label}
          {fixable && onRetry && /^Invalid/.test(reason) && retryButton}
          {err}
        </span>
      );
    }
  }
}
