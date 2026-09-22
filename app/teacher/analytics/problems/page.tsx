/**
 * /teacher/analytics/problems — question health.
 *
 * This is the safety net for a repeat of the grading bug. A question whose
 * success rate collapses, or where students keep typing answers the grader
 * cannot read, is flagged here rather than discovered in a classroom.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getProblemHealth,
  LOW_SUCCESS_RATE,
  HIGH_UNPARSEABLE_RATE,
} from '@/lib/practice/analytics';

export const dynamic = 'force-dynamic';

export default async function ProblemHealthPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');
  if (user.role === 'teacher' && user.status !== 'active') redirect('/teacher/pending');

  const rows = await getProblemHealth({ id: user.id, role: user.role });
  const flagged = rows.filter((r) => r.flagged);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/teacher/analytics" className="text-sm text-gray-500 hover:text-gray-900">
        &larr; Back to class
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question health</h1>
          <p className="text-gray-500 text-sm mt-1">
            Questions are flagged when fewer than {Math.round(LOW_SUCCESS_RATE * 100)}% of attempts
            are right, or when more than {Math.round(HIGH_UNPARSEABLE_RATE * 100)}% of answers
            can&rsquo;t be read by the grader.
          </p>
        </div>
        <a
          href="/api/teacher/analytics/export?view=problems"
          className="text-sm font-semibold bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg self-start"
        >
          Export CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-gray-500">
            No practice attempts from your students yet, so there is nothing to check.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`rounded-xl px-5 py-4 mb-6 border ${
              flagged.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}
          >
            <p className={`text-sm ${flagged.length > 0 ? 'text-red-900' : 'text-green-900'}`}>
              {flagged.length === 0
                ? `All ${rows.length} questions with attempts are behaving normally.`
                : `${flagged.length} of ${rows.length} questions need a look.`}
            </p>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-2.5 font-semibold">Question</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Attempts</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Students</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Success</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Unreadable</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Tries to first correct</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.problem_id}
                    className={`border-b border-gray-100 last:border-0 ${row.flagged ? 'bg-red-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 max-w-xl">
                      <div className="text-gray-900 leading-relaxed">
                        {row.problem_number !== null && (
                          <span className="font-semibold text-gray-500 mr-1.5">Q{row.problem_number}</span>
                        )}
                        {row.question_text.length > 140
                          ? `${row.question_text.slice(0, 139)}…`
                          : row.question_text}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-gray-400">{row.topic_name}</span>
                        <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {row.answer_type === 'multiple_choice' ? 'MCQ' : row.answer_type}
                        </span>
                        {row.flags.map((flag) => (
                          <span
                            key={flag}
                            className="text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-800 px-1.5 py-0.5 rounded"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.total_attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.distinct_students}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        row.success_rate < LOW_SUCCESS_RATE ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {Math.round(row.success_rate * 100)}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        row.unparseable_rate > HIGH_UNPARSEABLE_RATE ? 'text-red-700 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {Math.round(row.unparseable_rate * 100)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {row.avg_attempts_to_first_correct === null
                        ? '—'
                        : row.avg_attempts_to_first_correct.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
