import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; role: string },
  query: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => mocks.user }));
vi.mock('@/lib/db/client', () => ({ query: mocks.query }));

import { PATCH } from '@/app/api/admin/access/route';

const STUDENT = 'bbbbbbbb-0000-4000-8000-000000000002';
const patch = (body: unknown) =>
  PATCH(new Request('http://localhost/api/admin/access', { method: 'PATCH', body: JSON.stringify(body) }) as never);

const inserts = () =>
  mocks.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO analytics_events'));

beforeEach(() => {
  mocks.query.mockReset();
  mocks.user = { id: 'admin-1', role: 'admin' };
});

describe('PATCH /api/admin/access (revoke)', () => {
  it('logs the revocation against the student, with the admin as actor and the previous plan', async () => {
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes('SELECT p.name') ? { rows: [{ name: 'Pro' }] } : { rows: [], rowCount: 1 }
    );
    const res = await patch({ studentId: STUDENT });
    expect(res.status).toBe(200);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE subscriptions'))).toBe(true);
    const [[, params]] = inserts();
    expect(params.slice(0, 4)).toEqual(['admin-1', 'admin_subscription_revoke', 'student', STUDENT]);
    expect(JSON.parse(params[5])).toEqual({ previous_plan: 'Pro' });
  });

  it('still revokes when logging fails', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO analytics_events')) throw new Error('db down');
      return { rows: [], rowCount: 1 };
    });
    const res = await patch({ studentId: STUDENT });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('refuses non-admins without touching the database', async () => {
    mocks.user = { id: STUDENT, role: 'student' };
    const res = await patch({ studentId: STUDENT });
    expect(res.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
