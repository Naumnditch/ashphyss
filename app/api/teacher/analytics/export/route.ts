/**
 * GET /api/teacher/analytics/export?view=roster|topics|problems|student&studentId=...
 *
 * CSV for each analytics view. Every query is scoped to the viewer through
 * the same guard the pages use, so a teacher's export can only ever contain
 * their own students.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { canViewStudent } from '@/lib/practice/access';
import {
  getRoster,
  getTopicStats,
  getProblemHealth,
  getWrongAttempts,
} from '@/lib/practice/analytics';
import { toCsv, percent, seconds } from '@/lib/practice/csv';

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

const today = () => new Date().toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Please log in first' }, { status: 401 });
  }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not available for this account' }, { status: 403 });
  }

  const viewer = { id: user.id, role: user.role };
  const view = req.nextUrl.searchParams.get('view') ?? 'roster';
  const studentId = req.nextUrl.searchParams.get('studentId');

  if (view === 'roster') {
    const rows = await getRoster(viewer);
    return csvResponse(
      toCsv(rows, [
        { header: 'Student', value: (r) => `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() },
        { header: 'Email', value: (r) => r.email },
        { header: 'Topics practised', value: (r) => r.topics_practiced },
        { header: 'Topics mastered', value: (r) => r.topics_mastered },
        { header: 'Questions attempted', value: (r) => r.total_attempted },
        { header: 'Questions correct', value: (r) => r.total_correct },
        { header: 'Accuracy %', value: (r) => percent(r.accuracy) },
        { header: 'Time on task (s)', value: (r) => seconds(r.total_time_ms) },
        { header: 'Day streak', value: (r) => r.current_day_streak },
        { header: 'Last active', value: (r) => r.last_active_at },
      ]),
      `ashphys-roster-${today()}.csv`
    );
  }

  if (view === 'topics') {
    const rows = await getTopicStats(viewer, studentId ?? undefined);
    return csvResponse(
      toCsv(rows, [
        { header: 'Student ID', value: (r) => r.student_id },
        { header: 'Topic', value: (r) => r.topic_name },
        { header: 'Attempted', value: (r) => r.attempted },
        { header: 'Correct', value: (r) => r.correct },
        { header: 'Incorrect', value: (r) => r.incorrect },
        { header: 'Accuracy %', value: (r) => percent(r.accuracy) },
        { header: 'Avg time per question (s)', value: (r) => seconds(r.avg_time_ms) },
        { header: 'Hints used', value: (r) => r.hints_used },
        { header: 'Unreadable answers', value: (r) => r.unparseable },
        { header: 'Mastered', value: (r) => (r.mastered ? 'yes' : 'no') },
        { header: 'First practised', value: (r) => r.first_practiced_at },
        { header: 'Last practised', value: (r) => r.last_practiced_at },
      ]),
      `ashphys-topics-${today()}.csv`
    );
  }

  if (view === 'problems') {
    const rows = await getProblemHealth(viewer);
    return csvResponse(
      toCsv(rows, [
        { header: 'Question', value: (r) => r.problem_number },
        { header: 'Topic', value: (r) => r.topic_name },
        { header: 'Type', value: (r) => r.answer_type },
        { header: 'Attempts', value: (r) => r.total_attempts },
        { header: 'Students', value: (r) => r.distinct_students },
        { header: 'Success rate %', value: (r) => percent(r.success_rate) },
        { header: 'Unreadable answers %', value: (r) => percent(r.unparseable_rate) },
        { header: 'Avg attempts to first correct', value: (r) => r.avg_attempts_to_first_correct },
        { header: 'Flagged', value: (r) => (r.flagged ? r.flags.join('; ') : '') },
        { header: 'Last attempted', value: (r) => r.last_attempted_at },
        { header: 'Question text', value: (r) => r.question_text },
      ]),
      `ashphys-question-health-${today()}.csv`
    );
  }

  if (view === 'student' && studentId) {
    if (!(await canViewStudent(viewer, studentId, query))) {
      return NextResponse.json({ success: false, error: 'Not your student' }, { status: 403 });
    }
    const rows = await getWrongAttempts(viewer, studentId, 1000);
    return csvResponse(
      toCsv(rows, [
        { header: 'When', value: (r) => r.created_at },
        { header: 'Topic', value: (r) => r.topic_name },
        { header: 'Question', value: (r) => r.problem_number },
        { header: 'Their answer', value: (r) => r.raw_answer },
        { header: 'Read as', value: (r) => r.normalized_answer },
        { header: 'Expected', value: (r) => [r.answer_correct, r.answer_unit].filter(Boolean).join(' ') },
        { header: 'Reason', value: (r) => r.grade_reason },
        { header: 'Time (s)', value: (r) => seconds(r.time_spent_ms) },
        { header: 'Question text', value: (r) => r.question_text },
      ]),
      `ashphys-student-${studentId.slice(0, 8)}-${today()}.csv`
    );
  }

  return NextResponse.json({ success: false, error: 'Unknown export' }, { status: 400 });
}
