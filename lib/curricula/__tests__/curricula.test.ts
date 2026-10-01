import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CURRICULA,
  CURRICULUM_IDS,
  chapterLabel,
  compareTopicCodes,
  curriculumForTopic,
  defaultCurriculumForCourse,
  findSection,
  lessonTitle,
  parseCurriculum,
  syllabusRefLabel,
  topicCodeFor,
  tryParseCurriculum,
  type CurriculumId,
} from '..';
import { SYLLABI } from '../syllabi';
import { groupLessons, summarize, type LessonRow } from '../lessons';

function row(overrides: Partial<LessonRow>): LessonRow {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    topic_name: 'Lesson',
    order: 1,
    required_tier: 0,
    syllabus_reference: null,
    chapter_id: 'ch',
    chapter_number: 1,
    chapter_title: 'Chapter',
    course_code: '0625',
    question_count: 0,
    simulations: [],
    curriculum_ids: ['igcse'],
    topic_code: null,
    as_topic_code: null,
    a_level_topic_code: null,
    ib_topic_code: null,
    ...overrides,
  };
}

describe('parsing a curriculum', () => {
  it('accepts every curriculum id', () => {
    for (const id of CURRICULUM_IDS) expect(tryParseCurriculum(id)).toBe(id);
  });

  it('is forgiving about case, spacing and spelling of A Level', () => {
    expect(tryParseCurriculum(' AS ')).toBe('as');
    expect(tryParseCurriculum('A_LEVEL')).toBe('a-level');
    expect(tryParseCurriculum('alevel')).toBe('a-level');
    expect(tryParseCurriculum(['ib', 'as'])).toBe('ib');
  });

  it('rejects anything else', () => {
    expect(tryParseCurriculum('gcse')).toBeNull();
    expect(tryParseCurriculum('')).toBeNull();
    expect(tryParseCurriculum(undefined)).toBeNull();
    expect(tryParseCurriculum(42)).toBeNull();
    expect(parseCurriculum('nope')).toBe('igcse');
    expect(parseCurriculum('nope', 'ib')).toBe('ib');
  });
});

describe('question bank priority', () => {
  it('builds AS first, then A Level, then IGCSE, then IB', () => {
    const order = [...CURRICULUM_IDS].sort((a, b) => CURRICULA[a].priority - CURRICULA[b].priority);
    expect(order).toEqual(['as', 'a-level', 'igcse', 'ib']);
  });
});

describe('curriculumForTopic', () => {
  it('uses the requested curriculum when the lesson is in it', () => {
    expect(curriculumForTopic(['igcse', 'as', 'a-level'], 'as', 'igcse')).toBe('as');
  });

  it('falls back to the student’s own curriculum, then IGCSE', () => {
    expect(curriculumForTopic(['igcse', 'a-level'], 'as', 'a-level')).toBe('a-level');
    expect(curriculumForTopic(['igcse', 'a-level'], 'as', 'ib')).toBe('igcse');
    expect(curriculumForTopic(['igcse', 'as'], null, null)).toBe('igcse');
  });

  it('uses the lesson’s own curriculum when it is not an IGCSE lesson', () => {
    expect(curriculumForTopic(['as', 'a-level'], null, null)).toBe('as');
    expect(curriculumForTopic(['ib'], 'as', 'igcse')).toBe('ib');
  });

  it('treats a lesson with no tags as IGCSE, as every lesson was before curricula', () => {
    expect(curriculumForTopic(null, 'as')).toBe('igcse');
    expect(curriculumForTopic([], undefined)).toBe('igcse');
  });
});

describe('lesson naming', () => {
  it('keeps the coursebook number for IGCSE and drops it elsewhere', () => {
    expect(lessonTitle('2.3 Understanding acceleration', 'igcse')).toBe('2.3 Understanding acceleration');
    expect(lessonTitle('2.3 Understanding acceleration', 'as')).toBe('Understanding acceleration');
    expect(lessonTitle('Rearranging Equations', 'ib')).toBe('Rearranging Equations');
  });

  it('labels the syllabus reference the way the spec shows it', () => {
    expect(syllabusRefLabel('as', '2.1')).toBe('9702 AS – Topic 2.1');
    expect(syllabusRefLabel('igcse', '1.2')).toBe('0625 – Topic 1.2');
    expect(syllabusRefLabel('a-level', 'Maths')).toBe('9702 A Level – Mathematical requirements');
    expect(syllabusRefLabel('ib', 'Tool 3')).toBe('IB Physics – Tool 3');
    expect(syllabusRefLabel('ib', null)).toBe('IB Physics');
  });

  it('reads the right code column for each curriculum', () => {
    const topic = row({ topic_code: '1.2', as_topic_code: '2.1', a_level_topic_code: '2.1', ib_topic_code: 'A.1' });
    expect(topicCodeFor(topic, 'igcse')).toBe('1.2');
    expect(topicCodeFor(topic, 'as')).toBe('2.1');
    expect(topicCodeFor(topic, 'a-level')).toBe('2.1');
    expect(topicCodeFor(topic, 'ib')).toBe('A.1');
  });

  it('names chapters the way each course does', () => {
    expect(chapterLabel('0625', 3)).toBe('Chapter 3');
    expect(chapterLabel('9702', 12)).toBe('Chapter 12');
    expect(chapterLabel('IB', 2)).toBe('Theme B');
    expect(defaultCurriculumForCourse('9702', 15)).toBe('as');
    expect(defaultCurriculumForCourse('9702', 16)).toBe('a-level');
    expect(defaultCurriculumForCourse('IB', 1)).toBe('ib');
    expect(defaultCurriculumForCourse('0625', 5)).toBe('igcse');
  });
});

describe('compareTopicCodes', () => {
  it('orders numerically, part by part', () => {
    const codes = ['10.1', '2.1', '9.3', '1.10', '1.9', '4.5.6', '4.5.1', '4.10'];
    expect([...codes].sort(compareTopicCodes)).toEqual(['1.9', '1.10', '2.1', '4.5.1', '4.5.6', '4.10', '9.3', '10.1']);
  });

  it("slots the coursebook's P1 and P2 chapters between the numbered ones", () => {
    const codes = ['16.1', 'P1.4', '15.13', 'P2.1', '31.4', '1.1'];
    expect([...codes].sort(compareTopicCodes)).toEqual(['1.1', '15.13', 'P1.4', '16.1', '31.4', 'P2.1']);
  });

  it('orders IB subtopics by theme, skills first, uncoded last', () => {
    const codes = [null, 'B.2', 'A.10', 'Tool 3', 'A.2', 'Maths'];
    expect([...codes].sort(compareTopicCodes)).toEqual(['Maths', 'Tool 3', 'A.2', 'A.10', 'B.2', null]);
  });
});

describe('syllabus structure', () => {
  it('has unique section codes in every curriculum', () => {
    for (const id of CURRICULUM_IDS) {
      const codes = SYLLABI[id].flatMap((u) => u.sections.map((s) => s.code));
      expect(new Set(codes).size, id).toBe(codes.length);
    }
  });

  it("makes A Level the whole of AS plus the coursebook's chapters 16–31 and P2", () => {
    const as = SYLLABI.as.map((u) => u.code);
    const aLevel = SYLLABI['a-level'].map((u) => u.code);
    expect(aLevel.slice(0, as.length)).toEqual(as);
    expect(aLevel.slice(as.length)).toEqual([...Array.from({ length: 16 }, (_, i) => String(16 + i)), 'P2']);
  });

  it('follows the coursebook: AS is chapters 1–15 plus P1', () => {
    expect(SYLLABI.as.map((u) => u.code)).toEqual([
      'Maths',
      ...Array.from({ length: 15 }, (_, i) => String(1 + i)),
      'P1',
    ]);
  });

  it('resolves a code to its section, including a finer code under a listed one', () => {
    expect(findSection('as', '10.2')?.section.title).toBe("Ohm's law");
    expect(findSection('as', '12.1')?.unit.title).toBe('Waves');
    expect(findSection('as', '16.2')).toBeNull();
    expect(findSection('a-level', '16.2')?.unit.title).toBe('Circular motion');
    expect(findSection('as', 'P1.4')?.section.title).toBe('Precision, accuracy, errors and uncertainties');
    expect(findSection('igcse', '4.5.6')?.unit.title).toBe('Electricity and magnetism');
    expect(findSection('ib', 'E.5')?.section.title).toBe('Fusion and stars');
  });
});

describe('groupLessons', () => {
  it('groups IGCSE by coursebook chapter, in chapter order', () => {
    const rows = [
      row({ id: 'b', chapter_id: 'c2', chapter_number: 2, chapter_title: 'Describing Motion', topic_code: '1.2' }),
      row({ id: 'a', chapter_id: 'c1', chapter_number: 1, chapter_title: 'Making Measurements', topic_code: '1.1' }),
    ];
    const groups = groupLessons(rows, 'igcse');
    expect(groups.map((g) => g.label)).toEqual(['Chapter 1', 'Chapter 2']);
    expect(groups[0].chapterId).toBe('c1');
  });

  it('groups AS by syllabus unit, mixing shared and 9702 lessons', () => {
    const rows = [
      row({ id: 'kirchhoff', topic_name: "Kirchhoff's laws", curriculum_ids: ['as', 'a-level'], as_topic_code: '9.3', a_level_topic_code: '9.3', course_code: '9702', chapter_number: 9 }),
      row({ id: 'dt', topic_name: '2.2 Distance-time graphs', curriculum_ids: ['igcse', 'as', 'a-level'], topic_code: '1.2', as_topic_code: '2.8', a_level_topic_code: '2.8', chapter_number: 2 }),
      row({ id: 'suvat', topic_name: 'Equations of motion', curriculum_ids: ['as', 'a-level', 'ib'], as_topic_code: '2.8', a_level_topic_code: '2.8', ib_topic_code: 'A.1', course_code: '9702', chapter_number: 2 }),
      row({ id: 'igcse-only', topic_name: '1.1 Measuring length', topic_code: '1.1' }),
      row({ id: 'circles', topic_name: '3.7 Circular motion (extension)', curriculum_ids: ['igcse', 'a-level'], topic_code: '1.5.1', a_level_topic_code: '16.2', chapter_number: 3 }),
    ];
    const groups = groupLessons(rows, 'as');
    expect(groups.map((g) => `${g.label}: ${g.title}`)).toEqual([
      'Chapter 2: Accelerated motion',
      "Chapter 9: Kirchhoff's laws",
    ]);
    expect(groups[0].level).toBe('AS');
    // Within a unit, the IGCSE-coursebook lesson (chapter 2) and the 9702 one share code 2.1.
    expect(groups[0].lessons.map((l) => l.title)).toEqual(['Distance-time graphs', 'Equations of motion']);
    const shared = groups[0].lessons[0];
    expect(shared.topicCode).toBe('2.8');
    expect(shared.sectionTitle).toBe('The equations of motion');
    expect(shared.alsoIn).toEqual([
      { curriculumId: 'igcse', topicCode: '1.2' },
      { curriculumId: 'a-level', topicCode: '2.8' },
    ]);

    const aLevel = groupLessons(rows, 'a-level').map((g) => g.title);
    expect(aLevel).toEqual(['Accelerated motion', "Kirchhoff's laws", 'Circular motion']);
  });

  it('never drops a lesson whose code the syllabus doesn’t list', () => {
    const groups = groupLessons([row({ curriculum_ids: ['ib'], ib_topic_code: 'Z.9' })], 'ib');
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Other lessons');
  });

  it('returns nothing, not an error, for a curriculum with no lessons', () => {
    expect(groupLessons([row({})], 'ib')).toEqual([]);
    expect(summarize([])).toEqual({ lessons: 0, withSimulations: 0, withQuestions: 0, questions: 0 });
  });

  it('counts only the selected curriculum’s questions', () => {
    const groups = groupLessons(
      [
        row({ id: 'x', curriculum_ids: ['as', 'a-level'], as_topic_code: '6.1', a_level_topic_code: '6.1', question_count: 5, simulations: [{ id: 's', title: 'Spring', urlPath: '/simulations/spring' }] }),
        row({ id: 'y', curriculum_ids: ['as', 'a-level'], as_topic_code: '6.2', a_level_topic_code: '6.2' }),
      ],
      'as'
    );
    expect(summarize(groups)).toEqual({ lessons: 2, withSimulations: 1, withQuestions: 1, questions: 5 });
  });
});

describe('the multi-curriculum content seed', () => {
  const sql = readFileSync(
    path.resolve(__dirname, '../../../database/seeds/2026-09-29-multi-curriculum-content.sql'),
    'utf8'
  );

  const column: Record<string, CurriculumId> = {
    topic_code: 'igcse',
    as_topic_code: 'as',
    a_level_topic_code: 'a-level',
    ib_topic_code: 'ib',
  };

  it('only uses topic codes the syllabus actually has', () => {
    const unknown: string[] = [];
    // Existing lessons are tagged with UPDATE ... SET <column> = '<code>'.
    for (const m of sql.matchAll(/\b(topic_code|as_topic_code|a_level_topic_code|ib_topic_code) = '([^']+)'/g)) {
      const curriculumId = column[m[1]];
      if (!findSection(curriculumId, m[2])) unknown.push(`${curriculumId} ${m[2]}`);
    }
    // New lessons: ... ARRAY[...]::TEXT[], NULL, <as>, <a level>, <ib>, '<reference>')
    let newLessons = 0;
    for (const m of sql.matchAll(/::TEXT\[\], NULL, (NULL|'[^']+'), (NULL|'[^']+'), (NULL|'[^']+'), '/g)) {
      newLessons++;
      (['as', 'a-level', 'ib'] as const).forEach((curriculumId, i) => {
        const code = m[i + 1] === 'NULL' ? null : m[i + 1].slice(1, -1);
        if (code && !findSection(curriculumId, code)) unknown.push(`new lesson ${curriculumId} ${code}`);
      });
    }
    expect(newLessons).toBeGreaterThan(50);
    // Questions carry the code they test: ... '<curriculum>', '<code>', '<syllabus cite>' ...
    for (const m of sql.matchAll(/, '(igcse|as|a-level|ib)', '([^']+)', '(?:0625|9702|IB) /g)) {
      if (!findSection(m[1] as CurriculumId, m[2])) unknown.push(`question ${m[1]} ${m[2]}`);
    }
    expect(unknown).toEqual([]);
  });

  it('seeds question banks for every curriculum', () => {
    for (const id of CURRICULUM_IDS) {
      expect(sql.includes(`, '${id}', '`), id).toBe(true);
    }
  });
});
