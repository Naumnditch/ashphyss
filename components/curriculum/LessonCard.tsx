import Link from 'next/link';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { CURRICULA, syllabusRefLabel, type CurriculumId } from '@/lib/curricula';
import type { CurriculumLesson } from '@/lib/curricula/lessons';
import { tierName } from '@/lib/subscriptions/getUserTier';

interface LessonCardProps {
  lesson: CurriculumLesson;
  selectedCurriculum: CurriculumId;
  /** The viewer's plan tier, to mark lessons they can't open yet. */
  tier: number;
  showMetadata?: boolean;
}

export function lessonHref(lessonId: string, curriculumId: CurriculumId) {
  return `/lessons/${lessonId}?c=${curriculumId}`;
}

/**
 * One lesson as the selected curriculum sees it: its topic code and syllabus
 * reference for THAT curriculum, the shared simulations, and a practice
 * button for that curriculum's own question bank.
 */
export function LessonCard({ lesson, selectedCurriculum, tier, showMetadata = true }: LessonCardProps) {
  const curriculum = CURRICULA[selectedCurriculum];
  const locked = tier < lesson.requiredTier;
  // IGCSE lesson titles already carry their coursebook number; everywhere
  // else the curriculum's own code leads.
  const showCodeChip = selectedCurriculum !== 'igcse' && lesson.topicCode && lesson.topicCode !== 'Maths';

  return (
    <li id={`lesson-${lesson.id}`} className="px-4 sm:px-5 py-4 scroll-mt-24 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showCodeChip && (
            <span className="font-mono text-xs font-semibold text-[#5a67d8] bg-[#eef0fd] px-2 py-0.5 rounded">
              {lesson.topicCode}
            </span>
          )}
          <Link
            href={lessonHref(lesson.id, selectedCurriculum)}
            className="font-semibold text-gray-900 hover:text-[#5a67d8] hover:underline"
          >
            {lesson.title}
          </Link>
          {locked && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full"
              title={`Requires ${tierName(lesson.requiredTier)}`}
            >
              🔒 {tierName(lesson.requiredTier)}
            </span>
          )}
        </div>

        {showMetadata && (
          <p className="text-xs italic text-gray-500 mt-1">
            {syllabusRefLabel(selectedCurriculum, lesson.topicCode)}
            {lesson.sectionTitle && lesson.topicCode !== 'Maths' && lesson.sectionTitle !== lesson.title && (
              <> · {lesson.sectionTitle}</>
            )}
          </p>
        )}
        {showMetadata && lesson.syllabusReference && (
          <p className="mt-2 text-sm text-gray-600 bg-gray-50 border-l-[3px] border-[#667eea] px-3 py-1.5 rounded-r">
            {lesson.syllabusReference}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:max-w-[45%] flex-shrink-0">
        {lesson.questionCount > 0 ? (
          <Link
            href={`/practice/${lesson.id}?c=${selectedCurriculum}`}
            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full whitespace-nowrap"
            title={`${lesson.questionCount} ${curriculum.shortName} practice questions`}
          >
            🎯 Practice · {lesson.questionCount}
          </Link>
        ) : (
          <span className="text-xs text-gray-400 px-2 py-1.5 whitespace-nowrap" title={`No ${curriculum.shortName} practice questions for this lesson yet`}>
            No questions yet
          </span>
        )}
        {lesson.simulations.map((sim) => (
          <Link
            key={sim.id}
            href={sim.urlPath}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5"
            title="Simulations are shared by every curriculum"
          >
            <SimulationIcon className="w-3.5 h-3.5" />
            {lesson.simulations.length > 1 ? sim.title.split(':')[0].trim() : 'Simulation'}
          </Link>
        ))}
        <Link
          href={lessonHref(lesson.id, selectedCurriculum)}
          className="text-xs font-semibold text-[#5a67d8] border border-[#c7cdf6] hover:bg-[#eef0fd] px-3 py-1.5 rounded-full whitespace-nowrap"
        >
          Open lesson →
        </Link>
      </div>
    </li>
  );
}
