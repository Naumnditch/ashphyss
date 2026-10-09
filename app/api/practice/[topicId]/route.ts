/**
 * GET /api/practice/[topicId][?curriculum=as]
 * Returns one curriculum's question set for a topic (without revealing
 * correct answers) plus the logged-in student's current mastery state.
 *
 * A lesson can belong to several curricula, each with its own question bank.
 * With no ?curriculum the student's saved curriculum is used when the lesson
 * is part of it, otherwise IGCSE, so links from before curricula existed
 * still open the IGCSE bank.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { CURRICULA, curriculumForTopic } from '@/lib/curricula';
import { getUserCurriculum } from '@/lib/curricula/queries';
import { loadQuestionBank } from '@/lib/practice/questions';

export async function GET(req: NextRequest, { params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Please log in first' }, { status: 401 });
  }

  const topicResult = await query(
    `SELECT t.id, t.topic_name, t.required_tier, t.curriculum_ids, c.id as chapter_id, c.chapter_number, c.title as chapter_title
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

  const curriculumId = curriculumForTopic(
    topic.curriculum_ids,
    req.nextUrl.searchParams.get('curriculum'),
    await getUserCurriculum(user.id)
  );
  const bank = await loadQuestionBank(params.topicId, curriculumId);

  // The student's latest answer to each question, so their progress map
  // survives a reload.
  const latestResult = await query(
    `SELECT DISTINCT ON (problem_id) problem_id, is_correct
     FROM practice_attempts
     WHERE student_id = $1 AND topic_id = $2
     ORDER BY problem_id, created_at DESC`,
    [user.id, params.topicId]
  );
  const lastCorrect = new Map<string, boolean>(latestResult.rows.map((r) => [r.problem_id, r.is_correct]));

  const questions = bank.map((p, i) => ({
    id: p.id,
    number: p.problem_number ?? i + 1,
    lastResult: lastCorrect.has(p.id) ? (lastCorrect.get(p.id) ? 'correct' : 'wrong') : null,
    questionText: p.question_text,
    imageUrl: p.question_image_url,
    answerType: p.answer_type,
    difficultyLevel: p.difficulty_level,
    marks: p.points,
    options: p.options,
    solutionId: p.solution_id && p.solution_published ? p.solution_id : null,
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
      curriculum: { id: curriculumId, name: CURRICULA[curriculumId].displayName },
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
