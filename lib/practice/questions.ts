/**
 * Loads one curriculum's question bank for a lesson, WITHOUT the answers.
 * Shared by the practice session API and the public questions API; grading
 * only ever happens in the submit route.
 */

import { query } from '@/lib/db/client';
import type { CurriculumId } from '@/lib/curricula';

export interface PracticeOption {
  id: string;
  text: string;
  letter: string;
}

export interface PracticeQuestionRow {
  id: string;
  problem_number: number | null;
  question_text: string;
  question_image_url: string | null;
  answer_type: string;
  difficulty_level: number;
  points: number;
  topic_code: string | null;
  syllabus_cite: string | null;
  solution_id: string | null;
  solution_published: boolean | null;
  options: PracticeOption[];
}

export async function loadQuestionBank(topicId: string, curriculumId: CurriculumId): Promise<PracticeQuestionRow[]> {
  const problemsResult = await query(
    `SELECT p.id, p.problem_number, p.question_text, p.question_image_url, p.answer_type, p.difficulty_level, p.points,
            p.topic_code, p.syllabus_cite, p.solution_id, s.is_published AS solution_published
     FROM problems p
     LEFT JOIN solutions s ON s.id = p.solution_id
     WHERE p.topic_id = $1 AND p.curriculum_id = $2
     ORDER BY COALESCE(p.problem_number, p."order"), p."order"`,
    [topicId, curriculumId]
  );

  const problemIds = problemsResult.rows.map((p) => p.id);
  const optionsByProblem: Record<string, PracticeOption[]> = {};
  if (problemIds.length > 0) {
    const optionsResult = await query(
      `SELECT id, problem_id, option_text, option_letter, "order"
       FROM problem_options WHERE problem_id = ANY($1) ORDER BY "order" ASC`,
      [problemIds]
    );
    for (const o of optionsResult.rows) {
      (optionsByProblem[o.problem_id] ||= []).push({ id: o.id, text: o.option_text, letter: o.option_letter });
    }
  }

  return problemsResult.rows.map((p) => ({ ...p, options: optionsByProblem[p.id] || [] }));
}
