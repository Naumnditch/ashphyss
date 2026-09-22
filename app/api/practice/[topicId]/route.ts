/**
 * GET /api/practice/[topicId]
 * Returns the question set for a topic (without revealing correct
 * answers) plus the logged-in student's current mastery state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';

export async function GET(req: NextRequest, { params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Please log in first' }, { status: 401 });
  }

  const topicResult = await query(
    `SELECT t.id, t.topic_name, t.required_tier, c.id as chapter_id, c.chapter_number, c.title as chapter_title
     FROM topics t JOIN chapters c ON c.id = t.chapter_id
     WHERE t.id = $1`,
    [params.topicId]
  );
  if (topicResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Topic not found' }, { status: 404 });
  }
  const topic = topicResult.rows[0];

  const tier = await getUserTier(user.id);
  if (user.role !== 'admin' && tier < topic.required_tier) {
    return NextResponse.json({ success: false, error: 'This lesson requires a higher plan', locked: true, requiredTier: topic.required_tier }, { status: 403 });
  }

  const problemsResult = await query(
    `SELECT id, question_text, question_image_url, answer_type, explanation, difficulty_level, "order"
     FROM problems WHERE topic_id = $1 ORDER BY "order" ASC`,
    [params.topicId]
  );

  const problemIds = problemsResult.rows.map((p) => p.id);
  let optionsByProblem: Record<string, any[]> = {};
  if (problemIds.length > 0) {
    const optionsResult = await query(
      `SELECT id, problem_id, option_text, option_letter, "order"
       FROM problem_options WHERE problem_id = ANY($1) ORDER BY "order" ASC`,
      [problemIds]
    );
    optionsByProblem = optionsResult.rows.reduce((acc: Record<string, any[]>, o) => {
      (acc[o.problem_id] ||= []).push({ id: o.id, text: o.option_text, letter: o.option_letter });
      return acc;
    }, {});
  }

  const questions = problemsResult.rows.map((p) => ({
    id: p.id,
    questionText: p.question_text,
    imageUrl: p.question_image_url,
    answerType: p.answer_type,
    difficultyLevel: p.difficulty_level,
    options: optionsByProblem[p.id] || [],
  }));

  const masteryResult = await query(
    `SELECT correct_streak, best_streak, total_attempted, total_correct, mastered
     FROM topic_mastery WHERE student_id = $1 AND topic_id = $2`,
    [user.id, params.topicId]
  );
  const mastery = masteryResult.rows[0] || {
    correct_streak: 0,
    best_streak: 0,
    total_attempted: 0,
    total_correct: 0,
    mastered: false,
  };

  const simResult = await query(
    `SELECT title, url_path FROM simulations WHERE topic_id = $1 LIMIT 1`,
    [params.topicId]
  );

  return NextResponse.json({
    success: true,
    data: {
      topic: {
        id: topic.id,
        name: topic.topic_name,
        chapterId: topic.chapter_id,
        chapterNumber: topic.chapter_number,
        chapterTitle: topic.chapter_title,
      },
      questions,
      mastery: {
        correctStreak: mastery.correct_streak,
        bestStreak: mastery.best_streak,
        totalAttempted: mastery.total_attempted,
        totalCorrect: mastery.total_correct,
        mastered: mastery.mastered,
      },
      simulation: simResult.rows[0] || null,
    },
  });
}
