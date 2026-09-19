import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { LockedContent } from '@/components/subscriptions/LockedContent';

export const dynamic = 'force-dynamic';

async function getTopic(topicId: string) {
  const result = await query(
    `SELECT t.id, t.topic_name, t.required_tier, c.id as chapter_id, c.chapter_number, c.title as chapter_title
     FROM topics t JOIN chapters c ON c.id = t.chapter_id
     WHERE t.id = $1`,
    [topicId]
  );
  return result.rows[0] || null;
}

export default async function PracticePage({ params }: { params: { topicId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const topic = await getTopic(params.topicId);
  if (!topic) notFound();

  const tier = await getUserTier(user.id);
  const allowed = tier >= topic.required_tier;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/curriculum/${topic.chapter_id}#topic-${topic.id}`}
        className="text-sm text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to {topic.chapter_title}
      </Link>

      <div className="mb-6">
        <div className="text-sm text-gray-400 font-medium mb-1">
          Chapter {topic.chapter_number} · Practice
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{topic.topic_name}</h1>
      </div>

      {allowed ? (
        <PracticeSession topicId={topic.id} />
      ) : (
        <LockedContent requiredTier={topic.required_tier} title={topic.topic_name} />
      )}
    </div>
  );
}
