'use client';

/** One subscriber's conversation, with their details and a reply box that autosaves. */

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { DraftDTO, MessageDTO, SubscriberDTO, TemplateDTO } from '@/lib/messaging/types';
import { formatDayHeading, formatMessageTime, sameDay } from '@/lib/messaging/time';
import { summarizeSend, type EmailProblem, type SendNotice } from '@/lib/messaging/sendSummary';
import { initials, looksBlank } from '@/lib/messaging/text';
import { api } from './api';
import { MailIcon } from './MailIcons';
import { MessageItem } from './MessageItem';
import { TierBadge } from './RecipientPicker';
import { RichTextEditor } from './RichTextEditor';
import { TemplatePicker } from './TemplatePicker';
import { SaveIndicator, useAutosave } from './useAutosave';
import { announceMessagesChanged } from './useUnreadCount';

interface ThreadResponse {
  subscriber: SubscriberDTO;
  threadId: string | null;
  messages: MessageDTO[];
  hasMore: boolean;
  draft: DraftDTO | null;
  markedRead: number;
}

type View = 'all' | 'sent' | 'received';

function replySubject(messages: MessageDTO[]): string {
  const last = [...messages].reverse().find((m) => m.subject);
  if (!last?.subject) return 'Message from AshPhys';
  return /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`;
}

export function MessageThread({
  subscriberId,
  templates,
  onTemplatesChange,
  onBack,
  onChanged,
  now,
}: {
  subscriberId: string;
  templates: TemplateDTO[];
  onTemplatesChange: (t: TemplateDTO[]) => void;
  onBack: () => void;
  onChanged: () => void;
  now: number;
}) {
  const [data, setData] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  const [subject, setSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SendNotice | null>(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const loadedFor = useRef<string | null>(null);
  // Only keep a reply draft once there is (or was) something in it.
  const draftExists = useRef(false);

  const load = useCallback(
    async (initial: boolean) => {
      try {
        const res = await api<ThreadResponse>(`/api/messages/thread/${subscriberId}?markRead=1`);
        setData((prev) => {
          // Keep older pages already loaded when polling.
          if (!initial && prev && prev.subscriber.id === res.subscriber.id && prev.messages.length > res.messages.length) {
            const ids = new Set(res.messages.map((m) => m.id));
            const older = prev.messages.filter((m) => !ids.has(m.id) && m.createdAt < (res.messages[0]?.createdAt ?? ''));
            return { ...res, messages: [...older, ...res.messages], hasMore: prev.hasMore };
          }
          return res;
        });
        if (initial) {
          draftExists.current = Boolean(res.draft);
          setSubject(res.draft?.subject || replySubject(res.messages));
          setBody(res.draft?.body ?? '');
          setEditingSubject(false);
        }
        if (res.markedRead > 0) {
          announceMessagesChanged();
          onChanged();
        }
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [subscriberId, onChanged]
  );

  useEffect(() => {
    setData(null);
    setView('all');
    setSendError(null);
    stickToBottom.current = true;
    loadedFor.current = subscriberId;
    load(true);
    const t = setInterval(() => document.visibilityState === 'visible' && load(false), 20_000);
    return () => clearInterval(t);
  }, [subscriberId, load]);

  // Follow new messages unless the reader has scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length, view]);

  const saveState = useAutosave(
    { subject, body, for: subscriberId },
    useCallback(async (v: { subject: string; body: string; for: string }) => {
      draftExists.current = true;
      await api('/api/messages/drafts', { method: 'POST', json: { kind: 'reply', subscriberId: v.for, subject: v.subject, body: v.body } });
    }, []),
    { enabled: Boolean(data) && loadedFor.current === subscriberId && !sending && (draftExists.current || !looksBlank(body)) }
  );

  const loadOlder = async () => {
    if (!data?.messages.length) return;
    setOlderLoading(true);
    try {
      const el = scroller.current;
      const before = el?.scrollHeight ?? 0;
      const res = await api<ThreadResponse>(`/api/messages/thread/${subscriberId}?before=${data.messages[0].id}`);
      stickToBottom.current = false;
      setData((d) => (d ? { ...d, messages: [...res.messages, ...d.messages], hasMore: res.hasMore } : d));
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } finally {
      setOlderLoading(false);
    }
  };

  const retryEmail = async (messageId: string) => {
    const res = await api<{ status: string; error: string | null; retryAt: string | null }>(`/api/messages/${messageId}/retry`, { method: 'POST' });
    await load(false);
    onChanged();
    return res;
  };

  const send = async () => {
    setSendError(null);
    if (looksBlank(body)) return setSendError('Write a message first.');
    if (!subject.trim()) return setSendError('Add a subject.');
    setSending(true);
    try {
      setNotice(null);
      const res = await api<{ emailed: number; emailProvider: string | null; messages: { name: string; emailStatus: EmailProblem['status']; emailError: string | null; retryAt: string | null }[] }>(
        '/api/messages/send',
        { method: 'POST', json: { recipientIds: [subscriberId], subject, body, replyDraftFor: subscriberId } }
      );
      const summary = summarizeSend(
        {
          recipients: res.messages.length,
          emailed: res.emailed,
          problems: res.messages.filter((m) => m.emailStatus !== 'sent').map((m) => ({ name: m.name, status: m.emailStatus, error: m.emailError, retryAt: m.retryAt })),
        },
        Boolean(res.emailProvider),
        (iso) => formatMessageTime(iso).replace(/^Today /, '')
      );
      // Success shows in the message's own status line; only a failed email needs calling out.
      if (summary.tone === 'warn') setNotice(summary);
      draftExists.current = false;
      setBody('');
      stickToBottom.current = true;
      await load(false);
      onChanged();
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (t: TemplateDTO) => {
    if (!looksBlank(body) && !window.confirm('Replace what you have written with this template?')) return;
    setSubject(t.subject);
    setBody(t.body);
  };

  if (error && !data) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={onBack} className="mt-3 text-sm font-medium text-gray-700 underline">
            Back to conversations
          </button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="grid h-full place-items-center text-sm text-gray-400">Loading conversation…</div>;

  const s = data.subscriber;
  const name = `${s.firstName} ${s.lastName}`.trim() || s.email;
  const shown = data.messages.filter((m) => view === 'all' || (view === 'sent' ? m.direction === 'outbound' : m.direction === 'inbound'));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 sm:px-4">
        <button type="button" onClick={onBack} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Back to conversations">
          <MailIcon name="back" className="h-5 w-5" />
        </button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-900 text-sm font-semibold text-white">{initials(s.firstName, s.lastName, s.email)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="truncate text-base font-semibold text-gray-900">{name}</h2>
            <TierBadge tier={s.tierName} />
            {s.role === 'teacher' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Teacher</span>}
          </div>
          <p className="truncate text-xs text-gray-500">
            <a href={`mailto:${s.email}`} className="hover:underline">
              {s.email}
            </a>
            {s.sectionName && ` · ${s.sectionName}`}
            {' · '}
            {s.emailNotifications ? 'accepts emails' : <span className="text-amber-700">unsubscribed from emails</span>}
          </p>
        </div>
        <div className="hidden items-center rounded-lg border border-gray-200 p-0.5 sm:flex" role="group" aria-label="Show messages">
          {(['all', 'sent', 'received'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${view === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/60 px-3 py-4 sm:px-6"
      >
        {data.hasMore && view === 'all' && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} disabled={olderLoading} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
              {olderLoading ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {shown.length === 0 && (
          <div className="py-16 text-center">
            <MailIcon name="mail" className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              {data.messages.length ? `No ${view} messages.` : `No messages with ${s.firstName || name} yet. Write the first one below.`}
            </p>
          </div>
        )}
        {shown.map((m, i) => (
          <Fragment key={m.id}>
            {(i === 0 || !sameDay(shown[i - 1].createdAt, m.createdAt)) && (
              <div className="flex items-center gap-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                {formatDayHeading(m.createdAt, now)}
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            )}
            <MessageItem message={m} viewer="admin" now={now} onRetryEmail={retryEmail} />
          </Fragment>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {editingSubject ? (
            <input
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setEditingSubject(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingSubject(false)}
              maxLength={300}
              aria-label="Subject"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
            />
          ) : (
            <button type="button" onClick={() => setEditingSubject(true)} className="min-w-0 flex-1 truncate text-left text-sm text-gray-600 hover:text-gray-900" title="Edit subject">
              <span className="text-gray-400">Subject: </span>
              {subject || '(add a subject)'}
            </button>
          )}
          <TemplatePicker templates={templates} onApply={applyTemplate} onTemplatesChange={onTemplatesChange} />
        </div>
        <RichTextEditor value={body} onChange={setBody} placeholders onSubmit={send} minHeight={90} maxHeight={260} compact placeholder={`Reply to ${s.firstName || name}…`} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <SaveIndicator state={saveState} />
          {notice && (
            <div role="alert" className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              <MailIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">
                <strong>{notice.title}.</strong> {notice.detail}
              </p>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="rounded p-0.5 text-amber-700 hover:bg-amber-100">
                <MailIcon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {sendError && (
            <span role="alert" className="text-sm text-red-600">
              {sendError}
            </span>
          )}
          <span className="ml-auto hidden text-xs text-gray-400 sm:inline">Ctrl+Enter to send</span>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 max-sm:ml-auto"
          >
            <MailIcon name="send" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
