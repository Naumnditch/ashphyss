import type { Announcement } from './types';

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Calendar day number (UTC), so "yesterday" means the previous date, not 24 hours ago. */
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);

/** "25 Sep 2026". */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Today", "Yesterday", "3 days ago" within a week; otherwise the full date. */
export function formatAnnouncementDate(iso: string, now: Date | number = Date.now()): string {
  const days = dayNumber(new Date(now)) - dayNumber(new Date(iso));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatFullDate(iso);
}

/** Newest first; ties keep their given order. */
export function sortNewestFirst(items: Announcement[]): Announcement[] {
  return items
    .map((a, i) => ({ a, i }))
    .sort((x, y) => new Date(y.a.date).getTime() - new Date(x.a.date).getTime() || x.i - y.i)
    .map(({ a }) => a);
}

/**
 * The single gate every surface (pill, homepage feed, /updates) filters
 * through before sorting/slicing: never show a draft, and never show
 * something dated after "now" even if a clock is off by a few minutes.
 */
export function isVisibleNow(a: Announcement, now: Date | number = Date.now()): boolean {
  return a.published && new Date(a.date).getTime() <= new Date(now).getTime();
}

/** Published, not-future-dated entries, newest first. */
export function getVisibleUpdates(items: Announcement[], now: Date | number = Date.now()): Announcement[] {
  return sortNewestFirst(items.filter((a) => isVisibleNow(a, now)));
}
