/**
 * Pure helpers for /admin/students: parsing the page's query string, the
 * timeline's activity categories, and the strongest/weakest chapter pick.
 * No database imports, so this is unit-tested on its own and safe to import
 * anywhere.
 */

/** Activity categories the timeline can be filtered by. */
export const ACTIVITY_CATEGORIES = [
  { id: 'account', label: 'Account & logins' },
  { id: 'subscription', label: 'Tier changes' },
  { id: 'payment', label: 'Payments' },
  { id: 'learning', label: 'Lessons & sims' },
  { id: 'practice', label: 'Questions' },
  { id: 'solution', label: 'Solutions' },
  { id: 'request', label: 'Requests & messages' },
  { id: 'page', label: 'Page views' },
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]['id'];

/** Page views are by far the noisiest source, so they're opt-in. */
export const DEFAULT_CATEGORIES: ActivityCategory[] = ACTIVITY_CATEGORIES.map((c) => c.id).filter(
  (id) => id !== 'page'
);

/**
 * Admin actions on a student, logged to analytics_events with the admin as
 * user_id and the student as entity (entity_type = 'student'). They are not in
 * EVENT_TYPES, so the public /api/analytics/track sink can never write them.
 */
export const ADMIN_STUDENT_EVENTS = [
  'admin_subscription_revoke',
  'admin_account_update',
  'admin_sessions_revoke',
] as const;
export type AdminStudentEvent = (typeof ADMIN_STUDENT_EVENTS)[number];

export const TIMELINE_PAGE_SIZE = 50;
export const STUDENTS_PAGE_SIZE = 50;

/** Minimum attempts in a chapter before it can be called strongest/weakest. */
export const MIN_CHAPTER_ATTEMPTS = 5;

/**
 * Active time is the time between consecutive recorded actions, counted only
 * when the gap is at most this many minutes (a longer gap is a break).
 */
export const ACTIVE_GAP_MINUTES = 15;

export interface TimelineFilters {
  from: string | null; // YYYY-MM-DD, inclusive
  to: string | null; // YYYY-MM-DD, inclusive
  categories: ActivityCategory[];
  page: number;
}

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(','));
}

function isoDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

function pageNumber(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

export function parseTimelineFilters(params: Params): TimelineFilters {
  let from = isoDate(first(params.from));
  let to = isoDate(first(params.to));
  if (from && to && from > to) [from, to] = [to, from];

  const known = new Set<string>(ACTIVITY_CATEGORIES.map((c) => c.id));
  const requested = all(params.type).filter((t) => known.has(t)) as ActivityCategory[];
  const categories = requested.length ? Array.from(new Set(requested)) : DEFAULT_CATEGORIES;

  return { from, to, categories, page: pageNumber(first(params.page)) };
}

/** Builds a timeline URL query, leaving out values that equal the defaults. */
export function timelineQuery(filters: TimelineFilters, overrides: Partial<TimelineFilters> = {}): string {
  const f = { ...filters, ...overrides };
  const q = new URLSearchParams();
  if (f.from) q.set('from', f.from);
  if (f.to) q.set('to', f.to);
  const isDefault =
    f.categories.length === DEFAULT_CATEGORIES.length && DEFAULT_CATEGORIES.every((c) => f.categories.includes(c));
  if (!isDefault) f.categories.forEach((c) => q.append('type', c));
  if (f.page > 1) q.set('page', String(f.page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const STUDENT_SORTS = {
  name: 'name',
  email: 'email',
  tier: 'tier',
  expiry: 'expiry',
  joined: 'joined',
  active: 'active',
  attempts: 'attempts',
  accuracy: 'accuracy',
} as const;
export type StudentSort = keyof typeof STUDENT_SORTS;

export interface StudentListParams {
  search: string;
  sort: StudentSort;
  dir: 'asc' | 'desc';
  page: number;
}

export function parseStudentListParams(params: Params): StudentListParams {
  const sortRaw = first(params.sort) ?? '';
  const sort: StudentSort = sortRaw in STUDENT_SORTS ? (sortRaw as StudentSort) : 'active';
  const dirRaw = first(params.dir);
  const dir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : sort === 'name' || sort === 'email' ? 'asc' : 'desc';
  return {
    search: (first(params.search) ?? '').trim().slice(0, 100),
    sort,
    dir,
    page: pageNumber(first(params.page)),
  };
}

export interface ChapterAccuracy {
  chapter_id: string;
  label: string;
  attempted: number;
  correct: number;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatPercent(correct: number, attempted: number): string {
  return attempted > 0 ? `${Math.round((correct / attempted) * 100)}%` : '—';
}

/**
 * Up to `k` strongest and weakest items by accuracy, among those with at
 * least MIN_CHAPTER_ATTEMPTS answers. The two lists never overlap: with few
 * eligible items they split the field (3 eligible → 1 strongest, 1 weakest),
 * and a single eligible item is only listed as strongest.
 */
export function rankByAccuracy<T extends { attempted: number; correct: number }>(
  rows: T[],
  k = 3
): { best: T[]; worst: T[] } {
  const acc = (r: T) => r.correct / r.attempted;
  const eligible = rows.filter((r) => r.attempted >= MIN_CHAPTER_ATTEMPTS);
  if (eligible.length <= 1) return { best: eligible, worst: [] };
  const take = Math.min(k, Math.floor(eligible.length / 2));
  // Ties go to the item with more answers (more evidence) on both lists.
  const best = [...eligible].sort((a, b) => acc(b) - acc(a) || b.attempted - a.attempted).slice(0, take);
  const worst = [...eligible]
    .filter((r) => !best.includes(r))
    .sort((a, b) => acc(a) - acc(b) || b.attempted - a.attempted)
    .slice(0, take);
  return { best, worst };
}
