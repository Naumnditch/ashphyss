import { describe, expect, it } from 'vitest';
import { formatAnnouncementDate, formatFullDate, sortNewestFirst } from '../format';
import { SAMPLE_ANNOUNCEMENTS } from '../sampleAnnouncements';

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
    const sorted = sortNewestFirst([...SAMPLE_ANNOUNCEMENTS].reverse());
    const times = sorted.map((a) => Date.parse(a.date));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('has unique ids and working-looking links in the sample data', () => {
    expect(new Set(SAMPLE_ANNOUNCEMENTS.map((a) => a.id)).size).toBe(SAMPLE_ANNOUNCEMENTS.length);
    SAMPLE_ANNOUNCEMENTS.forEach((a) => expect(a.href.startsWith('/')).toBe(true));
    expect(new Set(SAMPLE_ANNOUNCEMENTS.map((a) => a.type)).size).toBe(5);
  });
});
