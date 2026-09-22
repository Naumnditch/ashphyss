/**
 * /teacher/analytics/[studentId] — one student in detail.
 *
 * The page refuses outright if this student isn't in one of the viewer's own
 * sections; every query underneath is scoped as well, so a wrong id returns
 * nothing rather than someone else's data.
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { canViewStudent } from '@/lib/practice/access';
import {
  getStudentSummary,
  getTopicStats,
  getDailyAccuracy,
  getWrongAttempts,
} from '@/lib/practice/analytics';
import { AccuracyOverTime, TopicAccuracy } from '@/components/teacher/PracticeCharts';

export const dynamic = 'force-dynamic';

const REASON_LABELS: Record<string, string> = {
  'wrong-value': 'Wrong value',
  'wrong-unit': 'Wrong unit',
  unparseable: 'Answer could not be read',
  close: 'Close — rounding',
  match: 'Correct',
};

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default async function StudentAnalyticsPage({ params }: { params: { studentId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');
  if (user.role === 'teacher' && user.status !== 'active') redirect('/teacher/pending');

  const viewer = { id: user.id, role: user.role };
  if (!(await canViewStudent(viewer, params.studentId, query))) notFound();

  const [summary, topics, daily, wrong] = await Promise.all([
    getStudentSummary(viewer, params.studentId),
    getTopicStats(viewer, params.studentId),
    getDailyAccuracy(viewer, params.studentId),
    getWrongAttempts(viewer, params.studentId),
  ]);

  if (!summary) notFound();

  const name = `${summary.first_name ?? ''} ${summary.last_name ?? ''}`.trim() || summary.email;
  const topicAccuracy = topics
    .map((t) => ({ topic_name: t.topic_name, accuracy: t.accuracy, attempted: t.attempted }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/teacher/analytics" className="text-sm text-gray-500 hover:text-gray-900">
        &larr; Back to class
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-gray-500 text-sm mt-1">{summary.email}</p>
        </div>
        <a
          href={`/api/teacher/analytics/export?view=student&studentId=${summary.student_id}`}
          className="text-sm font-semibold bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg self-start"
        >
          Export wrong answers
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <Stat label="Attempted" value={String(summary.total_attempted)} />
        <Stat label="Correct" value={String(summary.total_correct)} />
        <Stat
          label="Accuracy"
          value={summary.accuracy === null ? '—' : `${Math.round(summary.accuracy * 100)}%`}
        />
        <Stat label="Topics mastered" value={String(summary.topics_mastered)} />
        <Stat label="Time on task" value={formatDuration(summary.total_time_ms)} />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Per topic</h2>
        {topics.length === 0 ? (
          <p className="text-sm text-gray-400">No practice yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2 font-semibold">Topic</th>
                  <th className="px-3 py-2 font-semibold text-right">Attempted</th>
                  <th className="px-3 py-2 font-semibold text-right">Correct</th>
                  <th className="px-3 py-2 font-semibold text-right">Accuracy</th>
                  <th className="px-3 py-2 font-semibold text-right">Avg time</th>
                  <th className="px-3 py-2 font-semibold text-right">Mastered</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.topic_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2.5 text-gray-900">{t.topic_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{t.attempted}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{t.correct}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                      {Math.round(t.accuracy * 100)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">
                      {t.avg_time_ms === null ? '—' : `${Math.round(t.avg_time_ms / 1000)}s`}
                    </td>
                    <td className="px-3 py-2.5 text-right">{t.mastered ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Attempt timeline</h2>
          <AccuracyOverTime data={daily} />
        </section>
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Accuracy by topic</h2>
          <TopicAccuracy data={topicAccuracy} />
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Questions they got wrong</h2>
        <p className="text-xs text-gray-400 mb-4">
          Showing what they typed and how the grader read it, so you can tell a physics mistake
          from a formatting one.
        </p>
        {wrong.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing wrong yet.</p>
        ) : (
          <ul className="space-y-3">
            {wrong.map((attempt) => (
              <li key={attempt.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {attempt.problem_number !== null && (
                      <span className="font-semibold text-gray-500 mr-1.5">Q{attempt.problem_number}</span>
                    )}
                    {attempt.question_text}
                  </p>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {new Date(attempt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-gray-600">
                  <span>
                    Typed <span className="font-semibold text-gray-900">{attempt.raw_answer || '(blank)'}</span>
                  </span>
                  {attempt.grading_method === 'numeric' && attempt.normalized_answer && (
                    <span>
                      Read as <span className="font-semibold text-gray-900">{attempt.normalized_answer}</span>
                    </span>
                  )}
                  <span>
                    Expected{' '}
                    <span className="font-semibold text-gray-900">
                      {[attempt.answer_correct, attempt.answer_unit].filter(Boolean).join(' ')}
                    </span>
                  </span>
                  {attempt.grade_reason && (
                    <span
                      className={`font-semibold ${
                        attempt.grade_reason === 'unparseable' ? 'text-red-700' : 'text-gray-500'
                      }`}
                    >
                      {REASON_LABELS[attempt.grade_reason] ?? attempt.grade_reason}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
