import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, tierName, TIER_PLUS } from '@/lib/subscriptions/getUserTier';
import {
  CURRICULA,
  chapterLabel,
  curriculumForTopic,
  findSection,
  lessonTitle,
  syllabusRefLabel,
  topicCodeFor,
  tryParseCurriculum,
  type CurriculumId,
} from '@/lib/curricula';
import { getLesson, resolveCurriculum } from '@/lib/curricula/queries';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { ChapterViewTracker } from '@/components/analytics/ChapterViewTracker';
import { ActivityTracker } from '@/components/analytics/ActivityTracker';
import { YouTubeEmbed } from '@/components/video/YouTubeEmbed';
import { getPublishedLessonVideos, type LessonVideo } from '@/lib/videos/lessonVideos';
import { cheatSheetFor, cheatSheetHref } from '@/lib/cheatsheets';
import { ComingSoonCard, ResourceCard, ResourceCta, ResourceSecondaryLink } from '@/components/lesson/ResourceCard';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One lesson, seen through one curriculum: its syllabus code and reference
 * for that curriculum, the simulations every curriculum shares, and that
 * curriculum's own practice questions.
 */
export default async function LessonPage({
  params,
  searchParams,
}: {
  params: { topicId: string };
  searchParams: { c?: string };
}) {
  if (!UUID.test(params.topicId)) notFound();
  const lesson = await getLesson(params.topicId).catch((err) => {
    console.error('Failed to load lesson', err);
    return null;
  });
  if (!lesson) notFound();

  const user = await getCurrentUser();
  const [{ curriculumId: preferred }, tier] = await Promise.all([
    resolveCurriculum(null, user?.id),
    user ? getUserTier(user.id) : Promise.resolve(0),
  ]);
  const requested = tryParseCurriculum(searchParams.c);
  const curriculumId = curriculumForTopic(lesson.curriculum_ids, requested, preferred);
  const curriculum = CURRICULA[curriculumId];
  const topicCode = topicCodeFor(lesson, curriculumId);
  const found = findSection(curriculumId, topicCode);
  const title = lessonTitle(lesson.topic_name, curriculumId);
  const counts = lesson.question_counts ?? {};
  const questionCount = counts[curriculumId] ?? 0;
  const otherBanks = (Object.entries(counts) as [CurriculumId, number][]).filter(
    ([id, n]) => id !== curriculumId && n > 0 && id in CURRICULA
  );
  const alsoIn = (lesson.curriculum_ids ?? []).filter((c): c is CurriculumId => c !== curriculumId && c in CURRICULA);
  const locked = user?.role !== 'admin' && tier < lesson.required_tier;
  const practiceHref = (c: CurriculumId) => `/practice/${lesson.id}?c=${c}`;
  const sheet = cheatSheetFor(lesson.id, curriculumId);
  // Same gate as video solve requests: Plus and Pro watch, Free sees a lock.
  const canWatchVideos = user?.role === 'admin' || tier >= TIER_PLUS;
  const videos: LessonVideo[] = await getPublishedLessonVideos(user, lesson.id).catch((err) => {
    console.error('Failed to load lesson videos', err);
    return [];
  });

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const sims = lesson.simulations;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <ChapterViewTracker topicIds={[lesson.id]} />
      {user && <ActivityTracker type="lesson_view" lessonId={lesson.id} />}
      <Link
        href={`/curriculum?c=${curriculumId}`}
        className="inline-block rounded text-sm text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-h-5a67d8 focus-visible:ring-offset-2"
      >
        ← {curriculum.displayName} curriculum
      </Link>

      {requested && requested !== curriculumId && (
        <div className="mt-4 max-w-3xl text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
          This lesson isn&rsquo;t part of {CURRICULA[requested].name}, so it&rsquo;s shown as {curriculum.name}.{' '}
          <Link href={`/curriculum?c=${requested}`} className="font-semibold underline">
            Browse {CURRICULA[requested].shortName} lessons
          </Link>
        </div>
      )}

      <header className="mt-4 max-w-3xl">
        <p className="text-sm italic text-gray-500">
          {syllabusRefLabel(curriculumId, topicCode)}
          {found && topicCode !== 'Maths' && <> · {found.unit.title}</>}
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-gray-900 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {curriculumId !== 'igcse' && topicCode && topicCode !== 'Maths' && (
            <span className="font-mono text-base font-semibold text-h-5a67d8 bg-h-eef0fd px-2 py-0.5 rounded">{topicCode}</span>
          )}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {found && topicCode !== 'Maths' && found.section.title !== title && (
          <p className="text-gray-600 mt-1.5">Syllabus section: {found.section.title}</p>
        )}
        {lesson.description && <p className="mt-3 text-gray-700">{lesson.description}</p>}
        {lesson.syllabus_reference && (
          <p className="mt-3 text-gray-700 bg-gray-50 border-l-[3px] border-h-667eea px-4 py-2 rounded-r">
            {lesson.syllabus_reference}
          </p>
        )}
        {alsoIn.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">Also in:</span>
            {alsoIn.map((c) => {
              const code = topicCodeFor(lesson, c);
              return (
                <Link
                  key={c}
                  href={`/lessons/${lesson.id}?c=${c}`}
                  className="border border-gray-200 hover:border-h-667eea hover:text-h-5a67d8 rounded-full px-2.5 py-1 text-gray-700"
                >
                  {CURRICULA[c].shortName}
                  {code && code !== 'Maths' && <span className="font-mono ml-1 text-gray-500">{code}</span>}
                </Link>
              );
            })}
          </div>
        )}
        {locked && (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            🔒 This lesson is part of the <strong>{tierName(lesson.required_tier)}</strong> plan.{' '}
            <Link href="/pricing" className="underline font-semibold">
              See plans
            </Link>
          </p>
        )}
      </header>

      {/* The four resources, always in this order. A card with no content
          yet (no sheet, an empty list, no questions) shows "Coming soon". */}
      <section aria-label="Lesson resources" className="mt-6 sm:mt-8">
        <ul role="list" className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-4 lg:gap-6">
          <li className="min-w-0">
            {sheet ? (
              <ResourceCard
                kind="sheet"
                label="Revision cheat sheet"
                title={sheet.title}
                description={sheet.goal}
                status={{ text: 'Printable' }}
              >
                <ResourceCta href={cheatSheetHref(sheet)}>Open sheet →</ResourceCta>
              </ResourceCard>
            ) : (
              <ComingSoonCard kind="sheet" label="Revision cheat sheet" />
            )}
          </li>

          <li className="min-w-0">
            {videos.length === 0 ? (
              <ComingSoonCard kind="video" label="Video lessons" />
            ) : canWatchVideos ? (
              <ResourceCard
                kind="video"
                label="Video lessons"
                title={videos.length === 1 ? videos[0].title : plural(videos.length, 'video lesson')}
                description={videos.length === 1 ? videos[0].description : videos.map((v) => v.title).join(' · ')}
                status={{ text: plural(videos.length, 'video') }}
              >
                <ResourceCta href="#video-lessons">Watch {videos.length === 1 ? 'video' : 'videos'} ↓</ResourceCta>
              </ResourceCard>
            ) : (
              // Locked: titles only. The video ids are never rendered, so they
              // never reach a Free-tier browser.
              <ResourceCard
                kind="video"
                label="Video lessons"
                title={plural(videos.length, 'video lesson')}
                description={videos.map((v) => v.title).join(' · ')}
                status={{ text: 'Plus & Pro', tone: 'locked' }}
              >
                <ResourceCta href="/pricing" variant="locked">
                  See Plus &amp; Pro plans
                </ResourceCta>
                {!user && <ResourceSecondaryLink href="/auth/login">Log in</ResourceSecondaryLink>}
              </ResourceCard>
            )}
          </li>

          <li className="min-w-0">
            {sims.length === 0 ? (
              <ComingSoonCard kind="simulation" label="Interactive simulation" />
            ) : sims.length === 1 ? (
              <ResourceCard
                kind="simulation"
                label="Interactive simulation"
                title={sims[0].title}
                description="The same in every curriculum: the physics doesn’t change with the syllabus."
                status={{ text: 'Interactive' }}
              >
                <ResourceCta href={sims[0].urlPath}>Open simulation →</ResourceCta>
              </ResourceCard>
            ) : (
              <ResourceCard
                kind="simulation"
                label="Interactive simulation"
                title={plural(sims.length, 'simulation')}
                description={sims.map((sim) => sim.title).join(' · ')}
                status={{ text: 'Interactive' }}
              >
                <ResourceCta href="#simulations">Choose a simulation ↓</ResourceCta>
              </ResourceCard>
            )}
          </li>

          <li className="min-w-0">
            {questionCount > 0 ? (
              <ResourceCard
                kind="practice"
                label="Practice questions"
                title={plural(questionCount, 'question')}
                description="Get 5 right in a row to master the lesson."
                status={{ text: curriculum.shortName }}
                primary
              >
                <ResourceCta href={practiceHref(curriculumId)} variant="primary">
                  Start practice →
                </ResourceCta>
              </ResourceCard>
            ) : (
              <ComingSoonCard kind="practice" label="Practice questions" />
            )}
          </li>
        </ul>

        {otherBanks.length > 0 && (
          <p className="text-xs text-gray-500 mt-4 xl:text-right">
            Also available:{' '}
            {otherBanks.map(([id, n], i) => (
              <span key={id}>
                {i > 0 && ' · '}
                <Link href={practiceHref(id)} className="text-blue-600 hover:underline">
                  {n} {CURRICULA[id].shortName} question{n === 1 ? '' : 's'}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      {/* Full-width detail the cards point to: the players need room. */}
      {videos.length > 0 && (
        <section id="video-lessons" aria-labelledby="video-lessons-heading" className="mt-10 scroll-mt-24">
          <h2 id="video-lessons-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4 border-b pb-2">
            Watch the video lessons
          </h2>
          {canWatchVideos ? (
            <ol className="grid gap-6 lg:grid-cols-2">
              {videos.map((v) => (
                <li key={v.id} className="min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 break-words">{v.title}</h3>
                  {v.description && <p className="text-sm text-gray-600 mb-2">{v.description}</p>}
                  <YouTubeEmbed youtubeId={v.youtubeId} title={v.title} trackView={user ? { lessonId: lesson.id } : undefined} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="max-w-3xl border border-amber-200 bg-amber-50 rounded-lg px-4 py-4">
              <p className="text-sm text-amber-900 font-semibold mb-2">
                🔒 {plural(videos.length, 'video lesson')} for this lesson — Plus &amp; Pro
              </p>
              <ul className="text-sm text-amber-900/80 list-disc list-inside space-y-0.5">
                {videos.map((v) => (
                  <li key={v.id}>{v.title}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {sims.length > 1 && (
        <section id="simulations" aria-labelledby="simulations-heading" className="mt-10 scroll-mt-24">
          <h2 id="simulations-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4 border-b pb-2">
            Choose a simulation
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {sims.map((sim) => (
              <li key={sim.id} className="min-w-0">
                <Link
                  href={sim.urlPath}
                  className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white hover:border-blue-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-h-5a67d8 focus-visible:ring-offset-2"
                >
                  <SimulationIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900 break-words">{sim.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Simulations are the same in every curriculum — the physics doesn&rsquo;t change with the syllabus.
          </p>
        </section>
      )}

      <p className="mt-10 text-xs text-gray-400 border-t pt-4">
        Filed under{' '}
        <Link href={`/curriculum/${lesson.chapter_id}?c=${curriculumId}`} className="hover:underline">
          {chapterLabel(lesson.course_code, lesson.chapter_number)} · {lesson.chapter_title}
        </Link>
      </p>
    </div>
  );
}
