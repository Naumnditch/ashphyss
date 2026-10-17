/**
 * /admin/students — every student with tier, subscription, activity and
 * practice accuracy. Searching, sorting and paging all happen in SQL
 * (lib/admin/students.ts), so the page stays fast as the roster grows.
 * Admin-only via app/admin/layout.tsx.
 */

import Link from 'next/link';
import { listStudents } from '@/lib/admin/students';
import {
  STUDENTS_PAGE_SIZE,
  formatPercent,
  parseStudentListParams,
  type StudentListParams,
  type StudentSort,
} from '@/lib/admin/studentHistory';
import { LocalTime } from '@/components/admin/LocalTime';
import { SubscriptionStatus, TierBadge, displayName } from '@/components/admin/StudentBits';

export const dynamic = 'force-dynamic';

const COLUMNS: { sort: StudentSort; label: string; className?: string }[] = [
  { sort: 'name', label: 'Student' },
  { sort: 'tier', label: 'Tier' },
  { sort: 'expiry', label: 'Subscription' },
  { sort: 'joined', label: 'Joined' },
  { sort: 'active', label: 'Last active' },
  { sort: 'attempts', label: 'Questions', className: 'text-right' },
  { sort: 'accuracy', label: 'Accuracy', className: 'text-right' },
];

function href(params: StudentListParams, overrides: Partial<StudentListParams>) {
  const p = { ...params, ...overrides };
  const q = new URLSearchParams();
  if (p.search) q.set('search', p.search);
  q.set('sort', p.sort);
  q.set('dir', p.dir);
  if (p.page > 1) q.set('page', String(p.page));
  return `/admin/students?${q.toString()}`;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseStudentListParams(searchParams);
  const { rows, total } = await listStudents(params);
  const pages = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));
  const start = total === 0 ? 0 : (params.page - 1) * STUDENTS_PAGE_SIZE + 1;
  const end = Math.min(total, params.page * STUDENTS_PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Students</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-2xl">
        Every student account with their tier, subscription and practice record. Click a student for their analytics:
        questions right, wrong and skipped, time on the site, strengths and weak points, payments and a full activity
        timeline.
      </p>

      <form method="get" className="flex flex-col sm:flex-row gap-3 mb-5">
        <input type="hidden" name="sort" value={params.sort} />
        <input type="hidden" name="dir" value={params.dir} />
        <input
          type="search"
          name="search"
          defaultValue={params.search}
          placeholder="Search by name or email…"
          className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button className="bg-gray-900 hover:bg-gray-800 text-on-ink text-sm font-semibold px-5 py-2 rounded-lg">
          Search
        </button>
      </form>

      <p className="text-xs text-gray-400 mb-2">
        {total === 0 ? 'No students' : `${start}–${end} of ${total} student${total === 1 ? '' : 's'}`}
        {params.search && (
          <>
            {' '}matching “{params.search}” ·{' '}
            <Link href={href(params, { search: '', page: 1 })} className="underline">
              clear
            </Link>
          </>
        )}
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">No students match that search.</div>
        ) : (
          <>
            {/* Phones: one card per student, with a sort picker above. */}
            <div className="md:hidden">
              <div className="flex gap-1 overflow-x-auto px-3 py-2.5 border-b border-gray-100 text-xs">
                <span className="text-gray-400 py-1 pr-1 shrink-0">Sort:</span>
                {COLUMNS.map((c) => (
                  <SortLink key={c.sort} params={params} sort={c.sort} label={c.label} pill />
                ))}
              </div>
              <ul className="divide-y divide-gray-100">
                {rows.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/students/${s.id}`} className="block px-4 py-3.5 hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-900 text-[15px] truncate">{displayName(s)}</span>
                        <TierBadge level={s.tier_level} />
                      </div>
                      <div className="text-xs text-gray-400 truncate">{s.email}</div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          <SubscriptionStatus row={s} />
                        </span>
                        <span>
                          Joined <LocalTime value={s.joined_at} format="date" />
                        </span>
                        <span>
                          Active <LocalTime value={s.last_active_at} format="date" />
                        </span>
                        <span>
                          {s.questions} Qs · {formatPercent(s.correct, s.attempted)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tablets and up: a sortable table. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                    {COLUMNS.map((c) => (
                      <th key={c.sort} className={`px-4 py-2.5 font-semibold whitespace-nowrap ${c.className ?? ''}`}>
                        <SortLink params={params} sort={c.sort} label={c.label} />
                      </th>
                    ))}
                    <th className="pr-4" aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((s) => (
                    // The name link stretches over the whole row (after:inset-0), so any cell opens the student.
                    <tr key={s.id} className="relative hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 max-w-[260px]">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="font-medium text-gray-900 hover:underline block truncate after:absolute after:inset-0 after:content-['']"
                        >
                          {displayName(s)}
                        </Link>
                        <div className="text-xs text-gray-400 truncate">
                          {s.email}
                          {s.account_status !== 'active' && <span className="text-amber-600"> · {s.account_status}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge level={s.tier_level} />
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <SubscriptionStatus row={s} />
                        {s.plan_name && <div className="text-gray-400">{s.plan_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <LocalTime value={s.joined_at} format="date" />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <LocalTime value={s.last_active_at} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.questions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatPercent(s.correct, s.attempted)}</td>
                      <td className="pr-4 py-3 text-right text-gray-300" aria-hidden>
                        ›
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Pages">
          {params.page > 1 ? (
            <Link href={href(params, { page: params.page - 1 })} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-400 text-xs">
            Page {params.page} of {pages}
          </span>
          {params.page < pages ? (
            <Link href={href(params, { page: params.page + 1 })} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function SortLink({
  params,
  sort,
  label,
  pill = false,
}: {
  params: StudentListParams;
  sort: StudentSort;
  label: string;
  pill?: boolean;
}) {
  const active = params.sort === sort;
  const defaultDir = sort === 'name' ? 'asc' : 'desc';
  const dir = active ? (params.dir === 'asc' ? 'desc' : 'asc') : defaultDir;
  const arrow = active ? (params.dir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <Link
      href={href(params, { sort, dir, page: 1 })}
      className={
        pill
          ? `shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md ${active ? 'bg-gray-900 text-on-ink font-semibold' : 'text-gray-500 bg-gray-100'}`
          : `hover:text-gray-900 ${active ? 'text-gray-900' : ''}`
      }
    >
      {label}
      {arrow}
    </Link>
  );
}
