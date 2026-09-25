'use client';

/**
 * The admin mailbox: conversation list on the left, the open conversation
 * on the right (one at a time on phones), compose and bulk-send dialogs,
 * drafts and templates. Polls for new messages every 20 seconds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AudienceOptions } from '@/lib/messaging/audience';
import type { EmailStatusSummary } from '@/lib/messaging/config';
import type { BulkSendDTO, DraftDTO, TemplateDTO, ThreadSummaryDTO } from '@/lib/messaging/types';
import { api } from './api';
import { BulkSendModal } from './BulkSendModal';
import { ComposeModal, type SendSummary } from './ComposeModal';
import { MailboxSidebar, type SidebarTab } from './MailboxSidebar';
import { MailIcon } from './MailIcons';
import { MessageThread } from './MessageThread';
import type { Recipient } from './RecipientPicker';
import { announceMessagesChanged } from './useUnreadCount';

const PAGE = 20;

interface InboxResponse {
  threads: ThreadSummaryDTO[];
  total: number;
  page: number;
  unreadTotal: number;
}

export function Mailbox({
  initialTemplates,
  audience,
  email,
}: {
  initialTemplates: TemplateDTO[];
  audience: AudienceOptions;
  email: EmailStatusSummary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get('s');

  const [tab, setTab] = useState<SidebarTab>(() => (params.get('tab') === 'unread' ? 'unread' : 'all'));
  const [q, setQ] = useState('');
  const [threads, setThreads] = useState<ThreadSummaryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftDTO[]>([]);
  const [bulkSends, setBulkSends] = useState<BulkSendDTO[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [compose, setCompose] = useState<{ open: boolean; draft?: DraftDTO | null; recipients?: Recipient[] }>({ open: false });
  const [bulk, setBulk] = useState<{ open: boolean; draft?: DraftDTO | null }>({ open: false });
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const loaded = useRef(PAGE);

  const filter = tab === 'drafts' || tab === 'bulk' ? 'all' : tab;

  const loadThreads = useCallback(
    async (pageSize = loaded.current) => {
      setLoading(true);
      try {
        const res = await api<InboxResponse>(`/api/messages/inbox?filter=${filter}&q=${encodeURIComponent(q)}&page=1&pageSize=${Math.min(50, pageSize)}`);
        setThreads(res.threads);
        setTotal(res.total);
        setUnreadTotal(res.unreadTotal);
        setNow(Date.now());
      } catch {
        /* keep what we have; the next poll retries */
      } finally {
        setLoading(false);
      }
    },
    [filter, q]
  );

  const loadDrafts = useCallback(async () => {
    try {
      setDrafts((await api<{ drafts: DraftDTO[] }>('/api/messages/drafts')).drafts);
    } catch {
      /* ignore */
    }
  }, []);

  const loadBulk = useCallback(async () => {
    try {
      setBulkSends((await api<{ bulkSends: BulkSendDTO[] }>('/api/messages/bulk-send')).bulkSends);
    } catch {
      /* ignore */
    }
  }, []);

  // Search and filter changes (debounced for typing).
  useEffect(() => {
    loaded.current = PAGE;
    const t = setTimeout(() => loadThreads(PAGE), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadThreads, q]);

  useEffect(() => {
    loadDrafts();
    loadBulk();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadThreads();
    }, 20_000);
    return () => clearInterval(t);
  }, [loadDrafts, loadBulk, loadThreads]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const select = useCallback(
    (subscriberId: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (subscriberId) next.set('s', subscriberId);
      else next.delete('s');
      router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    },
    [params, pathname, router]
  );

  // Stable identity: the open conversation must not reload when the list's search or filter changes.
  const loadThreadsRef = useRef(loadThreads);
  loadThreadsRef.current = loadThreads;
  const refreshAfterChange = useCallback(() => {
    loadThreadsRef.current();
    announceMessagesChanged();
  }, []);

  const onSent = (s: SendSummary | { recipients: number; emailed: number }, bulkSend = false) => {
    const emailPart = email.provider ? ` · ${s.emailed} emailed` : ' · on-site (email not set up)';
    setToast(`Sent to ${s.recipients} ${s.recipients === 1 ? 'person' : 'people'}${emailPart}`);
    refreshAfterChange();
    if (bulkSend) loadBulk();
    if ('firstSubscriberId' in s && s.firstSubscriberId && s.recipients === 1) select(s.firstSubscriberId);
  };

  const openDraft = (d: DraftDTO) => (d.kind === 'bulk' ? setBulk({ open: true, draft: d }) : setCompose({ open: true, draft: d }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <EmailStatus email={email} />
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setBulk({ open: true, draft: null })}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:flex-none"
          >
            <MailIcon name="megaphone" /> Bulk message
          </button>
          <button
            type="button"
            onClick={() => setCompose({ open: true, draft: null, recipients: [] })}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800 sm:flex-none"
          >
            <MailIcon name="pen" /> New message
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-11rem)] min-h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={`min-h-0 min-w-0 border-gray-200 lg:border-r ${selected ? 'hidden lg:block' : ''}`}>
          <MailboxSidebar
            tab={tab}
            onTab={(t) => {
              setTab(t);
              if (t === 'drafts') loadDrafts();
              if (t === 'bulk') loadBulk();
            }}
            q={q}
            onQ={setQ}
            threads={threads}
            total={total}
            loading={loading}
            onLoadMore={() => {
              loaded.current += PAGE;
              loadThreads(loaded.current);
            }}
            selectedId={selected}
            onSelect={select}
            unreadTotal={unreadTotal}
            drafts={drafts}
            onOpenDraft={openDraft}
            bulkSends={bulkSends}
            now={now}
          />
        </div>
        <div className={`min-h-0 min-w-0 ${selected ? '' : 'hidden lg:block'}`}>
          {selected ? (
            <MessageThread
              key={selected}
              subscriberId={selected}
              templates={templates}
              onTemplatesChange={setTemplates}
              onBack={() => select(null)}
              onChanged={refreshAfterChange}
              now={now}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div className="max-w-xs">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-gray-500">
                  <MailIcon name="mail" className="h-7 w-7" />
                </span>
                <p className="mt-3 font-semibold text-gray-900">Select a conversation</p>
                <p className="mt-1 text-sm text-gray-500">Or start a new one. Students read and reply from their dashboard, and by email once email is set up.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ComposeModal
        open={compose.open}
        draft={compose.draft}
        recipients={compose.recipients}
        onClose={() => setCompose({ open: false })}
        templates={templates}
        onTemplatesChange={setTemplates}
        onSent={(s) => onSent(s)}
        onDraftsChanged={loadDrafts}
      />
      <BulkSendModal
        open={bulk.open}
        draft={bulk.draft}
        onClose={() => setBulk({ open: false })}
        templates={templates}
        onTemplatesChange={setTemplates}
        audience={audience}
        emailProvider={email.provider}
        onSent={(s) => onSent(s, true)}
        onDraftsChanged={loadDrafts}
      />

      {toast && (
        <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}

const PROVIDER_NAME = { resend: 'Resend', sendgrid: 'SendGrid', smtp: 'SMTP' } as const;

function EmailStatus({ email }: { email: EmailStatusSummary }) {
  const [open, setOpen] = useState(false);
  const ok = Boolean(email.provider);
  return (
    <div className="mt-0.5 text-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800">
        <span className={`h-2 w-2 rounded-full ${ok ? (email.replySync ? 'bg-emerald-500' : 'bg-blue-500') : 'bg-amber-500'}`} />
        {ok
          ? `Email via ${PROVIDER_NAME[email.provider!]}${email.replySync ? ' · replies sync back here' : ' · email replies not synced yet'}`
          : 'On-site delivery only · email not set up yet'}
        <MailIcon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-600">
          <p>
            Every message always lands in the student&apos;s inbox at <code className="rounded bg-white px-1">/dashboard/messages</code>, where they can reply.
            {ok ? ` It is also emailed from ${email.from}.` : ' To also email it, add an email provider key in Vercel (RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS) plus MAIL_FROM.'}
          </p>
          {ok && !email.replySync && (
            <p className="mt-1.5">To file emailed replies here automatically, set MAIL_REPLY_TO and MAIL_INBOUND_SECRET and point your provider&apos;s inbound parse at /api/messages/inbound.</p>
          )}
          {!email.postalAddressSet && <p className="mt-1.5">Add MAIL_POSTAL_ADDRESS so the email footer carries a postal address (required by CAN-SPAM).</p>}
        </div>
      )}
    </div>
  );
}
