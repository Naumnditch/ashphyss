/**
 * POST /api/practice/[topicId]/submit
 * Body: { problemId, submittedAnswer, timeSpentMs?, hintUsed? }
 *
 * Grades the answer, appends it to practice_attempts (the source of truth)
 * and returns the mastery state derived from that log — IXL-style, a run of
 * MASTERY_STREAK correct answers marks the topic mastered and a wrong answer
 * resets the run.
 *
 * Grading happens here and only here: the client never sees the expected
 * answer, and attempts are only ever written from this route, so a student
 * cannot forge a correct attempt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { gradeNumeric, specFromProblem, type GradeReason } from '@/lib/grading/numericAnswer';
import { openPracticeSession, recordAttempt } from '@/lib/practice/attempts';

export async function POST(req: NextRequest, { params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Please log in first' }, { status: 401 });
  }

  const topicResult = await query(`SELECT required_tier FROM topics WHERE id = $1`, [params.topicId]);
  if (topicResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Topic not found' }, { status: 404 });
  }
  const tier = await getUserTier(user.id);
  if (tier < topicResult.rows[0].required_tier) {
    return NextResponse.json({ success: false, error: 'This lesson requires a higher plan' }, { status: 403 });
  }

  const { problemId, submittedAnswer, timeSpentMs, hintUsed } = await req.json();
  if (!problemId || submittedAnswer === undefined || submittedAnswer === null) {
    return NextResponse.json({ success: false, error: 'Missing answer' }, { status: 400 });
  }

  const problemResult = await query(
    `SELECT id, answer_type, answer_correct, explanation, chapter_id,
            answer_unit, answer_unit_required, answer_tolerance, answer_sign_sensitive, answer_alternates
     FROM problems WHERE id = $1 AND topic_id = $2`,
    [problemId, params.topicId]
  );
  if (problemResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
  }
  const problem = problemResult.rows[0];

  let isCorrect = false;
  let correctAnswerLabel = problem.answer_correct;
  let gradingMethod: 'mcq' | 'numeric' | 'text' = 'text';
  let gradeReason: GradeReason | null = null;
  let toleranceUsed: number | null = null;
  let normalizedAnswer: string | null = null;
  let feedback: string | null = null;

  if (problem.answer_type === 'multiple_choice') {
    gradingMethod = 'mcq';
    const correctOption = await query(
      `SELECT id, option_text FROM problem_options WHERE problem_id = $1 AND is_correct = TRUE LIMIT 1`,
      [problemId]
    );
    if (correctOption.rows.length > 0) {
      isCorrect = String(submittedAnswer) === String(correctOption.rows[0].id);
      correctAnswerLabel = correctOption.rows[0].option_text;
      gradeReason = isCorrect ? 'match' : 'wrong-value';
      normalizedAnswer = correctAnswerLabel;
    }
  } else if (problem.answer_type === 'numeric') {
    const spec = specFromProblem(problem);
    if (spec) {
      gradingMethod = 'numeric';
      toleranceUsed = spec.tolerance ?? 0.02;
      const result = gradeNumeric(String(submittedAnswer), spec);
      isCorrect = result.correct;
      gradeReason = result.reason;
      feedback = result.feedback;
      normalizedAnswer = result.parsedValue === null ? null : String(result.parsedValue);
      if (problem.answer_unit) correctAnswerLabel = `${problem.answer_correct} ${problem.answer_unit}`;
    } else {
      // The stored answer isn't a number — fall back to text comparison
      // rather than marking every submission wrong.
      isCorrect = String(submittedAnswer).trim().toLowerCase() === String(problem.answer_correct ?? '').trim().toLowerCase();
      gradeReason = isCorrect ? 'match' : 'wrong-value';
    }
  } else {
    isCorrect = String(submittedAnswer).trim().toLowerCase() === String(problem.answer_correct).trim().toLowerCase();
    gradeReason = isCorrect ? 'match' : 'wrong-value';
    normalizedAnswer = String(submittedAnswer).trim().toLowerCase();
  }

  // problem_submissions is kept in step with practice_attempts because the
  // admin analytics dashboard still reads it.
  await query(
    `INSERT INTO problem_submissions (student_id, problem_id, submitted_answer, is_correct, points_earned, time_spent_seconds)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.id,
      problemId,
      String(submittedAnswer),
      isCorrect,
      isCorrect ? 1 : 0,
      typeof timeSpentMs === 'number' ? Math.round(timeSpentMs / 1000) : null,
    ]
  );

  const sessionId = await openPracticeSession(user.id, params.topicId);
  const mastery = await recordAttempt({
    studentId: user.id,
    problemId,
    topicId: params.topicId,
    chapterId: problem.chapter_id,
    sessionId,
    rawAnswer: String(submittedAnswer),
    normalizedAnswer,
    isCorrect,
    gradingMethod,
    gradeReason,
    toleranceUsed,
    hintUsed: hintUsed === true,
    timeSpentMs: typeof timeSpentMs === 'number' && timeSpentMs >= 0 ? Math.round(timeSpentMs) : null,
  });

  return NextResponse.json({
    success: true,
    data: {
      isCorrect,
      correctAnswerLabel,
      explanation: problem.explanation,
      feedback,
      grading: {
        method: gradingMethod,
        reason: gradeReason,
        tolerance: toleranceUsed,
        readAs: normalizedAnswer,
      },
      mastery,
    },
  });
}
