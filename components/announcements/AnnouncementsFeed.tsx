'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatAnnouncementDate, formatFullDate, sortNewestFirst } from '@/lib/announcements/format';
import { ANNOUNCEMENT_TYPES, type Announcement, type AnnouncementType } from '@/lib/announcements/types';

/** Colour, badge and icon for each kind of announcement. */
const STYLE: Record<AnnouncementType, { dot: string; badge: string; ring: string; icon: React.ReactNode }> = {
  lesson: {
    dot: 'bg-blue-600 text-white',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    ring: 'hover:border-blue-300',
    icon: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />,
  },
  video: {
    dot: 'bg-rose-600 text-white',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    ring: 'hover:border-rose-300',
    icon: <path d="M8 5.5v13l10.5-6.5z" />,
  },
  simulation: {
    dot: 'bg-teal-600 text-white',
    badge: 'bg-teal-50 text-teal-700 ring-teal-200',
    ring: 'hover:border-teal-300',
    icon: (
      <>
        <circle cx="12" cy="12" r="2.2" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
      </>
    ),
  },
  quiz: {
    dot: 'bg-amber-500 text-white',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    ring: 'hover:border-amber-300',
    icon: <path d="M9 11l2.5 2.5L17 8M5 4h14v16H5z" />,
  },
  platform: {
    dot: 'bg-violet-600 text-white',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    ring: 'hover:border-violet-300',
    icon: <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z" />,
  },
};

const LABEL = Object.fromEntries(ANNOUNCEMENT_TYPES.map((t) => [t.type, t.label])) as Record<AnnouncementType, string>;

export interface AnnouncementsFeedProps {
  announcements: Announcement[];
  /** How many to show before "Show more" (5–8 suits the homepage). */
  initialCount?: number;
  /** How many more each "Show more" reveals. */
  step?: number;
  /** Show the type filter chips. */
  showFilters?: boolean;
  /** Link to a page with everything, shown under the feed. */
  viewAllHref?: string;
  /** "Now" for relative dates; pass it from the server so server and browser agree. */
  now?: number;
}

/**
 * A vertical timeline of recent announcements, newest first: colour-coded
 * by type, each card a link to the thing it announces, filterable by type,
 * with "Show more" and an optional "View all" link.
 */
export function AnnouncementsFeed({ announcements, initialCount = 6, step = 4, showFilters = true, viewAllHref, now }: AnnouncementsFeedProps) {
  const [filter, setFilter] = useState<AnnouncementType | 'all'>('all');
  const [visible, setVisible] = useState(initialCount);
  const [clock] = useState(() => now ?? Date.now());

  const sorted = useMemo(() => sortNewestFirst(announcements), [announcements]);
  const counts = useMemo(() => {
    const c: Partial<Record<AnnouncementType, number>> = {};
    sorted.forEach((a) => (c[a.type] = (c[a.type] ?? 0) + 1));
    return c;
  }, [sorted]);
  const filtered = filter === 'all' ? sorted : sorted.filter((a) => a.type === filter);
  const shown = filtered.slice(0, visible);
  const hidden = filtered.length - shown.length;

  const choose = (f: AnnouncementType | 'all') => {
    setFilter(f);
    setVisible(initialCount);
  };

  return (
    <div>
      {showFilters && (
        <div className="flex gap-2 mb-6 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter updates by type">
          <FilterChip active={filter === 'all'} onClick={() => choose('all')} label="All" count={sorted.length} />
          {ANNOUNCEMENT_TYPES.filter((t) => counts[t.type]).map((t) => (
            <FilterChip key={t.type} active={filter === t.type} onClick={() => choose(t.type)} label={t.plural} count={counts[t.type]!} type={t.type} />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 py-6">Nothing here yet.</p>
      ) : (
        <ol className="relative" key={filter}>
          {/* The timeline's spine */}
          <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
          {shown.map((a, i) => {
            const s = STYLE[a.type];
            return (
              <li
                key={a.id}
                className="relative pl-12 pb-4 last:pb-0 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <span className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${s.dot}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill={a.type === 'video' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a.type === 'video' ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </span>
                <Link
                  href={a.href}
                  className={`group block rounded-xl border border-gray-200 bg-white px-4 py-3.5 sm:px-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${s.ring}`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                    <span className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${s.badge}`}>{LABEL[a.type]}</span>
                    {a.status && (
                      <span
                        className={`text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          a.status === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {a.status === 'new' ? 'New' : 'Updated'}
                      </span>
                    )}
                    <time dateTime={a.date} title={formatFullDate(a.date)} className="ml-auto text-xs text-gray-500 tabular-nums">
                      {formatAnnouncementDate(a.date, clock)}
                    </time>
                  </div>
                  <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">{a.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mt-0.5 line-clamp-2">{a.description}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {(hidden > 0 || viewAllHref) && (
        <div className="flex flex-wrap items-center gap-3 mt-5 pl-12">
          {hidden > 0 && (
            <button
              onClick={() => setVisible((v) => v + step)}
              className="text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors"
            >
              Show {Math.min(step, hidden)} more
            </button>
          )}
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm font-semibold text-blue-600 hover:underline">
              View all updates →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, type }: { active: boolean; onClick: () => void; label: string; count: number; type?: AnnouncementType }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${
        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
      }`}
    >
      {type && <span className={`w-2 h-2 rounded-full ${STYLE[type].dot.split(' ')[0]}`} aria-hidden="true" />}
      {label}
      <span className={`text-[11px] tabular-nums ${active ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
    </button>
  );
}
