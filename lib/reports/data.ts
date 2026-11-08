/**
 * Builds one student's progress report from what the site already records:
 * practice answers (right / wrong / why / difficulty / time / hints), skips,
 * mastery, lesson and simulation use, time on site, and teacher notes.
 * Server-only; reads through the owner connection, always scoped to the one
 * student id the caller has already been authorised for (lib/reports/notes.ts).
 *
 * Reuses getStudentAnalytics (the admin analytics block) for the totals so
 * the report and /admin/students/[id] never disagree.
 */

import { query } from '@/lib/db/client';
import { getStudentAnalytics } from '@/lib/admin/studentAnalytics';
import { cheatSheetFor, cheatSheetHref } from '@/lib/cheatsheets';
import {
  CURRICULA,
  chapterLabel,
  courseChapterNumber,
  isCurriculumId,
  lessonTitle,
  topicCodeFor,
  type CurriculumId,
} from '@/lib/curricula';
import { listNotes } from '@/lib/reports/notes';
import {
  DIFFICULTY_NAMES,
  actionPlan,
  badges,
  calendarDays,
  displayName,
  progressScore,
  ratio,
  scoreBand,
  streaks,
  strengthsAndFocus,
  trendOf,
} from '@/lib/reports/insights';
import type { ReportChapter, ReportLesson, ReviseQuestion, StudentReport } from '@/lib/reports/types';

export const REPORT_TIMEZONE = 'Europe/Istanbul';
const n = (v: unknown) => Number(v ?? 0);

function lessonHrefs(topicId: string, c: CurriculumId) {
  return {
    practiceHref: `/practice/${topicId}?c=${c}`,
    lessonHref: `/lessons/${topicId}?c=${c}`,
    videoHref: `/dashboard?tab=videos&lesson=${topicId}`,
  };
}

function sheetFor(topicId: string, c: CurriculumId): string | null {
  try {
    const sheet = cheatSheetFor(topicId, c);
    return sheet ? cheatSheetHref(sheet) : null;
  } catch {
    return null;
  }
}

/**
 * Which chapter a lesson sits in *for the curriculum it was practised in*:
 * shared lessons live under an IGCSE chapter in the database, but an A Level
 * student practised "Coulomb's law" as 9702 Chapter 22, not IGCSE Chapter 17.
 */
export function chapterOf(
  r: Record<string, unknown>,
  c: CurriculumId,
  titles: Map<string, string>
): { key: string; label: string } {
  const code = topicCodeFor(r as never, c);
  const short = CURRICULA[c].shortName;
  if (c !== 'igcse' && code) {
    const head = code.split('.')[0];
    if (c === 'ib') {
      const no = 'ABCDE'.indexOf(head) + 1;
      const title = no > 0 ? titles.get(`IB:${no}`) : undefined;
      return { key: `ib:${head}`, label: `IB Theme ${head}${title ? ` · ${title}` : ''}` };
    }
    const no = courseChapterNumber(head);
    if (no !== null) {
      const title = titles.get(`9702:${no}`);
      return { key: `9702:${no}`, label: `${short} · ${chapterLabel('9702', no)}${title ? ` · ${title}` : ''}` };
    }
  }
  return {
    key: String(r.chapter_id),
    label: `${chapterLabel(r.course_code as string | null, Number(r.chapter_number))} · ${r.chapter_title}`,
  };
}

export async function getStudentReport(studentId: string): Promise<StudentReport | null> {
  const profile = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, u.school_name,
            s.name AS section_name, sc.name AS school
     FROM users u
     LEFT JOIN sections s ON s.id = u.section_id
     LEFT JOIN schools sc ON sc.id = COALESCE(s.school_id, u.school_id)
     WHERE u.id = $1`,
    [studentId]
  );
  const p = profile.rows[0];
  if (!p) return null;

  const [analytics, lessonRows, dayRows, trendRows, notes, todayRow, courseChapters] = await Promise.all([
    getStudentAnalytics(studentId, 12),
    query(
      `WITH latest AS (
         SELECT DISTINCT ON (problem_id) problem_id, is_correct
         FROM practice_attempts WHERE student_id = $1
         ORDER BY problem_id, created_at DESC
       )
       SELECT p.topic_id, t.topic_name, t.curriculum_ids,
              t.topic_code, t.as_topic_code, t.a_level_topic_code, t.ib_topic_code,
              c.id AS chapter_id, c.chapter_number, c.title AS chapter_title, co.code AS course_code,
              mode() WITHIN GROUP (ORDER BY p.curriculum_id) AS curriculum_id,
              COUNT(*)::int AS attempted,
              COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
              COUNT(DISTINCT a.problem_id)::int AS questions,
              (SELECT COUNT(*) FROM latest l JOIN problems p2 ON p2.id = l.problem_id
                WHERE p2.topic_id = p.topic_id AND l.is_correct)::int AS questions_right,
              AVG(LEAST(a.time_spent_ms, 1800000)) AS avg_ms,
              MAX(a.created_at) AS last_at,
              COALESCE(bool_or(tm.mastered), false) AS mastered
       FROM practice_attempts a
       JOIN problems p ON p.id = a.problem_id
       JOIN topics t ON t.id = p.topic_id
       JOIN chapters c ON c.id = t.chapter_id
       LEFT JOIN courses co ON co.id = c.course_id
       LEFT JOIN topic_mastery tm ON tm.student_id = a.student_id AND tm.topic_id = p.topic_id
       WHERE a.student_id = $1
       GROUP BY p.topic_id, t.topic_name, t.curriculum_ids, t.topic_code, t.as_topic_code, t.a_level_topic_code,
                t.ib_topic_code, c.id, c.chapter_number, c.title, co.code`,
      [studentId]
    ),
    // Every day with any recorded action, in the school's timezone.
    query(
      `WITH acts AS (
         SELECT created_at AS at FROM analytics_events WHERE user_id = $1 AND event_type <> 'page_view'
         UNION ALL SELECT created_at FROM practice_attempts WHERE student_id = $1
         UNION ALL SELECT accessed_at FROM solution_access_log WHERE user_id = $1
       )
       SELECT to_char((at AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
       FROM acts WHERE at > now() - interval '400 days'
       GROUP BY 1`,
      [studentId, REPORT_TIMEZONE]
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE created_at > now() - interval '14 days')::int AS r_n,
              COUNT(*) FILTER (WHERE created_at > now() - interval '14 days' AND is_correct)::int AS r_c,
              COUNT(*) FILTER (WHERE created_at <= now() - interval '14 days' AND created_at > now() - interval '28 days')::int AS p_n,
              COUNT(*) FILTER (WHERE created_at <= now() - interval '14 days' AND created_at > now() - interval '28 days' AND is_correct)::int AS p_c
       FROM practice_attempts WHERE student_id = $1`,
      [studentId]
    ),
    listNotes(studentId),
    query(`SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS today`, [REPORT_TIMEZONE]),
    query(
      `SELECT co.code, c.chapter_number, c.title FROM chapters c JOIN courses co ON co.id = c.course_id WHERE co.code IN ('9702', 'IB')`
    ),
  ]);
  const chapterTitles = new Map<string, string>(
    courseChapters.rows.map((r) => [`${r.code}:${r.chapter_number}`, String(r.title)])
  );

  const today = String(todayRow.rows[0].today);

  const lessons: ReportLesson[] = lessonRows.rows.map((r) => {
    const curriculumId: CurriculumId = isCurriculumId(r.curriculum_id) ? r.curriculum_id : 'igcse';
    const attempted = n(r.attempted);
    const correct = n(r.correct);
    const where = chapterOf(r, curriculumId, chapterTitles);
    return {
      topicId: r.topic_id,
      name: lessonTitle(String(r.topic_name), curriculumId),
      chapter: where.label,
      chapterKey: where.key,
      curriculumId,
      attempted,
      correct,
      accuracy: attempted ? correct / attempted : 0,
      questions: n(r.questions),
      questionsRight: n(r.questions_right),
      mastered: Boolean(r.mastered),
      avgTimeMs: r.avg_ms === null ? null : Number(r.avg_ms),
      lastAt: r.last_at ? new Date(r.last_at).toISOString() : null,
      sheetHref: sheetFor(r.topic_id, curriculumId),
      ...lessonHrefs(r.topic_id, curriculumId),
    };
  });
  lessons.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));

  const chapterMap = new Map<string, ReportChapter>();
  for (const l of lessons) {
    const ch = chapterMap.get(l.chapterKey) ?? { key: l.chapterKey, label: l.chapter, attempted: 0, correct: 0, accuracy: 0 };
    ch.attempted += l.attempted;
    ch.correct += l.correct;
    ch.accuracy = ch.attempted ? ch.correct / ch.attempted : 0;
    chapterMap.set(l.chapterKey, ch);
  }
  const chapters = Array.from(chapterMap.values()).sort((a, b) => b.attempted - a.attempted);

  const counts: Record<string, number> = {};
  for (const r of dayRows.rows) counts[r.day] = n(r.n);
  const { current, longest } = streaks(Object.keys(counts), today);
  const calendar = calendarDays(counts, today);

  const o = analytics.outcomes;
  const u = analytics.usage;
  const t = trendRows.rows[0] ?? {};
  const trend = trendOf({ answers: n(t.r_n), correct: n(t.r_c) }, { answers: n(t.p_n), correct: n(t.p_c) });

  const lessonById = new Map(lessons.map((l) => [l.topicId, l]));
  const revise: ReviseQuestion[] = analytics.missed.slice(0, 6).map((m) => {
    const l = m.topic_id ? lessonById.get(m.topic_id) : undefined;
    return {
      problemId: m.problem_id,
      topicId: m.topic_id,
      lesson: l?.name ?? m.topic_name,
      number: m.problem_number,
      question: m.question,
      wrongTries: m.wrong,
      stillWrong: !m.latest_correct,
      lastAnswer: m.last_answer,
      href: m.topic_id ? (l?.practiceHref ?? `/practice/${m.topic_id}`) : null,
    };
  });

  const { strengths, focus } = strengthsAndFocus(lessons);

  const latestNote = notes[0];
  let teacherFocus: StudentReport['teacherFocus'] = [];
  if (latestNote?.focusTopicIds.length) {
    const r = await query(`SELECT id, topic_name, curriculum_ids FROM topics WHERE id = ANY($1::uuid[])`, [latestNote.focusTopicIds]);
    const byId = new Map(r.rows.map((row) => [String(row.id), row]));
    teacherFocus = latestNote.focusTopicIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((row) => {
        const own = lessonById.get(String(row.id));
        const cur: CurriculumId = own?.curriculumId ?? ((row.curriculum_ids ?? []).find(isCurriculumId) as CurriculumId) ?? 'igcse';
        return { topicId: String(row.id), name: lessonTitle(String(row.topic_name), cur), href: `/practice/${row.id}?c=${cur}` };
      });
  }

  const difficulty = analytics.difficulty.map((d) => ({ ...d, label: DIFFICULTY_NAMES[d.level] ?? `Level ${d.level}` }));
  const mistakes = {
    wrongValue: o.wrongReasons.wrongValue,
    wrongUnit: o.wrongReasons.wrongUnit,
    unreadable: o.wrongReasons.unparseable,
    other: o.wrongReasons.other,
    total: o.wrongReasons.wrongValue + o.wrongReasons.wrongUnit + o.wrongReasons.unparseable + o.wrongReasons.other,
  };

  const mastered = Math.max(analytics.topicsMastered, lessons.filter((l) => l.mastered).length);
  const score = progressScore({
    answered: o.answered,
    right: o.right,
    firstTryRight: o.firstTryRight,
    activeDays30: u.activeDays30d,
    practised: lessons.length,
    mastered,
    inStartedLessons: o.answered + o.skipped + o.notReached,
  });
  const accuracy = ratio(o.right, o.answered);
  const firstTryAccuracy = ratio(o.firstTryRight, o.answered);

  const plan = actionPlan({
    answered: o.answered,
    accuracy,
    firstTryAccuracy,
    submissions: o.submissions,
    hintsUsed: o.hintsUsed,
    skipped: o.skipped,
    notReached: o.notReached,
    medianTimeMs: o.medianTimeMs,
    activeDays30: u.activeDays30d,
    mistakes,
    difficulty,
    focus,
    lessons,
    revise,
    trend,
    score: score.value,
    teacherFocus,
  });

  const curricula = Array.from(new Set(lessons.map((l) => CURRICULA[l.curriculumId].shortName)));

  return {
    generatedAt: new Date().toISOString(),
    student: {
      id: p.id,
      name: displayName(p.first_name, p.last_name, p.email),
      firstName: displayName(p.first_name, null, p.email).split(' ')[0],
      email: p.email,
      joinedAt: p.created_at ? new Date(p.created_at).toISOString() : null,
      className: p.section_name ?? null,
      schoolName: p.school ?? p.school_name ?? null,
      curricula,
    },
    score: { value: score.value, band: scoreBand(score.value, o.answered), parts: score.parts },
    kpis: {
      answered: o.answered,
      right: o.right,
      wrong: o.wrong,
      accuracy,
      firstTryAccuracy,
      answerAccuracy: ratio(o.correctSubmissions, o.submissions),
      submissions: o.submissions,
      mastered,
      practised: lessons.length,
      activeDays30: u.activeDays30d,
      minutes30: u.activeMinutes30d,
      totalMinutes: u.totalActiveMinutes,
      currentStreak: current,
      longestStreak: longest,
    },
    trend,
    lessons,
    strengths,
    focus,
    chapters,
    difficulty,
    mistakes,
    weekly: analytics.weeklyAnswers,
    calendar,
    revise,
    plan,
    badges: badges({
      answered: o.answered,
      accuracy,
      firstTryAccuracy,
      mastered,
      longestStreak: longest,
      activeDays30: u.activeDays30d,
      wrongUnit: mistakes.wrongUnit,
      hardCorrect: analytics.difficulty.filter((d) => d.level >= 4).reduce((s, d) => s + d.correct, 0),
      trend,
    }),
    habits: {
      medianTimeMs: o.medianTimeMs,
      hintsUsed: o.hintsUsed,
      hintRate: ratio(o.hintsUsed, o.submissions),
      skipped: o.skipped,
      notReached: o.notReached,
      practiceSessions: u.practiceSessions,
      lessonsOpened: u.lessonsOpened,
      simulations: u.simulationsStarted,
      solutions: u.solutionsOpened,
      videoRequests: u.videoRequests,
    },
    notes,
    teacherFocus,
  };
}
