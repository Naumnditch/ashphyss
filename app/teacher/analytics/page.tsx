/**
 * /teacher/analytics — class overview.
 *
 * Everything on this page is read through lib/practice/analytics, which
 * scopes every query to the students in this teacher's own sections.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getRoster,
  getTopicStats,
  getDailyAccuracy,
  getMasteryDistribution,
  getSectionCount,
  STRUGGLING_ACCURACY,
  INACTIVE_DAYS,
} from '@/lib/practice/analytics';
import { RosterTable } from '@/components/teacher/RosterTable';
import { AccuracyOverTime, TopicAccuracy, MasteryDistribution } from '@/components/teacher/PracticeCharts';

export const dynamic = 'force-dynamic';

export default async function TeacherAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');
  if (user.role === 'teacher' && user.status !== 'active') redirect('/teacher/pending');

  const viewer = { id: user.id, role: user.role };
  const [roster, topicStats, daily, mastery, sectionCount] = await Promise.all([
    getRoster(viewer),
    getTopicStats(viewer),
    getDailyAccuracy(viewer),
    getMasteryDistribution(viewer),
    getSectionCount(viewer),
  ]);

  // Per-topic accuracy across the whole class, not per student.
  const byTopic = new Map<string, { attempted: number; correct: number }>();
  for (const row of topicStats) {
    const entry = byTopic.get(row.topic_name) ?? { attempted: 0, correct: 0 };
    entry.attempted += row.attempted;
    entry.correct += row.correct;
    byTopic.set(row.topic_name, entry);
  }
  const topicAccuracy = [...byTopic.entries()]
    .map(([topic_name, totals]) => ({
      topic_name,
      attempted: totals.attempted,
      accuracy: totals.attempted === 0 ? 0 : totals.correct / totals.attempted,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const totalAttempted = roster.reduce((sum, r) => sum + r.total_attempted, 0);
  const totalCorrect = roster.reduce((sum, r) => sum + r.total_correct, 0);
  const activeStudents = roster.filter((r) => r.total_attempted > 0).length;
  const needAttention = roster.filter(
    (r) =>
      (r.accuracy !== null && r.accuracy < STRUGGLING_ACCURACY && r.total_attempted > 0) ||
      !r.last_active_at ||
      Date.now() - new Date(r.last_active_at).getTime() >= INACTIVE_DAYS * 86_400_000
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practice analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            How your students are doing on practice questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/teacher/analytics/problems"
            className="text-sm font-semibold border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
          >
            Question health
          </Link>
          <a
            href="/api/teacher/analytics/export?view=roster"
            className="text-sm font-semibold bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg"
          >
            Export CSV
          </a>
        </div>
      </div>

      {sectionCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-amber-900">
            You don&rsquo;t have a class yet, so there is nobody to report on.{' '}
            <Link href="/teacher/dashboard" className="font-semibold underline">
              Create a class
            </Link>{' '}
            and share its join code with your students — their practice will start appearing here
            straight away.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Students practising" value={`${activeStudents}/${roster.length}`} />
        <StatCard label="Questions attempted" value={String(totalAttempted)} />
        <StatCard
          label="Class accuracy"
          value={totalAttempted === 0 ? '—' : `${Math.round((totalCorrect / totalAttempted) * 100)}%`}
        />
        <StatCard label="Need attention" value={String(needAttention)} tone={needAttention > 0 ? 'warn' : 'plain'} />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Roster</h2>
        <RosterTable rows={roster} strugglingBelow={STRUGGLING_ACCURACY} inactiveDays={INACTIVE_DAYS} />
        <p className="text-xs text-gray-400 mt-2">
          Red means accuracy below {Math.round(STRUGGLING_ACCURACY * 100)}%. Amber means no practice
          in {INACTIVE_DAYS} days. Click a name for the full picture.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Accuracy over time">
          <AccuracyOverTime data={daily} />
        </ChartCard>
        <ChartCard title="Accuracy by topic" subtitle="Weakest first">
          <TopicAccuracy data={topicAccuracy} />
        </ChartCard>
        <ChartCard title="Mastery across the class" subtitle="Students per topic">
          <MasteryDistribution data={mastery} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'warn' }) {
  return (
    <div
      className={`border rounded-xl px-4 py-3 ${
        tone === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
