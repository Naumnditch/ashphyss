/**
 * /practice/[topicId]/worksheet — a printable question sheet.
 *
 * This is an ordinary server-rendered page styled for paper, not a generated
 * file: the browser's own print dialog turns it into a PDF. That keeps the
 * worksheet in step with the questions in the database, needs no PDF library
 * on a serverless runtime, and prints from a phone, a Chromebook or a school
 * computer without anything extra installed.
 *
 * The same tier gate as the practice page applies, and answers are only ever
 * put into the page for a teacher or admin who asked for the key.
 */

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { WorksheetToolbar } from '@/components/practice/WorksheetToolbar';
import {
  WorksheetDocument,
  WorksheetPrintStyles,
  type WorksheetProblem,
  type WorksheetOption,
} from '@/components/practice/WorksheetDocument';

export const dynamic = 'force-dynamic';

async function getTopic(topicId: string) {
  const result = await query(
    `SELECT t.id, t.topic_name, t.required_tier,
            c.id AS chapter_id, c.chapter_number, c.title AS chapter_title
     FROM topics t JOIN chapters c ON c.id = t.chapter_id
     WHERE t.id = $1`,
    [topicId]
  );
  return result.rows[0] || null;
}

export default async function WorksheetPage({
  params,
  searchParams,
}: {
  params: { topicId: string };
  searchParams: { answers?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const topic = await getTopic(params.topicId);
  if (!topic) notFound();

  const tier = await getUserTier(user.id);
  if (tier < topic.required_tier) redirect(`/practice/${topic.id}`);

  // Only staff may ever see the answers, and the key is only built into the
  // page when they explicitly ask for it.
  const maySeeAnswers = user.role === 'teacher' || user.role === 'admin';
  const showAnswers = maySeeAnswers && searchParams.answers === '1';

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
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-sm text-gray-500">
          There are no practice questions for this lesson yet, so there is nothing to print.
        </p>
        <Link href={`/practice/${topic.id}`} className="text-sm text-blue-600 hover:underline mt-3 inline-block">
          Back to practice
        </Link>
      </div>
    );
  }

  const optionsResult = await query(
    `SELECT id, problem_id, option_text, option_letter, is_correct
     FROM problem_options WHERE problem_id = ANY($1) ORDER BY "order" ASC`,
    [problems.map((p) => p.id)]
  );

  // Never hand the client the correct flag unless the key was asked for.
  const options = (optionsResult.rows as WorksheetOption[]).map((option) => ({
    ...option,
    is_correct: showAnswers ? option.is_correct : false,
  }));

  const answerKeyHref = maySeeAnswers
    ? showAnswers
      ? `/practice/${topic.id}/worksheet`
      : `/practice/${topic.id}/worksheet?answers=1`
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
      <WorksheetPrintStyles />
      <WorksheetToolbar
        backHref={`/practice/${topic.id}`}
        answerKeyHref={answerKeyHref}
        showingAnswers={showAnswers}
      />
      <WorksheetDocument
        topic={{
          id: topic.id,
          topic_name: topic.topic_name,
          chapter_number: topic.chapter_number,
          chapter_title: topic.chapter_title,
        }}
        problems={problems}
        options={options}
        showAnswers={showAnswers}
      />
    </div>
  );
}
