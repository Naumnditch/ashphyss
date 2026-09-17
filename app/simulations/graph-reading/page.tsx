import Link from 'next/link';
import { query } from '@/lib/db/client';
import { GraphReadingSimulator } from '@/components/simulations/GraphReadingSimulator';

import { SimulationStartTracker } from '@/components/analytics/SimulationStartTracker';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier } from '@/lib/subscriptions/getUserTier';
import { LockedContent } from '@/components/subscriptions/LockedContent';

export const dynamic = 'force-dynamic';

async function getSimContext() {
  try {
    const result = await query(
      `SELECT s.title, s.description, s.required_tier, c.id as chapter_id, c.chapter_number, c.title as chapter_title, t.id as topic_id
       FROM simulations s
       JOIN chapters c ON c.id = s.chapter_id
       LEFT JOIN topics t ON t.id = s.topic_id
       WHERE s.url_path = '/simulations/graph-reading'
       LIMIT 1`
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export default async function GraphReadingSimulationPage() {
  const ctx = await getSimContext();
  const user = await getCurrentUser();
  const tier = user ? await getUserTier(user.id) : 0;
  const requiredTier = ctx?.required_tier ?? 0;
  const allowed = tier >= requiredTier;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(#d8e3ec 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, #d8e3ec 1px, transparent 1px) 0 0/24px 24px, #faf7f0',
      }}
    >
      <SimulationStartTracker />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {ctx?.chapter_id && (
          <Link
            href={`/curriculum/${ctx.chapter_id}${ctx.topic_id ? `#topic-${ctx.topic_id}` : ''}`}
            className="text-sm text-[#2e7d6b] hover:underline mb-6 inline-block font-medium"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
          >
            ← Back to {ctx.chapter_title}
          </Link>
        )}

        <div className="mb-6">
          <div className="font-mono text-xs tracking-wide uppercase text-[#8f6428] mb-1.5">
            {ctx ? `Chapter ${ctx.chapter_number} · Prep Physics — Reading and Interpreting Graphs` : 'Simulation'}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-semibold text-[#1b2a41]"
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}
          >
            {ctx?.title || 'Reading and Interpreting Graphs'}
          </h1>
          {ctx?.description && (
            <p
              className="text-[#4a5a72] text-sm mt-2 max-w-2xl leading-relaxed"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}
            >
              {ctx.description}
            </p>
          )}
        </div>

        {allowed ? <GraphReadingSimulator /> : <LockedContent requiredTier={requiredTier} title={ctx?.title || 'This simulation'} />}
      </div>
    </div>
  );
}
