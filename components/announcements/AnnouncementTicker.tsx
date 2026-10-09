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
 * A slim pill that cycles through the newest few published updates. Pass
 * already-filtered (published, non-future) updates in — see
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

  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur pl-1.5 pr-3 py-1 text-xs shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <a
        href="#whats-new-section"
        className={`shrink-0 rounded-full font-semibold px-2 py-0.5 hover:brightness-110 ${BADGE_CLASS[a.type]}`}
      >
        {UPDATE_KIND_LABEL[a.type]}
      </a>
      <Link key={a.id} href={a.href} className="flex min-w-0 items-center gap-2 text-gray-700 hover:text-gray-900 animate-fade-in-up" style={{ animationDuration: '0.5s' }}>
        <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${DOT[a.category]}`} aria-hidden="true" />
        <span className="truncate font-medium">{a.title}</span>
        <span className="hidden sm:inline shrink-0 text-gray-400">· {formatAnnouncementDate(a.date, clock)}</span>
        <span className="shrink-0 text-gray-400" aria-hidden="true">→</span>
      </Link>
      {items.length > 1 && (
        <span className="hidden sm:flex shrink-0 gap-1 pl-1" aria-label="Choose announcement">
          {items.map((x, j) => (
            <button
              key={x.id}
              onClick={() => setI(j)}
              aria-label={`Show: ${x.title}`}
              aria-current={j === i2 ? 'true' : undefined}
              className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${j === i2 ? 'w-3 bg-gray-700' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </span>
      )}
    </div>
  );
}
