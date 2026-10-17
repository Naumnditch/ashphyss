import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; role: string },
  query: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => mocks.user }));
vi.mock('@/lib/db/client', () => ({ query: mocks.query }));

import { GET } from '@/app/api/subscribers/search/route';
import { buildSubscriberSearch, likePattern, SEARCH_MAX, searchLimit, searchTokens } from '../subscriberSearch';

/** n fake students as the database returns them, with the window count. */
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    first_name: `Student${i} `,
    last_name: 'Test',
    email: `s${i}@example.com`,
    role: 'student',
    status: 'active',
    section_id: null,
    section_name: null,
    email_notifications: i % 2 === 0,
    unsubscribe_token: 'secret',
    created_at: '2026-10-01T00:00:00Z',
    tier: i % 3,
    total_count: n,
  }));

const search = (qs: string) => GET({ nextUrl: new URL(`http://localhost/api/subscribers/search${qs}`) } as never);

beforeEach(() => {
  mocks.query.mockReset();
  mocks.user = { id: 'admin-1', role: 'admin' };
});

describe('recipient search terms', () => {
  it('splits on any whitespace and ignores stray spaces', () => {
    expect(searchTokens('  ahmed   hassan ')).toEqual(['ahmed', 'hassan']);
    expect(searchTokens('   ')).toEqual([]);
  });

  it('escapes LIKE wildcards', () => {
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });

  it('an empty search only excludes admins; each word becomes its own condition', () => {
    expect(buildSubscriberSearch('')).toEqual({ where: `u.role <> 'admin'`, params: [] });
    const { where, params } = buildSubscriberSearch('mostafa abdel');
    expect(params).toEqual(['%mostafa%', '%abdel%']);
    expect(where).toContain('$1');
    expect(where).toContain('$2');
  });

  it('reads the limit parameter, defaulting to the maximum', () => {
    expect(searchLimit(null)).toBe(SEARCH_MAX);
    expect(searchLimit('abc')).toBe(SEARCH_MAX);
    expect(searchLimit('0')).toBe(SEARCH_MAX);
    expect(searchLimit('25')).toBe(25);
    expect(searchLimit('100000')).toBe(SEARCH_MAX);
  });
});

describe('GET /api/subscribers/search', () => {
  it('returns everyone for an empty search, well past the old 10-person page', async () => {
    mocks.query.mockResolvedValue({ rows: rows(25) });
    const res = await search('?q=');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.subscribers).toHaveLength(25);
    expect(body.total).toBe(25);
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toContain('LIMIT $1');
    expect(params).toEqual([SEARCH_MAX]);
  });

  it('keeps tiers, trims names and never exposes unsubscribe tokens', async () => {
    mocks.query.mockResolvedValue({ rows: rows(3) });
    const { subscribers } = await (await search('?q=student')).json();
    expect(subscribers.map((s: { tierName: string }) => s.tierName)).toEqual(['Free', 'Plus', 'Pro']);
    expect(subscribers[0].firstName).toBe('Student0');
    expect(subscribers[0].emailNotifications).toBe(true);
    expect(subscribers[0]).not.toHaveProperty('unsubscribeToken');
  });

  it('refuses non-admins without touching the database', async () => {
    mocks.user = { id: 'student-1', role: 'student' };
    expect((await search('?q=')).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
