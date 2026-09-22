/**
 * GET /api/practice/[topicId]/worksheet[?answers=1]
 * Downloads a topic's practice questions as a printable PDF. The answer key
 * (?answers=1) is only ever built for a teacher or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { logEvent } from '@/lib/analytics/track';
import {
  renderWorksheetPdf,
  worksheetFilename,
  type WorksheetOption,
  type WorksheetProblem,
} from '@/lib/practice/worksheetPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', req.url));

  const topicResult = await query(
    `SELECT t.id, t.topic_name, t.required_tier, c.chapter_number, c.title AS chapter_title
     FROM topics t JOIN chapters c ON c.id = t.chapter_id
     WHERE t.id = $1`,
    [params.topicId]
  );
  const topic = topicResult.rows[0];
  if (!topic) return NextResponse.json({ success: false, error: 'Topic not found' }, { status: 404 });

  const tier = await getUserTier(user.id);
  if (user.role !== 'admin' && tier < topic.required_tier) {
    return NextResponse.json({ success: false, error: 'This lesson requires a higher plan' }, { status: 403 });
  }

  const isStaff = user.role === 'teacher' || user.role === 'admin';
  const showAnswers = isStaff && req.nextUrl.searchParams.get('answers') === '1';

  const problemsResult = await query(
    `SELECT id, problem_number, question_text, question_image_url, answer_type::text AS answer_type,
            answer_correct, answer_unit, difficulty_level
     FROM problems
     WHERE topic_id = $1
     ORDER BY COALESCE(problem_number, "order"), "order"`,
    [topic.id]
  );
  const problems = problemsResult.rows as WorksheetProblem[];
  if (problems.length === 0) {
    return NextResponse.json({ success: false, error: 'This lesson has no practice questions yet' }, { status: 404 });
  }

  const optionsResult = await query(
    `SELECT problem_id, option_text, option_letter, is_correct
     FROM problem_options WHERE problem_id = ANY($1) ORDER BY "order" ASC`,
    [problems.map((p) => p.id)]
  );

  const pdf = await renderWorksheetPdf({
    topic,
    problems,
    options: optionsResult.rows as WorksheetOption[],
    showAnswers,
  });

  await logEvent({
    userId: user.id,
    eventType: 'download',
    entityType: 'topic',
    entityId: topic.id,
    path: req.nextUrl.pathname,
    metadata: { kind: showAnswers ? 'worksheet_answer_key' : 'worksheet' },
  });

  const filename = worksheetFilename(topic.topic_name, showAnswers);
  const asciiName = filename.replace(/[^\x20-\x7e]/g, '').replace(/"/g, '');
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
