import { describe, expect, it } from 'vitest';
import { formatAnnouncementDate, formatFullDate, getVisibleUpdates, isVisibleNow, sortNewestFirst } from '../format';
import { UPDATES } from '../updates';
import type { Announcement } from '../types';

const now = Date.parse('2026-09-25T10:00:00Z');

describe('announcement dates', () => {
  it('reads as today, yesterday or days ago within a week', () => {
    expect(formatAnnouncementDate('2026-09-25T01:00:00Z', now)).toBe('Today');
    expect(formatAnnouncementDate('2026-09-24T23:00:00Z', now)).toBe('Yesterday');
    expect(formatAnnouncementDate('2026-09-23T12:00:00Z', now)).toBe('2 days ago');
    expect(formatAnnouncementDate('2026-09-19T12:00:00Z', now)).toBe('6 days ago');
  });

  it('shows the full date after a week', () => {
    expect(formatAnnouncementDate('2026-09-18T12:00:00Z', now)).toBe('18 Sep 2026');
    expect(formatFullDate('2026-01-05')).toBe('5 Jan 2026');
  });
});

describe('sorting', () => {
  it('puts the newest first', () => {
    const sorted = sortNewestFirst([...UPDATES].reverse());
    const times = sorted.map((a) => Date.parse(a.date));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('has unique ids and working-looking links in the real data', () => {
    expect(new Set(UPDATES.map((a) => a.id)).size).toBe(UPDATES.length);
    UPDATES.forEach((a) => expect(a.href.startsWith('/')).toBe(true));
    expect(new Set(UPDATES.map((a) => a.category)).size).toBeGreaterThan(1);
  });

  it('every shipped entry is published and not future-dated relative to today', () => {
    const today = Date.now();
    UPDATES.forEach((a) => {
      expect(a.published).toBe(true);
      expect(Date.parse(a.date)).toBeLessThanOrEqual(today);
    });
  });
});

describe('getVisibleUpdates / isVisibleNow', () => {
  const base: Announcement = {
    id: 'x',
    category: 'platform',
    type: 'new',
    title: 'X',
    description: 'd',
    date: '2026-01-01',
    href: '/x',
    published: true,
  };
  const clock = Date.parse('2026-01-10T00:00:00Z');

  it('hides unpublished entries', () => {
    expect(isVisibleNow({ ...base, published: false }, clock)).toBe(false);
  });

  it('hides future-dated entries even if published', () => {
    expect(isVisibleNow({ ...base, date: '2026-02-01', published: true }, clock)).toBe(false);
  });

  it('shows published, non-future entries, sorted newest first', () => {
    const items: Announcement[] = [
      { ...base, id: 'old', date: '2026-01-01' },
      { ...base, id: 'draft', date: '2026-01-05', published: false },
      { ...base, id: 'future', date: '2026-02-01' },
      { ...base, id: 'new', date: '2026-01-09' },
    ];
    const visible = getVisibleUpdates(items, clock);
    expect(visible.map((a) => a.id)).toEqual(['new', 'old']);
  });

  it('caps to the requested count only when the caller slices (feed shows all visible, pill slices to 5)', () => {
    const items: Announcement[] = Array.from({ length: 8 }, (_, i) => ({
      ...base,
      id: `u${i}`,
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }));
    const visible = getVisibleUpdates(items, clock);
    expect(visible.length).toBe(8);
    expect(visible.slice(0, 5).length).toBe(5);
    expect(visible[0].id).toBe('u7');
  });
});
