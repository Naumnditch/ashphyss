'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatAnnouncementDate, sortNewestFirst } from '@/lib/announcements/format';
import { UPDATE_KIND_LABEL } from '@/lib/announcements/types';
import type { Announcement, AnnouncementCategory } from '@/lib/announcements/types';

const DOT: Record<AnnouncementCategory, string> = {
  lesson: 'bg-blue-600',
  video: 'bg-rose-600',
  simulation: 'bg-teal-600',
  quiz: 'bg-amber-500',
  platform: 'bg-violet-600',
};

const BADGE_CLASS: Record<Announcement['type'], string> = {
  new: 'bg-gray-900 text-white',
  improved: 'bg-blue-600 text-white',
  fix: 'bg-amber-600 text-white',
};

/**
 * Full-width banner that cycles through the newest few published updates.
 * Pass already-filtered (published, non-future) updates in — see
 * getVisibleUpdates() in lib/announcements/format.ts. Pauses on
 * hover/focus and respects prefers-reduced-motion; renders nothing when
 * there's nothing to show.
 */
export function AnnouncementTicker({ announcements, count = 5, now, interval = 5000 }: { announcements: Announcement[]; count?: number; now?: number; interval?: number }) {
  const items = sortNewestFirst(announcements).slice(0, count);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [clock] = useState(() => now ?? Date.now());

  useEffect(() => {
    if (paused || items.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [paused, items.length, interval]);

  if (!items.length) return null;
  const i2 = i % items.length;
  const a = items[i2];
  const go = (delta: number) => setI((x) => (x + delta + items.length) % items.length);

  return (
    <section
      aria-label="Latest updates"
      className="card w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:h-20 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-0">
        {/* The part that actually rotates — scoped narrowly so screen readers
            announce the new update, not the static nav controls below. */}
        <div aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <a
              href="#whats-new-section"
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold hover:brightness-110 sm:px-3.5 sm:py-1.5 sm:text-sm ${BADGE_CLASS[a.type]}`}
            >
              {UPDATE_KIND_LABEL[a.type]}
            </a>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3 ${DOT[a.category]}`} aria-hidden="true" />
            <span className="shrink-0 text-sm text-gray-400 sm:hidden">{formatAnnouncementDate(a.date, clock)}</span>
          </div>

          <Link
            key={a.id}
            href={a.href}
            className="flex min-w-0 flex-1 items-center gap-3 animate-fade-in-up"
            style={{ animationDuration: '0.4s' }}
          >
            <span className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 sm:text-lg lg:text-xl">
              {a.title}
            </span>
            <span className="hidden shrink-0 text-sm text-gray-400 sm:inline">{formatAnnouncementDate(a.date, clock)}</span>
            <span className="hidden shrink-0 text-gray-400 sm:inline" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        {items.length > 1 && (
          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous update"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="flex gap-1 px-0.5" aria-label="Choose update">
              {items.map((x, j) => (
                <button
                  key={x.id}
                  onClick={() => setI(j)}
                  aria-label={`Show: ${x.title}`}
                  aria-current={j === i2 ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${j === i2 ? 'w-4 bg-gray-700' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next update"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
