import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db/client';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { ChapterViewTracker } from '@/components/analytics/ChapterViewTracker';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, tierName } from '@/lib/subscriptions/getUserTier';

export const dynamic = 'force-dynamic';

interface ChapterDetail {
  id: string;
  chapter_number: number;
  title: string;
  learning_objectives: string | null;
}

interface TopicRow {
  id: string;
  topic_name: string;
  order: number;
  required_tier: number;
}

interface SimRow {
  id: string;
  topic_id: string | null;
  title: string;
  url_path: string;
}

async function getChapter(id: string): Promise<ChapterDetail | null> {
  try {
    const result = await query(
      `SELECT id, chapter_number, title, learning_objectives FROM chapters WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Failed to load chapter:', err);
    return null;
  }
}

async function getTopics(chapterId: string): Promise<TopicRow[]> {
  try {
    const result = await query(
      `SELECT id, topic_name, "order", required_tier FROM topics WHERE chapter_id = $1 ORDER BY "order" ASC`,
      [chapterId]
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getSimulations(chapterId: string): Promise<SimRow[]> {
  try {
    const result = await query(
      `SELECT id, topic_id, title, url_path FROM simulations WHERE chapter_id = $1`,
      [chapterId]
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getTopicsWithPractice(chapterId: string): Promise<Set<string>> {
  try {
    const result = await query(
      `SELECT DISTINCT topic_id FROM problems WHERE chapter_id = $1 AND topic_id IS NOT NULL`,
      [chapterId]
    );
    return new Set(result.rows.map((r: any) => r.topic_id));
  } catch {
    return new Set();
  }
}

async function getAdjacentChapters(chapterNumber: number) {
  try {
    const result = await query(
      `SELECT id, chapter_number, title FROM chapters WHERE chapter_number IN ($1, $2)`,
      [chapterNumber - 1, chapterNumber + 1]
    );
    const prev = result.rows.find((r: any) => r.chapter_number === chapterNumber - 1) || null;
    const next = result.rows.find((r: any) => r.chapter_number === chapterNumber + 1) || null;
    return { prev, next };
  } catch {
    return { prev: null, next: null };
  }
}

export default async function ChapterDetailPage({ params }: { params: { chapterId: string } }) {
  const chapter = await getChapter(params.chapterId);
  if (!chapter) notFound();

  const user = await getCurrentUser();
  const [topics, simulations, topicsWithPractice, { prev, next }, tier] = await Promise.all([
    getTopics(chapter.id),
    getSimulations(chapter.id),
    getTopicsWithPractice(chapter.id),
    getAdjacentChapters(chapter.chapter_number),
    user ? getUserTier(user.id) : Promise.resolve(0),
  ]);

  // a lesson can have more than one simulation — group, don't overwrite
  const simsByTopic = new Map<string, typeof simulations>();
  for (const s of simulations) {
    if (!s.topic_id) continue;
    const arr = simsByTopic.get(s.topic_id) || [];
    arr.push(s);
    simsByTopic.set(s.topic_id, arr);
  }
  const simShortName = (title: string) => title.split(':')[0].trim();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ChapterViewTracker topicIds={topics.map((t) => t.id)} />
      <Link href="/curriculum" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Back to full curriculum
      </Link>

      <div className="mb-6">
        <div className="text-sm text-gray-400 font-medium mb-1">Chapter {chapter.chapter_number}</div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{chapter.title}</h1>
        {chapter.learning_objectives && (
          <p className="text-gray-600 leading-relaxed">{chapter.learning_objectives}</p>
        )}
      </div>

      {topics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3 border-b pb-2">
            Lessons in this chapter
          </h2>
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
            {topics.map((topic) => {
              const sims = simsByTopic.get(topic.id) || [];
              const hasPractice = topicsWithPractice.has(topic.id);
              const locked = tier < topic.required_tier;
              return (
                <li
                  key={topic.id}
                  id={`topic-${topic.id}`}
                  className="px-4 py-3 scroll-mt-24 flex items-center justify-between gap-3"
                >
                  <span className="text-gray-800 flex items-center gap-2">
                    {locked && <span title={`Requires ${tierName(topic.required_tier)}`}>🔒</span>}
                    {topic.topic_name}
                    {locked && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {tierName(topic.required_tier)}
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 flex items-center gap-2">
                    {hasPractice && (
                      <Link
                        href={`/practice/${topic.id}`}
                        className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full whitespace-nowrap"
                      >
                        🎯 Practice
                      </Link>
                    )}
                    {sims.map((sim) => (
                      <Link
                        key={sim.id}
                        href={sim.url_path}
                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5"
                      >
                        <SimulationIcon className="w-3.5 h-3.5" />
                        {sims.length > 1 ? simShortName(sim.title) : 'Launch Simulation'}
                      </Link>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {simulations.length === 0 && topicsWithPractice.size === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 text-center mb-8">
          <p className="text-gray-700 font-medium mb-1">📹 Video lessons & practice problems coming soon</p>
          <p className="text-sm text-gray-500">Your teacher is preparing content for this chapter.</p>
        </div>
      )}

      <div className="flex justify-between items-center border-t pt-4">
        {prev ? (
          <Link href={`/curriculum/${prev.id}`} className="text-sm text-gray-600 hover:text-blue-600">
            ← Chapter {prev.chapter_number}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/curriculum/${next.id}`} className="text-sm text-gray-600 hover:text-blue-600">
            Chapter {next.chapter_number} →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
