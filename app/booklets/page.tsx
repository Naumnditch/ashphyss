import { query } from '@/lib/db/client';
import { DownloadLink } from '@/components/analytics/DownloadLink';

export const dynamic = 'force-dynamic';

interface Booklet {
  id: string;
  chapter_number: number;
  chapter_title: string;
  topic_name: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
}

async function getBooklets(): Promise<Booklet[]> {
  const result = await query(`
    SELECT b.id, c.chapter_number, c.title as chapter_title, t.topic_name,
           b.title, b.description, b.file_url
    FROM booklets b
    JOIN chapters c ON b.chapter_id = c.id
    LEFT JOIN topics t ON b.topic_id = t.id
    WHERE b.file_url IS NOT NULL
    ORDER BY c.chapter_number ASC, b."order" ASC
  `);
  return result.rows;
}

export default async function BookletsPage() {
  const booklets = await getBooklets();

  const grouped = new Map<string, Booklet[]>();
  for (const b of booklets) {
    const key = `${b.chapter_number} · ${b.chapter_title}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }
  const groupKeys = Array.from(grouped.keys()).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="min-h-screen bg-[#faf7f0]" style={{ backgroundImage: 'radial-gradient(#e6ddc4 0.6px, transparent 0.6px)', backgroundSize: '18px 18px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <p className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72] mb-2">
          Cambridge IGCSE Physics · 0625
        </p>
        <h1 className="text-[32px] font-bold text-[#1b2a41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Booklets
        </h1>
        <p className="text-[14px] text-[#4a5a72] leading-snug mb-8 max-w-2xl">
          Printable course booklets, written for our own class — download and keep. Organised by chapter, with
          lesson-specific booklets where available.
        </p>

        {groupKeys.length === 0 && (
          <div className="bg-white border border-[#e4ddcc] rounded-xl p-8 text-center">
            <p className="text-[14px] text-[#4a5a72]">No booklets are available yet — check back soon.</p>
          </div>
        )}

        {groupKeys.map((key) => {
          const [num, ...rest] = key.split(' · ');
          const title = rest.join(' · ');
          return (
            <div key={key} className="mb-8">
              <h2 className="text-[15px] font-bold text-[#1b2a41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Chapter {num} — {title}
              </h2>
              <div className="bg-white border border-[#e4ddcc] rounded-xl overflow-hidden divide-y divide-[#eee6d3]">
                {grouped.get(key)!.map((b) => (
                  <DownloadLink
                    key={b.id}
                    href={b.file_url!}
                    entityType="booklet"
                    entityId={b.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#faf7f0] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1b2a41] text-[14.5px]">{b.title}</div>
                      <div className="text-[12px] text-[#4a5a72]">
                        {b.topic_name || 'Whole chapter'}{b.description ? ` · ${b.description}` : ''}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full bg-[#1b2a41] text-white whitespace-nowrap">
                      ↓ Download
                    </span>
                  </DownloadLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
