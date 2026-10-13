-- 17.4 Coulomb's law (extension) is one shared lesson (topic c6c1d1f5-…) served
-- to IGCSE, A Level (9702 22.2) and IB (D.2), but its questions were all filed
-- under curriculum_id 'igcse', so the A Level and IB views of the lesson said
-- "There are no practice questions for this lesson yet".
--
-- This copies the IGCSE bank into an A Level bank and an IB bank, the same way
-- the circular-motion/gravitation challenge set fills both banks of its shared
-- lessons: same questions, answers, figures, explanations, marks, tolerances
-- and interactive-solution links, with the curriculum's own topic_code and
-- syllabus_cite.
--
-- Copied: every gradable row — Q1–58 and the CHALLENGING tier Q60–99. Not
-- copied: Q59, the unanswered "(a)/(b) four charges on a square" stub
-- (answer_correct NULL), which cannot be graded. The copies are numbered
-- contiguously 1–98 in the IGCSE order (so IGCSE Q60–99 are A Level/IB Q59–98).
--
-- Ids are derived from the source row id (md5 → uuid), so re-running is a no-op
-- (ON CONFLICT DO NOTHING) and the copies stay traceable to their source.
-- Run AFTER 2026-10-13-coulomb-challenge.sql.

INSERT INTO problems (id, chapter_id, topic_id, curriculum_id, topic_code, syllabus_cite, problem_number, "order",
                      question_text, question_markdown, question_image_url, difficulty_level, answer_type, answer_correct,
                      answer_unit, answer_unit_required, answer_tolerance, answer_sign_sensitive, answer_alternates,
                      explanation, points, solution_id)
SELECT md5('ashphys/problem/' || b.cur || '/coulomb-17.4-shared/' || p.id)::uuid,
       p.chapter_id, p.topic_id, b.cur, b.code, b.cite,
       row_number() OVER (PARTITION BY b.cur ORDER BY p.problem_number),
       row_number() OVER (PARTITION BY b.cur ORDER BY p.problem_number),
       p.question_text, p.question_markdown, p.question_image_url, p.difficulty_level, p.answer_type, p.answer_correct,
       p.answer_unit, p.answer_unit_required, p.answer_tolerance, p.answer_sign_sensitive, p.answer_alternates,
       p.explanation, p.points, p.solution_id
FROM problems p
CROSS JOIN (VALUES ('a-level', '22.2', '9702 coursebook 22.2 · Coulomb''s law'),
                   ('ib', 'D.2', 'IB D.2 Electric and magnetic fields')) AS b(cur, code, cite)
WHERE p.topic_id = 'c6c1d1f5-1c6b-4ab4-a15b-beea25426304'
  AND p.curriculum_id = 'igcse'
  AND p.answer_correct IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO problem_options (id, problem_id, option_text, option_letter, is_correct, "order")
SELECT md5('ashphys/option/' || b.cur || '/coulomb-17.4-shared/' || o.id)::uuid,
       md5('ashphys/problem/' || b.cur || '/coulomb-17.4-shared/' || p.id)::uuid,
       o.option_text, o.option_letter, o.is_correct, o."order"
FROM problem_options o
JOIN problems p ON p.id = o.problem_id
CROSS JOIN (VALUES ('a-level'), ('ib')) AS b(cur)
WHERE p.topic_id = 'c6c1d1f5-1c6b-4ab4-a15b-beea25426304'
  AND p.curriculum_id = 'igcse'
  AND p.answer_correct IS NOT NULL
ON CONFLICT (id) DO NOTHING;
