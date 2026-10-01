import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { CURRICULA, type CurriculumId } from '@/lib/curricula';
import { getLessonsByCurriculum, resolveCurriculum } from '@/lib/curricula/queries';
import { groupLessons, summarize, type LessonGroup } from '@/lib/curricula/lessons';
import { CurriculumSelector } from '@/components/curriculum/CurriculumSelector';
import { LessonCard } from '@/components/curriculum/LessonCard';

export const dynamic = 'force-dynamic';

async function loadGroups(curriculumId: CurriculumId): Promise<{ groups: LessonGroup[]; failed: boolean }> {
  try {
    return { groups: groupLessons(await getLessonsByCurriculum(curriculumId), curriculumId), failed: false };
  } catch (err) {
    console.error('Failed to load curriculum:', err);
    return { groups: [], failed: true };
  }
}

const INTROS: Record<CurriculumId, string> = {
  igcse: 'Every chapter of the Cambridge IGCSE Physics coursebook, tagged with its 0625 syllabus section.',
  as: 'The Cambridge International AS Level (9702), following the coursebook: chapters 1–15 plus the P1 practical skills. Lessons that share an IGCSE simulation are listed under the chapter they support.',
  'a-level': 'The full Cambridge International A Level (9702), following the coursebook: all of AS plus chapters 16–31 and the P2 practical skills.',
  ib: 'IB Diploma Physics (SL & HL, first assessment 2025), by theme and subtopic. HL-only subtopics are marked (HL).',
};

export default async function CurriculumPage({ searchParams }: { searchParams: { c?: string } }) {
  const user = await getCurrentUser();
  const [{ curriculumId, source }, tier] = await Promise.all([
    resolveCurriculum(searchParams.c, user?.id),
    user ? getUserTier(user.id) : Promise.resolve(0),
  ]);
  const curriculum = CURRICULA[curriculumId];
  const { groups, failed } = await loadGroups(curriculumId);
  const summary = summarize(groups);
  const effectiveTier = user?.role === 'admin' ? Number.MAX_SAFE_INTEGER : tier;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Physics Curriculum</h1>
        <p className="text-gray-600">
          IGCSE, AS Level, A Level and IB Physics in one place. Simulations are shared by every curriculum; practice
          questions are written for each one.
        </p>
      </div>

      <CurriculumSelector selectedCurriculum={curriculumId} source={source} />

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{curriculum.name}</h2>
        <p className="text-sm text-gray-600 mt-1">{INTROS[curriculumId]}</p>
        {summary.lessons > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {summary.lessons} lessons · {summary.withSimulations} with simulations · {summary.questions}{' '}
            {curriculum.shortName} practice questions across {summary.withQuestions} lessons
          </p>
        )}
      </div>

      {failed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-gray-700">
          We couldn&rsquo;t load the {curriculum.shortName} curriculum just now. Please refresh in a moment.
        </div>
      )}

      {!failed && groups.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-gray-700">
          <p className="font-medium">The {curriculum.name} lessons are being set up.</p>
          <p className="text-sm text-gray-500 mt-1">
            Check back soon, or switch to another curriculum above — the simulations work in all of them.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section
            key={group.key}
            id={`unit-${group.key}`}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white scroll-mt-24"
          >
            <header className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm text-gray-400 font-medium">{group.label}</span>
              {group.chapterId ? (
                <Link href={`/curriculum/${group.chapterId}?c=${curriculumId}`} className="font-semibold text-gray-900 hover:underline">
                  {group.title}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">{group.title}</span>
              )}
              {group.level && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#5a67d8] bg-[#eef0fd] px-2 py-0.5 rounded-full">
                  {group.level}
                </span>
              )}
            </header>
            <ul className="divide-y divide-gray-100">
              {group.lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} selectedCurriculum={curriculumId} tier={effectiveTier} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
