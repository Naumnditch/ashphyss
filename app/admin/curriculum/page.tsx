import Link from 'next/link';
import { query } from '@/lib/db/client';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { CurriculumTierManager } from '@/components/admin/CurriculumTierManager';

export const dynamic = 'force-dynamic';

async function getChaptersWithCounts() {
  const result = await query(`
    SELECT c.id, c.chapter_number, c.title,
           (SELECT COUNT(*) FROM topics t WHERE t.chapter_id = c.id) as topic_count,
           (SELECT COUNT(*) FROM simulations s WHERE s.chapter_id = c.id) as simulation_count
    FROM chapters c
    ORDER BY c.chapter_number ASC
  `);
  return result.rows;
}

async function getSimulations() {
  const result = await query(`
    SELECT s.id, s.title, s.url_path, s.sim_type, s.required_tier, c.chapter_number, c.title as chapter_title, t.topic_name
    FROM simulations s
    JOIN chapters c ON c.id = s.chapter_id
    LEFT JOIN topics t ON t.id = s.topic_id
    ORDER BY c.chapter_number ASC
  `);
  return result.rows;
}

async function getTopics() {
  const result = await query(`
    SELECT t.id, t.topic_name, t.required_tier, c.chapter_number, c.title as chapter_title
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    ORDER BY c.chapter_number ASC, t."order" ASC
  `);
  return result.rows;
}

export default async function AdminCurriculumPage() {
  const [chapters, simulations, topics] = await Promise.all([getChaptersWithCounts(), getSimulations(), getTopics()]);
  const totalTopics = chapters.reduce((sum, c) => sum + parseInt(c.topic_count, 10), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Curriculum</h1>
      <p className="text-gray-500 text-sm mb-8">
        {chapters.length} chapters · {totalTopics} lessons · {simulations.length} simulations
      </p>

      <CurriculumTierManager initialSimulations={simulations} initialTopics={topics} />

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-10">Chapters</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {chapters.map((c) => (
            <Link
              key={c.id}
              href={`/curriculum/${c.id}`}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-400 font-medium w-5 flex-shrink-0">{c.chapter_number}</span>
                <span className="font-medium text-gray-900 text-[15px] truncate">{c.title}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                <span>{c.topic_count} lessons</span>
                {parseInt(c.simulation_count, 10) > 0 && (
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <SimulationIcon className="w-3.5 h-3.5" /> {c.simulation_count}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
