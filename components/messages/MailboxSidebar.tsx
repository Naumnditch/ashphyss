'use client';

/** The conversation list: search, sent/received filters, unread badges, drafts and bulk-send history. */

import type { BulkSendDTO, DraftDTO, InboxFilter, ThreadSummaryDTO } from '@/lib/messaging/types';
import { formatListTime } from '@/lib/messaging/time';
import { initials, looksBlank, previewOf } from '@/lib/messaging/text';
import { MailIcon } from './MailIcons';

export type SidebarTab = InboxFilter | 'drafts' | 'bulk';

interface Props {
  tab: SidebarTab;
  onTab: (t: SidebarTab) => void;
  q: string;
  onQ: (q: string) => void;
  threads: ThreadSummaryDTO[];
  total: number;
  loading: boolean;
  onLoadMore: () => void;
  selectedId: string | null;
  onSelect: (subscriberId: string) => void;
  unreadTotal: number;
  drafts: DraftDTO[];
  onOpenDraft: (d: DraftDTO) => void;
  bulkSends: BulkSendDTO[];
  now: number;
}

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'bulk', label: 'Bulk' },
];

export function MailboxSidebar(p: Props) {
  const count = (t: SidebarTab) => (t === 'unread' ? p.unreadTotal : t === 'drafts' ? p.drafts.length : 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-gray-200 p-3">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <MailIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={p.q}
            onChange={(e) => p.onQ(e.target.value)}
            placeholder="Search name, email or message"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </label>
        <div role="tablist" aria-label="Filter conversations" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {TABS.map((t) => {
            const n = count(t.id);
            const active = p.tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => p.onTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
                {n > 0 && (
                  <span className={`min-w-[18px] rounded-full px-1 text-[11px] tabular-nums ${active ? 'bg-white/20' : t.id === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.tab === 'drafts' ? (
          <DraftList drafts={p.drafts} onOpen={p.onOpenDraft} now={p.now} />
        ) : p.tab === 'bulk' ? (
          <BulkList items={p.bulkSends} now={p.now} />
        ) : (
          <ThreadList {...p} />
        )}
      </div>
    </div>
  );
}

function ThreadList({ threads, total, loading, onLoadMore, selectedId, onSelect, tab, q, now }: Props) {
  if (!threads.length) {
    return (
      <div className="px-6 py-12 text-center">
        <MailIcon name="inbox" className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          {loading ? 'Loading…' : q ? `No conversations match “${q}”.` : tab === 'unread' ? 'You’re all caught up.' : 'No conversations yet. Start one with New message.'}
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {threads.map((t) => {
        const name = `${t.subscriber.firstName} ${t.subscriber.lastName}`.trim() || t.subscriber.email;
        const selected = selectedId === t.subscriber.id;
        const unread = t.unread > 0;
        return (
          <li key={t.threadId}>
            <button
              type="button"
              onClick={() => onSelect(t.subscriber.id)}
              aria-current={selected ? 'true' : undefined}
              className={`flex w-full gap-3 px-3 py-3 text-left transition-colors ${selected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${unread ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {initials(t.subscriber.firstName, t.subscriber.lastName, t.subscriber.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>{name}</span>
                  <time className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-blue-700' : 'text-gray-400'}`} dateTime={t.lastMessageAt}>
                    {formatListTime(t.lastMessageAt, now)}
                  </time>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={`line-clamp-2 flex-1 text-[13px] leading-snug ${unread ? 'text-gray-800' : 'text-gray-500'}`}>
                    {t.hasDraft && <span className="font-medium text-red-600">Draft · </span>}
                    {t.lastDirection === 'outbound' && <span className="text-gray-400">You: </span>}
                    {t.lastMessagePreview}
                  </span>
                  {unread && (
                    <span className="shrink-0 min-w-[20px] rounded-full bg-blue-600 px-1.5 text-center text-[11px] font-semibold tabular-nums text-white" aria-label={`${t.unread} unread`}>
                      {t.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {threads.length < total && (
        <li className="p-3">
          <button type="button" onClick={onLoadMore} disabled={loading} className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {loading ? 'Loading…' : `Show more (${total - threads.length})`}
          </button>
        </li>
      )}
    </ul>
  );
}

function DraftList({ drafts, onOpen, now }: { drafts: DraftDTO[]; onOpen: (d: DraftDTO) => void; now: number }) {
  if (!drafts.length) return <p className="px-6 py-12 text-center text-sm text-gray-500">No drafts. Anything you start writing is saved here automatically.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {drafts.map((d) => {
        const to = d.kind === 'bulk' ? 'Bulk message' : d.recipients.map((r) => r.name || r.email).join(', ') || 'No recipients yet';
        const text = looksBlank(d.body) ? '' : previewOf(d.body.replace(/<[^>]+>/g, ' '), 90);
        return (
          <li key={d.id}>
            <button type="button" onClick={() => onOpen(d)} className="flex w-full gap-3 px-3 py-3 text-left hover:bg-gray-50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                <MailIcon name={d.kind === 'bulk' ? 'megaphone' : 'pen'} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">{to}</span>
                  <time className="shrink-0 text-[11px] text-gray-400">{formatListTime(d.updatedAt, now)}</time>
                </span>
                <span className="block truncate text-[13px] text-gray-700">{d.subject || '(no subject)'}</span>
                {text && <span className="block truncate text-[13px] text-gray-500">{text}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BulkList({ items, now }: { items: BulkSendDTO[]; now: number }) {
  if (!items.length) return <p className="px-6 py-12 text-center text-sm text-gray-500">No bulk messages sent yet.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((b) => (
        <li key={b.id} className="flex gap-3 px-3 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700">
            <MailIcon name="megaphone" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-900">{b.subject}</span>
              <time className="shrink-0 text-[11px] text-gray-400">{formatListTime(b.createdAt, now)}</time>
            </span>
            <span className="block truncate text-[13px] text-gray-500">{b.filtersLabel}</span>
            <span className="text-[12px] text-gray-500">
              {b.recipientCount} sent · {b.emailedCount} emailed
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
