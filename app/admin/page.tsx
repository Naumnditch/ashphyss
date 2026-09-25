import Link from 'next/link';
import { AdminIcon, type AdminIconName } from '@/components/admin/AdminIcons';
import { ActivityMixChart, DailyActiveUsersChart, PracticeResultsChart } from '@/components/admin/OverviewCharts';
import { OVERVIEW_DAYS, getOverviewData, getPendingCounts, getRecentSignups, type DailyPoint } from '@/lib/admin/overview';

export const dynamic = 'force-dynamic';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-gray-100 text-gray-600',
};

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export default async function AdminOverviewPage() {
  const [data, pending, recent] = await Promise.all([getOverviewData(), getPendingCounts(), getRecentSignups()]);

  const attention: { label: string; count: number; href: string; icon: AdminIconName; action: string }[] = [
    { label: 'Teacher applications', count: pending.teacherApplications, href: '/admin/teacher-applications', icon: 'applications', action: 'Review' },
    { label: 'Payment receipts', count: pending.paymentReceipts, href: '/admin/payment-requests', icon: 'receipts', action: 'Check' },
    { label: 'Video requests', count: pending.videoRequests, href: '/admin/video-requests', icon: 'video', action: 'Answer' },
    { label: 'Tutoring to schedule', count: pending.tutoringToSchedule, href: '/admin/tutoring-bookings', icon: 'tutoring', action: 'Schedule' },
    { label: 'Unread messages', count: pending.unreadMessages, href: '/admin/messages?tab=unread', icon: 'messages', action: 'Reply' },
  ];
  const waiting = attention.reduce((sum, a) => sum + a.count, 0);

  const accuracy = data.attempts > 0 ? Math.round((data.correctAttempts / data.attempts) * 100) : null;
  const coverage = data.lessons > 0 ? Math.round((data.lessonsWithPractice / data.lessons) * 100) : 0;
  const activeDays = data.daily.filter((d) => d.activeUsers > 0).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {waiting === 0 ? 'Nothing is waiting on you.' : `${waiting} item${waiting === 1 ? '' : 's'} waiting on you.`} Charts cover the
          last {OVERVIEW_DAYS} days.
        </p>
      </header>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Needs your attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {attention.map((item) => {
            const due = item.count > 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group rounded-xl border p-4 transition-all hover:shadow-sm ${
                  due ? 'border-amber-300 bg-amber-50 hover:border-amber-400' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-lg p-2 ${due ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                    <AdminIcon name={item.icon} />
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${due ? 'text-amber-800' : 'text-green-700'}`}>
                    <AdminIcon name={due ? 'alert' : 'check'} className="w-4 h-4" />
                    {due ? `${item.action} →` : 'All clear'}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-600">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Headline numbers */}
      <section aria-label="Headline numbers" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Students" value={compact.format(data.students)} href="/admin/users?role=student" />
        <StatTile label="Active teachers" value={compact.format(data.teachers)} href="/admin/users?role=teacher" />
        <StatTile label="Active users, last 7 days" value={compact.format(data.activeUsers7d)} href="/admin/analytics" />
        <StatTile label={`Practice answers, last ${OVERVIEW_DAYS} days`} value={compact.format(data.attempts)} href="/teacher/analytics" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <ChartCard
          className="xl:col-span-3"
          title="Daily active users"
          subtitle={`Students and staff who did anything on the site · active on ${activeDays} of the last ${OVERVIEW_DAYS} days`}
          table={<DailyTable data={data.daily} columns={[['activeUsers', 'Active users']]} />}
        >
          <DailyActiveUsersChart data={data.daily} />
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="What students did"
          subtitle={`All tracked actions, last ${OVERVIEW_DAYS} days`}
          table={
            <SimpleTable
              head={['Action', 'Count']}
              rows={data.activityMix.map((a) => [a.label, a.count])}
            />
          }
        >
          <ActivityMixChart data={data.activityMix} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <ChartCard
          className="xl:col-span-3"
          title="Practice answers"
          subtitle="Correct and incorrect answers submitted each day"
          table={<DailyTable data={data.daily} columns={[['correct', 'Correct'], ['incorrect', 'Incorrect']]} />}
        >
          <PracticeResultsChart data={data.daily} />
        </ChartCard>
        <div className="xl:col-span-2 grid gap-4 content-start">
          <MeterCard
            title="Practice accuracy"
            value={accuracy === null ? '—' : `${accuracy}%`}
            percent={accuracy ?? 0}
            detail={
              accuracy === null
                ? `No practice answers in the last ${OVERVIEW_DAYS} days.`
                : `${data.correctAttempts} of ${data.attempts} answers correct in the last ${OVERVIEW_DAYS} days.`
            }
            href="/teacher/analytics/problems"
            linkLabel="Question health"
          />
          <MeterCard
            title="Lessons with practice questions"
            value={`${data.lessonsWithPractice} of ${data.lessons}`}
            percent={coverage}
            detail={`${coverage}% of lessons have questions; the other ${data.lessons - data.lessonsWithPractice} have none yet.`}
            href="/admin/curriculum"
            linkLabel="Curriculum"
          />
        </div>
      </div>

      <section aria-labelledby="signups-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="signups-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recent sign-ups
          </h2>
          <Link href="/admin/users" className="text-sm text-blue-600 hover:underline font-medium">
            All users →
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {recent.map((u) => (
            <div key={u.id} className="px-4 py-3 flex items-center gap-3">
              <span className="w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center">
                {`${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {u.first_name} {u.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] ?? ROLE_COLORS.student}`}>
                {u.role}
              </span>
              <span className="hidden sm:block text-xs text-gray-400 w-24 text-right tabular-nums">
                {new Date(u.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all">
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </Link>
  );
}

function ChartCard({
  title,
  subtitle,
  table,
  className = '',
  children,
}: {
  title: string;
  subtitle: string;
  table: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">{subtitle}</p>
      {children}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-900">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">{table}</div>
      </details>
    </section>
  );
}

function MeterCard({
  title,
  value,
  percent,
  detail,
  href,
  linkLabel,
}: {
  title: string;
  value: string;
  percent: number;
  detail: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
          {linkLabel} →
        </Link>
      </div>
      <p className="text-3xl font-semibold text-gray-900 mt-2">{value}</p>
      <div
        className="mt-3 h-2.5 rounded-full bg-[#cde2fb] overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={title}
      >
        <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">{detail}</p>
    </section>
  );
}

function DailyTable({ data, columns }: { data: DailyPoint[]; columns: [keyof DailyPoint, string][] }) {
  const rows = data.filter((d) => columns.some(([key]) => Number(d[key]) > 0));
  if (rows.length === 0) return <p className="text-xs text-gray-500">No activity in this period.</p>;
  return (
    <SimpleTable
      head={['Day', ...columns.map(([, label]) => label)]}
      rows={rows.map((d) => [new Date(`${d.day}T00:00:00`).toLocaleDateString(), ...columns.map(([key]) => Number(d[key]))])}
      note="Days with no activity are left out."
    />
  );
}

function SimpleTable({ head, rows, note }: { head: string[]; rows: (string | number)[][]; note?: string }) {
  return (
    <>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            {head.map((h, i) => (
              <th key={h} className={`py-1.5 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-gray-100 last:border-0">
              {row.map((cell, i) => (
                <td key={i} className={`py-1.5 ${i > 0 ? 'text-right tabular-nums text-gray-900' : 'text-gray-600'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="text-[11px] text-gray-400 mt-1.5">{note}</p>}
    </>
  );
}
