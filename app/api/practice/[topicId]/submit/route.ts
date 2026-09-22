/**
 * POST /api/practice/[topicId]/submit
 * Body: { problemId: string, submittedAnswer: string }
 *
 * Grades the answer, records the submission, and updates the
 * student's mastery streak for this topic (IXL-style: a streak of
 * MASTERY_STREAK correct answers in a row marks the topic mastered;
 * a wrong answer resets the streak to 0).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { gradeNumeric, specFromProblem, type GradeReason } from '@/lib/grading/numericAnswer';

const MASTERY_STREAK = 5;

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

  const { problemId, submittedAnswer } = await req.json();
  if (!problemId || submittedAnswer === undefined || submittedAnswer === null) {
    return NextResponse.json({ success: false, error: 'Missing answer' }, { status: 400 });
  }

  const problemResult = await query(
    `SELECT id, answer_type, answer_correct, explanation,
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

  await query(
    `INSERT INTO problem_submissions (student_id, problem_id, submitted_answer, is_correct, points_earned)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, problemId, String(submittedAnswer), isCorrect, isCorrect ? 1 : 0]
  );

  const existing = await query(
    `SELECT correct_streak, best_streak, total_attempted, total_correct, mastered
     FROM topic_mastery WHERE student_id = $1 AND topic_id = $2`,
    [user.id, params.topicId]
  );

  let newStreak: number;
  let bestStreak: number;
  let totalAttempted: number;
  let totalCorrect: number;

  if (existing.rows.length === 0) {
    newStreak = isCorrect ? 1 : 0;
    bestStreak = newStreak;
    totalAttempted = 1;
    totalCorrect = isCorrect ? 1 : 0;
    await query(
      `INSERT INTO topic_mastery (student_id, topic_id, correct_streak, best_streak, total_attempted, total_correct, mastered, mastered_at, last_practiced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        user.id,
        params.topicId,
        newStreak,
        bestStreak,
        totalAttempted,
        totalCorrect,
        newStreak >= MASTERY_STREAK,
        newStreak >= MASTERY_STREAK ? new Date() : null,
      ]
    );
  } else {
    const prev = existing.rows[0];
    newStreak = isCorrect ? prev.correct_streak + 1 : 0;
    bestStreak = Math.max(prev.best_streak, newStreak);
    totalAttempted = prev.total_attempted + 1;
    totalCorrect = prev.total_correct + (isCorrect ? 1 : 0);
    const justMastered = !prev.mastered && newStreak >= MASTERY_STREAK;

    await query(
      `UPDATE topic_mastery
       SET correct_streak = $1, best_streak = $2, total_attempted = $3, total_correct = $4,
           mastered = $5, mastered_at = COALESCE(mastered_at, $6), last_practiced_at = NOW(), updated_at = NOW()
       WHERE student_id = $7 AND topic_id = $8`,
      [
        newStreak,
        bestStreak,
        totalAttempted,
        totalCorrect,
        newStreak >= MASTERY_STREAK || prev.mastered,
        justMastered ? new Date() : null,
        user.id,
        params.topicId,
      ]
    );
  }

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
      mastery: {
        correctStreak: newStreak,
        bestStreak,
        totalAttempted,
        totalCorrect,
        mastered: newStreak >= MASTERY_STREAK,
        streakNeeded: MASTERY_STREAK,
      },
    },
  });
}
