/**
 * The curricula a student can study on AshPhys, and the helpers that turn a
 * lesson row (a `topics` row) into what a given curriculum calls it.
 *
 * A lesson is one `topics` row. It can belong to several curricula at once
 * (`curriculum_ids`), carrying a separate syllabus code for each one
 * (`topic_code` for IGCSE, `as_topic_code`, `a_level_topic_code`,
 * `ib_topic_code`). Simulations hang off the lesson, so every curriculum that
 * lists the lesson gets them; practice questions carry their own
 * `curriculum_id`, so each curriculum has its own question bank.
 *
 * Pure data and pure functions only: safe to import from client components.
 */

import { SYLLABI, type SyllabusSection, type SyllabusUnit } from './syllabi';

export const CURRICULUM_IDS = ['igcse', 'as', 'a-level', 'ib'] as const;
export type CurriculumId = (typeof CURRICULUM_IDS)[number];

export const DEFAULT_CURRICULUM: CurriculumId = 'igcse';

/** Cookie the server reads to render the right curriculum on first paint. */
export const CURRICULUM_COOKIE = 'ashphys_curriculum';
/** localStorage key, so a logged-out visitor's choice survives a cleared cookie. */
export const CURRICULUM_STORAGE_KEY = 'selectedCurriculum';

export interface Curriculum {
  id: CurriculumId;
  name: string;
  displayName: string;
  shortName: string;
  syllabusCode: string;
  /** How the metadata line labels this syllabus, e.g. "9702 AS". */
  syllabusLabel: string;
  description: string;
  gradeLevel: string;
  /** Question bank creation priority: 1 is built first. */
  priority: number;
  /** Which `topics` column holds this curriculum's topic code. */
  topicCodeColumn: 'topic_code' | 'as_topic_code' | 'a_level_topic_code' | 'ib_topic_code';
}

export const CURRICULA: Record<CurriculumId, Curriculum> = {
  igcse: {
    id: 'igcse',
    name: 'IGCSE Physics',
    displayName: 'IGCSE (Cambridge 0625)',
    shortName: 'IGCSE',
    syllabusCode: '0625',
    syllabusLabel: '0625',
    description: 'Cambridge International General Certificate of Secondary Education',
    gradeLevel: '10',
    priority: 3,
    topicCodeColumn: 'topic_code',
  },
  as: {
    id: 'as',
    name: 'AS Level Physics',
    displayName: 'AS Level (Cambridge 9702)',
    shortName: 'AS Level',
    syllabusCode: '9702',
    syllabusLabel: '9702 AS',
    description: 'Cambridge International AS Level Physics: the first year of the 9702 A Level',
    gradeLevel: '11',
    priority: 1,
    topicCodeColumn: 'as_topic_code',
  },
  'a-level': {
    id: 'a-level',
    name: 'A Level Physics',
    displayName: 'A Level (Cambridge 9702)',
    shortName: 'A Level',
    syllabusCode: '9702',
    syllabusLabel: '9702 A Level',
    description: 'Cambridge International A Level Physics: every AS chapter plus the A Level chapters 16–31',
    gradeLevel: '12',
    priority: 2,
    topicCodeColumn: 'a_level_topic_code',
  },
  ib: {
    id: 'ib',
    name: 'IB Physics',
    displayName: 'IB Physics (SL & HL)',
    shortName: 'IB',
    syllabusCode: 'IB',
    syllabusLabel: 'IB Physics',
    description: 'International Baccalaureate Diploma Programme Physics, first assessment 2025',
    gradeLevel: '11–12',
    priority: 4,
    topicCodeColumn: 'ib_topic_code',
  },
};

/** Selector order: the order students meet them in. */
export const CURRICULUM_LIST: Curriculum[] = CURRICULUM_IDS.map((id) => CURRICULA[id]);

export function isCurriculumId(value: unknown): value is CurriculumId {
  return typeof value === 'string' && (CURRICULUM_IDS as readonly string[]).includes(value);
}

/** Parses untrusted input (a query param, a cookie, a request body) into a curriculum id, or null. */
export function tryParseCurriculum(value: unknown): CurriculumId | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== 'string') return null;
  const normalized = v.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'alevel' || normalized === 'a') return 'a-level';
  return isCurriculumId(normalized) ? normalized : null;
}

export function parseCurriculum(value: unknown, fallback: CurriculumId = DEFAULT_CURRICULUM): CurriculumId {
  return tryParseCurriculum(value) ?? fallback;
}

/** The subset of a `topics` row the curriculum helpers read. */
export interface CurriculumTopicFields {
  topic_name: string;
  curriculum_ids?: string[] | null;
  topic_code?: string | null;
  as_topic_code?: string | null;
  a_level_topic_code?: string | null;
  ib_topic_code?: string | null;
}

export function topicCodeFor(topic: CurriculumTopicFields, curriculumId: CurriculumId): string | null {
  return topic[CURRICULA[curriculumId].topicCodeColumn] ?? null;
}

export function topicInCurriculum(topic: CurriculumTopicFields, curriculumId: CurriculumId): boolean {
  return (topic.curriculum_ids ?? [DEFAULT_CURRICULUM]).includes(curriculumId);
}

/**
 * Lesson titles carry the IGCSE coursebook's section number ("2.3 Understanding
 * acceleration"). Under any other curriculum that number means nothing, so it
 * is dropped and that curriculum's own topic code is shown instead.
 */
export function lessonTitle(topicName: string, curriculumId: CurriculumId): string {
  if (curriculumId === 'igcse') return topicName;
  return stripSectionNumber(topicName);
}

export function stripSectionNumber(topicName: string): string {
  return topicName.replace(/^\d+(\.\d+)*\s+/, '');
}

/** "9702 AS – Topic 2.1", or just "9702 AS" when a lesson has no code yet. */
export function syllabusRefLabel(curriculumId: CurriculumId, topicCode: string | null): string {
  const c = CURRICULA[curriculumId];
  if (!topicCode) return c.syllabusLabel;
  if (topicCode === 'Maths') return `${c.syllabusLabel} – Mathematical requirements`;
  if (topicCode.startsWith('Tool')) return `${c.syllabusLabel} – ${topicCode}`;
  return `${c.syllabusLabel} – Topic ${topicCode}`;
}

export function syllabusFor(curriculumId: CurriculumId): SyllabusUnit[] {
  return SYLLABI[curriculumId];
}

/** Finds the syllabus section (and its unit) a topic code sits under. */
export function findSection(
  curriculumId: CurriculumId,
  topicCode: string | null
): { unit: SyllabusUnit; section: SyllabusSection } | null {
  if (!topicCode) return null;
  for (const unit of SYLLABI[curriculumId]) {
    for (const section of unit.sections) {
      if (section.code === topicCode) return { unit, section };
    }
  }
  // A code finer than the syllabus lists (4.2.1a) still belongs to its parent.
  for (const unit of SYLLABI[curriculumId]) {
    for (const section of unit.sections) {
      if (topicCode.startsWith(`${section.code}.`)) return { unit, section };
    }
  }
  return null;
}

/**
 * Splits a topic code into its comparable parts. The coursebook's practical
 * skills chapters are lettered (P1, P2) but sit between numbered chapters —
 * P1 after chapter 15, P2 after chapter 31 — so they sort as 15.5 and 31.5.
 */
function splitCode(code: string): string[] {
  const parts = code.split('.');
  if (parts[0] === 'P1') parts[0] = '15.5';
  else if (parts[0] === 'P2') parts[0] = '31.5';
  return parts;
}

/**
 * Orders topic codes the way a syllabus does: numerically part by part, so
 * 1.10 follows 1.9, and 10.1 follows 9.3. IB letters sort alphabetically
 * (A.1 … E.5). Skills codes (Maths, Tool 3) come first, as the groundwork,
 * and lessons with no code at all come last.
 */
export function compareTopicCodes(a: string | null, b: string | null): number {
  const group = (code: string | null) => (!code ? 2 : /^(P\d+|\d+|[A-Z])(\.\d+)*$/.test(code) ? 1 : 0);
  const ga = group(a);
  const gb = group(b);
  if (ga !== gb) return ga - gb;
  if (ga !== 1) return (a ?? '').localeCompare(b ?? '');

  const pa = splitCode(a!);
  const pb = splitCode(b!);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    if (pa[i] === pb[i]) continue;
    const x = Number(pa[i]);
    const y = Number(pb[i]);
    if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
    return pa[i].localeCompare(pb[i]);
  }
  return 0;
}

/**
 * Which curriculum's question bank to use for a lesson: the one asked for if
 * the lesson is part of it, else the student's own curriculum if the lesson
 * is part of that, else IGCSE (every link that predates curricula means the
 * IGCSE bank), else whichever curriculum the lesson belongs to first.
 */
export function curriculumForTopic(
  topicCurricula: readonly string[] | null | undefined,
  requested?: unknown,
  preferred?: CurriculumId | null
): CurriculumId {
  const serves = (topicCurricula && topicCurricula.length ? topicCurricula : [DEFAULT_CURRICULUM]).filter(isCurriculumId);
  const asked = tryParseCurriculum(requested);
  if (asked && serves.includes(asked)) return asked;
  if (preferred && serves.includes(preferred)) return preferred;
  if (serves.includes(DEFAULT_CURRICULUM)) return DEFAULT_CURRICULUM;
  return serves[0] ?? DEFAULT_CURRICULUM;
}

/**
 * The coursebook's two practical-skills chapters are lettered P1 and P2, not
 * numbered, but `chapters.chapter_number` is an integer — so they are stored
 * after chapter 31 and carry their coursebook label here.
 */
export const AS_PRACTICAL_CHAPTER = 32;
export const A_LEVEL_PRACTICAL_CHAPTER = 33;
const PRACTICAL_CHAPTERS: Record<number, string> = {
  [AS_PRACTICAL_CHAPTER]: 'P1',
  [A_LEVEL_PRACTICAL_CHAPTER]: 'P2',
};

/**
 * How a chapter is named in its course: IGCSE coursebook "Chapter 3", 9702
 * coursebook "Chapter 12", IB "Theme B" (IB chapters are numbered 1–5 for A–E).
 */
export function chapterLabel(courseCode: string | null | undefined, chapterNumber: number): string {
  if (courseCode === '9702') return PRACTICAL_CHAPTERS[chapterNumber] ?? `Chapter ${chapterNumber}`;
  if (courseCode === 'IB') return `Theme ${'ABCDE'[chapterNumber - 1] ?? chapterNumber}`;
  return `Chapter ${chapterNumber}`;
}

/** `courses.code` of the IGCSE course — the one the coursebook chapter lists show. */
export const IGCSE_COURSE_CODE = '0625';

/**
 * The curriculum a chapter page opens in when the URL doesn't say, taken from
 * which course the chapter belongs to: a 9702 chapter up to 15 is AS content,
 * 16 onwards is A Level only.
 */
export function defaultCurriculumForCourse(courseCode: string | null | undefined, chapterNumber: number): CurriculumId {
  if (courseCode === '9702') {
    if (chapterNumber === AS_PRACTICAL_CHAPTER) return 'as';
    if (chapterNumber === A_LEVEL_PRACTICAL_CHAPTER) return 'a-level';
    return chapterNumber <= 15 ? 'as' : 'a-level';
  }
  if (courseCode === 'IB') return 'ib';
  return 'igcse';
}

export type { SyllabusSection, SyllabusUnit };
