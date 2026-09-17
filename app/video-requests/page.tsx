import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PLUS } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import { VideoRequestForm } from '@/components/video-requests/VideoRequestForm';

export const dynamic = 'force-dynamic';

async function getChaptersAndTopics() {
  const [chapters, topics] = await Promise.all([
    query(`SELECT id, chapter_number, title FROM chapters ORDER BY chapter_number ASC`),
    query(`SELECT id, chapter_id, topic_name, "order" FROM topics ORDER BY "order" ASC`),
  ]);
  return { chapters: chapters.rows, topics: topics.rows };
}

export default async function VideoRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const tier = await getUserTier(user.id);

  // Hard server-side gate: a Free-tier student hitting this URL directly
  // gets an upsell, never the actual submission form or their past
  // requests — the same enforcement also lives in the API routes, since a
  // determined user could skip this page entirely.
  if (tier < TIER_PLUS) {
    return (
      <div className="container-max py-16 max-w-xl text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Video Solve Requests are a Plus &amp; Pro feature</h1>
        <p className="text-gray-500 mb-8">
          Stuck on a specific problem? Plus and Pro members can request a short, personal video walkthrough from a
          teacher — upload a screenshot of the question and get an unlisted YouTube video back.
        </p>
        <Link href="/pricing" className="btn btn-primary">See plans</Link>
      </div>
    );
  }

  const { chapters, topics } = await getChaptersAndTopics();

  return (
    <div className="container-max py-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Video Solve Requests</h1>
      <p className="text-gray-500 text-sm mb-8">
        Stuck on a problem? Describe it (optionally attach a screenshot) and a teacher will record a short video
        walking through the solution.
      </p>
      <VideoRequestForm chapters={chapters} topics={topics} />
    </div>
  );
}
