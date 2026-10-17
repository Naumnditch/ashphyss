import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  MIN_CHAPTER_ATTEMPTS,
  formatMinutes,
  formatPercent,
  parseStudentListParams,
  parseTimelineFilters,
  rankByAccuracy,
  timelineQuery,
} from '@/lib/admin/studentHistory';
import { EVENT_TYPES } from '@/lib/analytics/track';
import { ADMIN_STUDENT_EVENTS } from '@/lib/admin/studentHistory';

describe('parseTimelineFilters', () => {
  it('defaults to every category except page views, page 1, no dates', () => {
    const f = parseTimelineFilters({});
    expect(f).toEqual({ from: null, to: null, categories: DEFAULT_CATEGORIES, page: 1 });
    expect(f.categories).not.toContain('page');
  });

  it('keeps known categories from repeated or comma-separated params and drops unknown ones', () => {
    expect(parseTimelineFilters({ type: ['payment', 'practice'] }).categories).toEqual(['payment', 'practice']);
    expect(parseTimelineFilters({ type: 'page,solution,nope' }).categories).toEqual(['page', 'solution']);
    expect(parseTimelineFilters({ type: 'nope' }).categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('accepts only real ISO dates and swaps a reversed range', () => {
    expect(parseTimelineFilters({ from: '2026-02-30' }).from).toBeNull();
    expect(parseTimelineFilters({ from: "2026-01-01' OR 1=1" }).from).toBeNull();
    const f = parseTimelineFilters({ from: '2026-10-10', to: '2026-10-01' });
    expect([f.from, f.to]).toEqual(['2026-10-01', '2026-10-10']);
  });

  it('clamps the page number', () => {
    expect(parseTimelineFilters({ page: '0' }).page).toBe(1);
    expect(parseTimelineFilters({ page: 'x' }).page).toBe(1);
    expect(parseTimelineFilters({ page: '3' }).page).toBe(3);
    expect(parseTimelineFilters({ page: '99999999' }).page).toBe(10_000);
  });
});

describe('timelineQuery', () => {
  it('omits defaults and round-trips through the parser', () => {
    expect(timelineQuery(parseTimelineFilters({}))).toBe('');
    const f = parseTimelineFilters({ from: '2026-09-01', type: ['payment', 'subscription'], page: '2' });
    const q = timelineQuery(f);
    expect(q).toBe('?from=2026-09-01&type=payment&type=subscription&page=2');
    const params = Object.fromEntries(
      Array.from(new URLSearchParams(q.slice(1)).keys()).map((k) => [k, new URLSearchParams(q.slice(1)).getAll(k)])
    );
    expect(parseTimelineFilters(params)).toEqual(f);
  });

  it('applies overrides', () => {
    const f = parseTimelineFilters({ page: '2' });
    expect(timelineQuery(f, { page: 1 })).toBe('');
    expect(timelineQuery(f, { page: 3 })).toBe('?page=3');
  });
});

describe('parseStudentListParams', () => {
  it('defaults to most recently active first', () => {
    expect(parseStudentListParams({})).toEqual({ search: '', sort: 'active', dir: 'desc', page: 1 });
  });
  it('only accepts whitelisted sort columns', () => {
    expect(parseStudentListParams({ sort: 'email; DROP TABLE users' }).sort).toBe('active');
    expect(parseStudentListParams({ sort: 'accuracy', dir: 'asc' })).toMatchObject({ sort: 'accuracy', dir: 'asc' });
    expect(parseStudentListParams({ sort: 'name' }).dir).toBe('asc');
    expect(parseStudentListParams({ sort: 'name', dir: 'sideways' }).dir).toBe('asc');
  });
  it('trims and bounds the search', () => {
    expect(parseStudentListParams({ search: '  ali  ' }).search).toBe('ali');
    expect(parseStudentListParams({ search: 'x'.repeat(500) }).search).toHaveLength(100);
  });
});

describe('rankByAccuracy', () => {
  const ch = (id: string, attempted: number, correct: number) => ({ id, attempted, correct });
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it('ignores items with too few answers', () => {
    expect(rankByAccuracy([ch('a', MIN_CHAPTER_ATTEMPTS - 1, 0)])).toEqual({ best: [], worst: [] });
  });

  it('lists a single eligible item only as strongest', () => {
    const r = rankByAccuracy([ch('a', 10, 5), ch('b', 2, 0)]);
    expect(ids(r.best)).toEqual(['a']);
    expect(r.worst).toEqual([]);
  });

  it('splits a small field without overlap', () => {
    const r = rankByAccuracy([ch('a', 10, 9), ch('b', 10, 5), ch('c', 10, 1)]);
    expect(ids(r.best)).toEqual(['a']);
    expect(ids(r.worst)).toEqual(['c']);
  });

  it('takes up to k from each end, weakest first, ties broken by volume', () => {
    const rows = [ch('a', 10, 9), ch('b', 20, 18), ch('c', 10, 3), ch('d', 30, 9), ch('e', 10, 7), ch('f', 10, 8), ch('g', 10, 6)];
    const r = rankByAccuracy(rows, 3);
    expect(ids(r.best)).toEqual(['b', 'a', 'f']);
    expect(ids(r.worst)).toEqual(['d', 'c', 'g']);
  });
});

describe('formatting', () => {
  it('formats minutes', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(42)).toBe('42 min');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(135)).toBe('2h 15m');
  });
  it('formats accuracy', () => {
    expect(formatPercent(0, 0)).toBe('—');
    expect(formatPercent(2, 3)).toBe('67%');
  });
});

describe('admin student events', () => {
  it('cannot be written through the public /api/analytics/track sink', () => {
    for (const e of ADMIN_STUDENT_EVENTS) expect(EVENT_TYPES as readonly string[]).not.toContain(e);
  });
});
