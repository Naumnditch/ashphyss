/**
 * /admin/students/[id] — one student's profile, subscription, payment
 * history, summary stats and a filterable, paginated activity timeline.
 * Everything is fetched server-side (lib/admin/students.ts); admin-only via
 * app/admin/layout.tsx.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  STATS_WEEKS,
  getPaymentHistory,
  getStudentProfile,
  getStudentStats,
  getTimeline,
  type TimelineEntry,
} from '@/lib/admin/students';
import {
  ACTIVE_GAP_MINUTES,
  ACTIVITY_CATEGORIES,
  MIN_CHAPTER_ATTEMPTS,
  formatMinutes,
  formatPercent,
  parseTimelineFilters,
  strongestAndWeakest,
  timelineQuery,
  type ActivityCategory,
} from '@/lib/admin/studentHistory';
import { LocalTime } from '@/components/admin/LocalTime';
import { SubscriptionStatus, TierBadge, displayName } from '@/components/admin/StudentBits';

export const dynamic = 'force-dynamic';

const CATEGORY_TONE: Record<ActivityCategory, string> = {
  account: 'bg-gray-400',
  subscription: 'bg-violet-500',
  payment: 'bg-green-600',
  learning: 'bg-blue-500',
  practice: 'bg-amber-500',
  solution: 'bg-teal-600',
  request: 'bg-rose-500',
  page: 'bg-gray-300',
};

const CATEGORY_LABEL = Object.fromEntries(ACTIVITY_CATEGORIES.map((c) => [c.id, c.label])) as Record<
  ActivityCategory,
  string
>;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3.5 py-3 min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-900 tabular-nums truncate">{value}</div>
      {sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{children}</dd>
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'approved' || status === 'success') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'rejected' || status === 'failed') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function money(amount: string | number | null, currency?: string | null) {
  if (amount === null || amount === undefined) return '—';
  return `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;
}

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const profile = await getStudentProfile(params.id);
  if (!profile) notFound();

  const filters = parseTimelineFilters(searchParams);
  const [payments, stats, timeline] = await Promise.all([
    getPaymentHistory(profile.id),
    getStudentStats(profile.id),
    getTimeline(profile.id, filters),
  ]);

  const base = `/admin/students/${profile.id}`;
  const { strongest, weakest } = strongestAndWeakest(stats.chapters);
  const maxWeekMinutes = Math.max(1, ...stats.weekly.map((w) => w.activeMinutes));
  const totalActive = stats.weekly.reduce((sum, w) => sum + w.activeMinutes, 0);
  const activeWeeks = stats.weekly.filter((w) => w.activeMinutes > 0).length;

  return (
    <div>
      <Link href="/admin/students" className="text-sm text-gray-500 hover:text-gray-900">
        ← All students
      </Link>

      {/* Profile */}
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 break-words">{displayName(profile)}</h1>
          <p className="text-sm text-gray-500 break-all">{profile.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/access" className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            Manage access
          </Link>
          <Link href={`/admin/messages`} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            Messages
          </Link>
          <Link href={`/teacher/analytics/${profile.id}`} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            Practice drill-down
          </Link>
        </div>
      </div>

      <Section title="Profile & subscription">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
          <Field label="Current tier">
            <TierBadge level={profile.tier_level} />
          </Field>
          <Field label="Subscription">
            <SubscriptionStatus row={profile} />
          </Field>
          <Field label="Plan">
            {profile.plan_name ?? '—'}
            {profile.billing_cycle && <span className="text-gray-400"> · {profile.billing_cycle}</span>}
          </Field>
          <Field label="Started">
            <LocalTime value={profile.sub_start} format="date" />
          </Field>
          <Field label="Joined">
            <LocalTime value={profile.joined_at} format="date" />
          </Field>
          <Field label="Last active">
            <LocalTime value={profile.last_active_at} />
          </Field>
          <Field label="Last login">
            <LocalTime value={profile.last_login_at} />
          </Field>
          <Field label="Account">
            <span className={profile.account_status === 'active' ? '' : 'text-amber-700'}>{profile.account_status}</span>
            <span className="text-gray-400"> · {profile.active_devices} device{profile.active_devices === 1 ? '' : 's'}</span>
          </Field>
          {(profile.school_name || profile.section_name) && (
            <Field label="School / class">{[profile.school_name, profile.section_name].filter(Boolean).join(' · ')}</Field>
          )}
        </dl>
      </Section>

      {/* Summary stats */}
      <Section title="Summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Stat
            label="Questions"
            value={profile.attempted}
            sub={`${formatPercent(profile.correct, profile.attempted)} correct`}
          />
          <Stat label="Topics covered" value={stats.topicsPracticed} sub={`${stats.lessonsVisited} lessons opened · ${stats.topicsMastered} mastered`} />
          <Stat
            label="Strongest chapter"
            value={strongest ? formatPercent(strongest.correct, strongest.attempted) : '—'}
            sub={strongest ? strongest.label : `needs ${MIN_CHAPTER_ATTEMPTS}+ answers in a chapter`}
          />
          <Stat
            label="Weakest chapter"
            value={weakest ? formatPercent(weakest.correct, weakest.attempted) : '—'}
            sub={weakest ? weakest.label : 'needs two chapters with enough answers'}
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-gray-900">Time active per week</h3>
          <span className="text-xs text-gray-500">
            {formatMinutes(totalActive)} over the last {STATS_WEEKS} weeks · active in {activeWeeks}
          </span>
        </div>
        <div className="flex items-end gap-1 h-28" role="img" aria-label="Estimated active minutes per week">
          {stats.weekly.map((w) => (
            <div key={w.week} className="flex-1 h-full flex flex-col justify-end min-w-0" title={`Week of ${w.week}: ${formatMinutes(w.activeMinutes)} active, ${w.attempts} answers`}>
              <div
                className="rounded-t"
                style={{
                  height: `${w.activeMinutes ? Math.max(4, (w.activeMinutes / maxWeekMinutes) * 100) : 0}%`,
                  background: '#2a78d6',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1 text-[10px] text-gray-400">
          {stats.weekly.map((w, i) => (
            <div key={w.week} className="flex-1 text-center min-w-0 truncate">
              {i % 3 === 0 || i === stats.weekly.length - 1 ? w.week.slice(5) : ''}
            </div>
          ))}
        </div>
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer select-none">Show as a table</summary>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400">
                  <th className="py-1 pr-3 font-medium">Week of</th>
                  <th className="py-1 pr-3 font-medium text-right">Active</th>
                  <th className="py-1 pr-3 font-medium text-right">Answering</th>
                  <th className="py-1 font-medium text-right">Answers</th>
                </tr>
              </thead>
              <tbody>
                {stats.weekly.map((w) => (
                  <tr key={w.week} className="border-t border-gray-100">
                    <td className="py-1 pr-3">{w.week}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatMinutes(w.activeMinutes)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatMinutes(w.practiceMinutes)}</td>
                    <td className="py-1 text-right tabular-nums">{w.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="text-[11px] text-gray-400 mt-2">
          Estimated from the gaps between recorded actions (pages, lessons, answers, solutions): a gap of up to{' '}
          {ACTIVE_GAP_MINUTES} minutes counts as active, a longer one as a break. “Answering” is the time on questions as
          timed by the practice page (capped at 30 minutes per answer).
        </p>

        {stats.chapters.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-gray-900 mt-5 mb-2">Accuracy by chapter</h3>
            <ul className="space-y-2">
              {stats.chapters.map((c) => {
                const pct = c.attempted ? (c.correct / c.attempted) * 100 : 0;
                return (
                  <li key={c.chapter_id} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-700 truncate">{c.label}</span>
                      <span className="text-gray-500 tabular-nums shrink-0">
                        {formatPercent(c.correct, c.attempted)} · {c.correct}/{c.attempted}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#2a78d6' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Section>

      {/* Payments */}
      <Section
        title="Payment history"
        aside={
          <Link href="/admin/payment-requests" className="text-xs text-gray-500 underline">
            Receipt queue
          </Link>
        }
      >
        {payments.requests.length === 0 && payments.shopier.length === 0 ? (
          <p className="text-sm text-gray-400">No receipts or Shopier checkouts from this student.</p>
        ) : (
          <div className="space-y-5">
            {payments.requests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Bank-transfer receipts</h3>
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {payments.requests.map((r) => (
                    <li key={r.id} className="px-3.5 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                        {r.auto_approved && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            auto-approved
                          </span>
                        )}
                        <span className="font-medium text-gray-900">
                          {r.course_title ?? `${r.plan_name ?? 'No plan chosen'}${r.months ? ` · ${r.months} mo` : ''}`}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          <LocalTime value={r.created_at} />
                        </span>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                        <Field label="Amount claimed">{money(r.amount_claimed)}</Field>
                        <Field label="Amount read">{money(r.detected_amount, r.detected_currency)}</Field>
                        <Field label="Detected plan">
                          {r.detected_plan_name
                            ? `${r.detected_plan_name}${r.detected_months ? ` · ${r.detected_months} mo` : ''}`
                            : '—'}
                          {r.detection_confidence && <span className="text-gray-400"> ({r.detection_confidence})</span>}
                        </Field>
                        <Field label="Reviewed">
                          {r.reviewed_at ? <LocalTime value={r.reviewed_at} /> : '—'}
                          {r.reviewer_name && <span className="text-gray-400"> · {r.reviewer_name}</span>}
                        </Field>
                      </dl>
                      {(r.reference || r.admin_note || r.detection_note) && (
                        <p className="mt-1.5 text-xs text-gray-500 break-words">
                          {[r.reference && `Ref ${r.reference}`, r.admin_note, r.detection_note].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {payments.shopier.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Shopier checkouts</h3>
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {payments.shopier.map((o) => (
                    <li key={o.id} className="px-3.5 py-2.5 text-sm flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusTone(o.status)}`}>
                        {o.status === 'success' ? 'paid' : o.status}
                      </span>
                      <span className="text-gray-900">
                        {o.item_name ?? '—'}
                        {o.billing_cycle && <span className="text-gray-400"> · {o.billing_cycle}</span>}
                        {o.is_test && <span className="text-amber-700"> · test</span>}
                      </span>
                      <span className="text-gray-500 tabular-nums">{money(o.amount, o.currency)}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        <LocalTime value={o.created_at} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Timeline */}
      <Section title="Activity timeline">
        <form method="get" action={base} className="mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3">
            <label className="text-xs text-gray-500">
              From
              <input
                type="date"
                name="from"
                defaultValue={filters.from ?? ''}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900"
              />
            </label>
            <label className="text-xs text-gray-500">
              To
              <input
                type="date"
                name="to"
                defaultValue={filters.to ?? ''}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900"
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-xs text-gray-500 mb-1.5">Activity type</legend>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_CATEGORIES.map((c) => {
                const n = timeline.counts[c.id];
                return (
                  <label
                    key={c.id}
                    className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-full pl-2 pr-2.5 py-1 cursor-pointer has-[:checked]:bg-gray-100 has-[:checked]:border-gray-300"
                  >
                    <input type="checkbox" name="type" value={c.id} defaultChecked={filters.categories.includes(c.id)} className="h-3.5 w-3.5" />
                    <span className={`inline-block w-2 h-2 rounded-full ${CATEGORY_TONE[c.id]}`} aria-hidden />
                    <span className="text-gray-700">{c.label}</span>
                    {n !== undefined && <span className="text-gray-400 tabular-nums">{n}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button className="bg-gray-900 hover:bg-gray-800 text-on-ink text-sm font-semibold px-4 py-1.5 rounded-lg">
              Apply
            </button>
            <Link href={base} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              Reset
            </Link>
          </div>
        </form>

        {timeline.entries.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No recorded activity for these filters.</p>
        ) : (
          <Timeline entries={timeline.entries} />
        )}

        {(filters.page > 1 || timeline.hasMore) && (
          <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Timeline pages">
            {filters.page > 1 ? (
              <Link
                href={`${base}${timelineQuery(filters, { page: filters.page - 1 })}`}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">Page {filters.page}</span>
            {timeline.hasMore ? (
              <Link
                href={`${base}${timelineQuery(filters, { page: filters.page + 1 })}`}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="text-[11px] text-gray-400 mt-4">
          Logins, lessons and page views are recorded from 17 Sep 2026, practice answers from Jul 2026. Revocations,
          role/status changes and “sign out everywhere” are recorded from 16 Oct 2026; earlier ones left no trace.
        </p>
      </Section>
    </div>
  );
}

/** Newest first, each entry with its own timestamp in the viewer's timezone. */
function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="border-l border-gray-200 ml-1.5 space-y-3">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative pl-4">
          <span className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full ${CATEGORY_TONE[e.category]}`} aria-hidden />
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-xs text-gray-400 tabular-nums sm:w-40 shrink-0">
              <LocalTime value={e.at} />
            </span>
            <div className="min-w-0">
              <span className="text-sm text-gray-900">{e.title}</span>
              <span className="sr-only"> ({CATEGORY_LABEL[e.category]})</span>
              {e.detail && <p className="text-xs text-gray-500 break-words">{e.detail}</p>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
