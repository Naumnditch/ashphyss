/**
 * Shapes a curriculum's lessons for display. Pure: no database, so it can be
 * unit tested and used from client components.
 */

import {
  CURRICULA,
  compareTopicCodes,
  findSection,
  lessonTitle,
  syllabusFor,
  topicCodeFor,
  topicInCurriculum,
  type CurriculumId,
  type CurriculumTopicFields,
} from './index';

export interface LessonSimulation {
  id: string;
  title: string;
  urlPath: string;
}

/** A `topics` row as the curriculum queries return it. */
export interface LessonRow extends CurriculumTopicFields {
  id: string;
  order: number | null;
  required_tier: number;
  syllabus_reference: string | null;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  course_code: string | null;
  question_count: number;
  simulations: LessonSimulation[];
}

/** A lesson as one curriculum presents it. */
export interface CurriculumLesson {
  id: string;
  title: string;
  topicCode: string | null;
  /** The syllabus section the code points at, e.g. "Equations of motion". */
  sectionTitle: string | null;
  syllabusReference: string | null;
  requiredTier: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  questionCount: number;
  simulations: LessonSimulation[];
  /** Other curricula that list this same lesson, with their code for it. */
  alsoIn: { curriculumId: CurriculumId; topicCode: string | null }[];
}

export interface LessonGroup {
  key: string;
  /** "Chapter 2", "Unit 10", "Theme A", "Mathematical requirements". */
  label: string;
  title: string;
  level?: string;
  /** IGCSE groups are coursebook chapters, so they link to the chapter page. */
  chapterId?: string;
  lessons: CurriculumLesson[];
}

export function toCurriculumLesson(row: LessonRow, curriculumId: CurriculumId): CurriculumLesson {
  const topicCode = topicCodeFor(row, curriculumId);
  const found = findSection(curriculumId, topicCode);
  return {
    id: row.id,
    title: lessonTitle(row.topic_name, curriculumId),
    topicCode,
    sectionTitle: found?.section.title ?? null,
    syllabusReference: row.syllabus_reference,
    requiredTier: row.required_tier ?? 0,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    chapterTitle: row.chapter_title,
    questionCount: Number(row.question_count) || 0,
    simulations: row.simulations ?? [],
    alsoIn: (row.curriculum_ids ?? [])
      .filter((c): c is CurriculumId => c !== curriculumId && c in CURRICULA)
      .map((c) => ({ curriculumId: c, topicCode: topicCodeFor(row, c) })),
  };
}

function unitLabel(curriculumId: CurriculumId, unitCode: string): string {
  if (unitCode === 'Maths' || unitCode === 'Tools') return 'Skills';
  if (curriculumId === 'ib') return `Theme ${unitCode}`;
  if (curriculumId === 'igcse') return `Topic ${unitCode}`;
  // AS and A Level follow the coursebook, whose practical-skills chapters are
  // numbered P1 and P2 rather than with an ordinary chapter number.
  if (/^P\d+$/.test(unitCode)) return unitCode;
  return `Chapter ${unitCode}`;
}

/**
 * Groups lessons the way the curriculum itself is organised.
 *
 * IGCSE follows the coursebook the lessons were written from, so it groups by
 * chapter, as the site always has. AS, A Level and IB group by syllabus unit —
 * for 9702 those units are the coursebook's own chapters — because their
 * lessons come from more than one course: a
 * shared IGCSE lesson with a simulation sits in the same unit as the 9702
 * lessons around it. Lessons whose code matches no unit land in a final
 * "Other lessons" group rather than disappearing.
 */
export function groupLessons(rows: LessonRow[], curriculumId: CurriculumId): LessonGroup[] {
  const lessons = rows.filter((r) => topicInCurriculum(r, curriculumId));

  if (curriculumId === 'igcse') {
    const byChapter = new Map<string, LessonGroup>();
    const sorted = [...lessons].sort((a, b) => a.chapter_number - b.chapter_number || (a.order ?? 0) - (b.order ?? 0));
    for (const row of sorted) {
      let group = byChapter.get(row.chapter_id);
      if (!group) {
        group = {
          key: row.chapter_id,
          label: `Chapter ${row.chapter_number}`,
          title: row.chapter_title,
          chapterId: row.chapter_id,
          lessons: [],
        };
        byChapter.set(row.chapter_id, group);
      }
      group.lessons.push(toCurriculumLesson(row, curriculumId));
    }
    return [...byChapter.values()];
  }

  const groups: LessonGroup[] = syllabusFor(curriculumId).map((unit) => ({
    key: unit.code,
    label: unitLabel(curriculumId, unit.code),
    title: unit.title,
    level: unit.level,
    lessons: [],
  }));
  const other: LessonGroup = { key: 'other', label: 'More', title: 'Other lessons', lessons: [] };

  const sorted = [...lessons].sort(
    (a, b) =>
      compareTopicCodes(topicCodeFor(a, curriculumId), topicCodeFor(b, curriculumId)) ||
      a.chapter_number - b.chapter_number ||
      (a.order ?? 0) - (b.order ?? 0)
  );
  for (const row of sorted) {
    const found = findSection(curriculumId, topicCodeFor(row, curriculumId));
    const group = found ? groups.find((g) => g.key === found.unit.code) : undefined;
    (group ?? other).lessons.push(toCurriculumLesson(row, curriculumId));
  }

  return [...groups, other].filter((g) => g.lessons.length > 0);
}

export interface CurriculumSummary {
  lessons: number;
  withSimulations: number;
  withQuestions: number;
  questions: number;
}

export function summarize(groups: LessonGroup[]): CurriculumSummary {
  const all = groups.flatMap((g) => g.lessons);
  return {
    lessons: all.length,
    withSimulations: all.filter((l) => l.simulations.length > 0).length,
    withQuestions: all.filter((l) => l.questionCount > 0).length,
    questions: all.reduce((n, l) => n + l.questionCount, 0),
  };
}
