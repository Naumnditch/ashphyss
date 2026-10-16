// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  listStudents: vi.fn(),
  getStudentProfile: vi.fn(),
  getPaymentHistory: vi.fn(),
  getStudentStats: vi.fn(),
  getTimeline: vi.fn(),
}));

vi.mock('@/lib/admin/students', () => ({ ...mocks, STATS_WEEKS: 12 }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import StudentsPage from '@/app/admin/students/page';
import StudentPage from '@/app/admin/students/[id]/page';

const ID = 'cccccccc-0000-4000-8000-000000000003';
const ROW = {
  id: ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  account_status: 'active',
  joined_at: '2026-09-01T10:00:00Z',
  plan_name: 'Pro',
  plan_tier: 2,
  tier_level: 2,
  sub_status: 'active',
  sub_end: '2026-11-15T00:00:00Z',
  attempted: 40,
  correct: 30,
  last_active_at: '2026-10-15T09:00:00Z',
};

afterEach(cleanup);
beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
});

describe('/admin/students', () => {
  it('lists students with tier, accuracy and a link to the detail page', async () => {
    mocks.listStudents.mockResolvedValue({ rows: [ROW], total: 1 });
    render(await StudentsPage({ searchParams: { sort: 'accuracy' } }));
    expect(mocks.listStudents).toHaveBeenCalledWith({ search: '', sort: 'accuracy', dir: 'desc', page: 1 });
    expect(screen.getAllByText('Ada Lovelace')[0].closest('a')?.getAttribute('href')).toBe(`/admin/students/${ID}`);
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/75%/).length).toBeGreaterThan(0);
  });

  it('shows an empty state', async () => {
    mocks.listStudents.mockResolvedValue({ rows: [], total: 0 });
    render(await StudentsPage({ searchParams: { search: 'zzz' } }));
    expect(screen.getByText('No students match that search.')).toBeTruthy();
  });
});

describe('/admin/students/[id]', () => {
  it('renders profile, payments, stats and a paginated timeline', async () => {
    mocks.getStudentProfile.mockResolvedValue({
      ...ROW,
      school_name: null,
      section_name: null,
      billing_cycle: 'monthly',
      sub_start: '2026-10-15T00:00:00Z',
      active_devices: 1,
      last_login_at: '2026-10-15T08:00:00Z',
    });
    mocks.getPaymentHistory.mockResolvedValue({
      requests: [
        {
          id: 'r1', created_at: '2026-10-01T00:00:00Z', status: 'approved', amount_claimed: '500',
          detected_amount: '500', detected_currency: 'TRY', detection_confidence: 'high', detection_note: null,
          auto_approved: true, months: 1, plan_name: 'Pro', detected_plan_name: 'Pro', detected_months: 1,
          course_title: null, reference: null, admin_note: null, reviewed_at: '2026-10-01T00:01:00Z', reviewer_name: null,
        },
      ],
      shopier: [],
    });
    mocks.getStudentStats.mockResolvedValue({
      weekly: [{ week: '2026-10-12', activeMinutes: 90, practiceMinutes: 60, attempts: 20 }],
      lessonsVisited: 5,
      topicsPracticed: 2,
      topicsMastered: 1,
      solutionsOpened: 0,
      chapters: [
        { chapter_id: 'a', label: 'Ch 3 Forces and Motion (0625)', attempted: 30, correct: 27, last_at: '' },
        { chapter_id: 'b', label: 'Ch 24 Earth and the Solar System (0625)', attempted: 10, correct: 3, last_at: '' },
      ],
    });
    mocks.getTimeline.mockResolvedValue({
      entries: [{ at: '2026-10-15T09:00:00Z', category: 'practice', title: 'Answered correctly · Q4', detail: 'Forces · “12 N”' }],
      hasMore: true,
      counts: { practice: 120 },
    });

    render(await StudentPage({ params: { id: ID }, searchParams: { type: 'practice', page: '2' } }));

    expect(mocks.getTimeline).toHaveBeenCalledWith(ID, { from: null, to: null, categories: ['practice'], page: 2 });
    expect(screen.getByText('auto-approved')).toBeTruthy();
    expect(screen.getAllByText('Ch 3 Forces and Motion (0625)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ch 24 Earth and the Solar System (0625)').length).toBeGreaterThan(0);
    expect(screen.getByText('Answered correctly · Q4')).toBeTruthy();
    expect(screen.getByText('Older →').closest('a')?.getAttribute('href')).toBe(`/admin/students/${ID}?type=practice&page=3`);
    expect(screen.getByText('← Newer').closest('a')?.getAttribute('href')).toBe(`/admin/students/${ID}?type=practice`);
  });

  it('404s for an unknown or non-student id', async () => {
    mocks.getStudentProfile.mockResolvedValue(null);
    await expect(StudentPage({ params: { id: 'nope' }, searchParams: {} })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
