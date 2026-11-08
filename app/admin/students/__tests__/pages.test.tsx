// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  listStudents: vi.fn(),
  getStudentProfile: vi.fn(),
  getPaymentHistory: vi.fn(),
  getStudentStats: vi.fn(),
  getTimeline: vi.fn(),
  getStudentAnalytics: vi.fn(),
}));

vi.mock('@/lib/admin/students', () => ({ ...mocks, STATS_WEEKS: 12 }));
vi.mock('@/lib/admin/studentAnalytics', () => ({ getStudentAnalytics: mocks.getStudentAnalytics }));
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
  questions: 32,
  attempted: 40,
  correct: 30,
  last_active_at: '2026-10-15T09:00:00Z',
};

const ANALYTICS = {
  outcomes: {
    answered: 30, right: 22, wrong: 8, firstTryRight: 18, skipped: 3, notReached: 12, inStartedLessons: 45,
    submissions: 40, correctSubmissions: 27, hintsUsed: 4, medianTimeMs: 95_000,
    wrongReasons: { wrongValue: 10, wrongUnit: 1, unparseable: 2, other: 0 },
  },
  topics: [
    { student_id: 'x', topic_id: 't1', topic_name: 'Forces', attempted: 20, correct: 18, incorrect: 2, accuracy: 0.9, avg_time_ms: 1, hints_used: 0, unparseable: 0, mastered: true, first_practiced_at: '', last_practiced_at: '' },
    { student_id: 'x', topic_id: 't2', topic_name: 'Moments', attempted: 20, correct: 9, incorrect: 11, accuracy: 0.45, avg_time_ms: 1, hints_used: 0, unparseable: 0, mastered: false, first_practiced_at: '', last_practiced_at: '' },
  ],
  difficulty: [{ level: 3, attempted: 10, correct: 4 }],
  missed: [
    { problem_id: 'p1', topic_id: 't2', problem_number: 7, topic_name: 'Moments', question: 'A beam of length 2 m…', wrong: 3, tries: 3, latest_correct: false, last_answer: '3.2 N', last_at: '2026-10-15T09:00:00Z' },
  ],
  usage: {
    totalActiveMinutes: 600, activeMinutes7d: 90, activeMinutes30d: 300, activeDays: 12, activeDays30d: 8, logins30d: 9,
    practiceSessions: 14, lessonsOpened: 20, simulationsStarted: 2, solutionsOpened: 1, downloads: 0, videoRequests: 1,
    firstActivityAt: '2026-09-20T09:00:00Z',
  },
  weeklyAnswers: [{ week: '2026-10-12', correct: 15, incorrect: 5 }],
  topicsMastered: 1,
  bestStreak: 6,
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
      chapters: [
        { chapter_id: 'a', label: 'Ch 3 Forces and Motion (0625)', attempted: 30, correct: 27, last_at: '' },
        { chapter_id: 'b', label: 'Ch 24 Earth and the Solar System (0625)', attempted: 10, correct: 3, last_at: '' },
      ],
    });
    mocks.getStudentAnalytics.mockResolvedValue(ANALYTICS);
    mocks.getTimeline.mockResolvedValue({
      entries: [{ at: '2026-10-15T09:00:00Z', category: 'practice', title: 'Answered correctly · Q4', detail: 'Forces · “12 N”' }],
      hasMore: true,
      counts: { practice: 120 },
    });

    render(await StudentPage({ params: { id: ID }, searchParams: { type: 'practice', page: '2' } }));

    expect(mocks.getTimeline).toHaveBeenCalledWith(ID, { from: null, to: null, categories: ['practice'], page: 2 });
    expect(screen.getByText('auto-approved')).toBeTruthy();
    // Analytics
    expect(screen.getByText('Skipped, not answered since'.toLowerCase())).toBeTruthy();
    expect(screen.getByText('Still wrong')).toBeTruthy();
    expect(screen.getByText('Last answer: 3.2 N')).toBeTruthy();
    expect(screen.getByText('Wrong value')).toBeTruthy();
    expect(screen.getByText('3 · Hard')).toBeTruthy();
    expect(screen.getByText('Strongest lessons')).toBeTruthy();
    expect(screen.getAllByText('Forces').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Moments').length).toBeGreaterThan(0);
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
