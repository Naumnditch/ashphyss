import Link from 'next/link';
import { query } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/session';
import { PastPaperCard, type PaperCardData } from '@/components/PastPaperCard';

export const dynamic = 'force-dynamic';

const SESSION_ORDER: Record<string, number> = { 'Feb/Mar': 0, 'May/Jun': 1, 'Oct/Nov': 2 };

/** Cambridge runs several parallel IGCSE syllabuses with the same paper
 *  structure but different codes and grading — e.g. 0972 is the 9-1 grading
 *  variant of 0625. Papers from different syllabuses are never the same
 *  exam, so they're kept in separate tabs rather than mixed under one
 *  "Paper 4 2023" heading. */
const SYLLABUS_LABELS: Record<string, { short: string; heading: string }> = {
  '0625': { short: '0625 · IGCSE Physics', heading: 'Cambridge IGCSE Physics · 0625' },
  '0972': { short: '0972 · IGCSE (9-1) Physics', heading: 'Cambridge IGCSE (9-1) Physics · 0972' },
};

async function getPapers(studentId: string | null): Promise<PaperCardData[]> {
  const result = await query(
    `SELECT p.id, p.year, p.session, p.paper_number, p.variant, p.paper_name, p.tier,
            p.max_marks, p.syllabus_code, p.question_paper_url, p.mark_scheme_url,
            p.explanation_status, p.explanation_video_url,
            s.score::text AS my_score
     FROM past_papers p
     LEFT JOIN paper_scores s ON s.paper_id = p.id AND s.student_id = $1
     ORDER BY p.year DESC, p.paper_number ASC, p.variant ASC`,
    [studentId]
  );
  return result.rows;
}

export default async function PastPapersPage({
  searchParams,
}: {
  searchParams: { syllabus?: string; paper?: string; year?: string; variant?: string };
}) {
  const user = await getCurrentUser();
  const allPapers = await getPapers(user?.id ?? null);

  const syllabuses = Array.from(new Set(allPapers.map((p) => p.syllabus_code))).sort();
  const syllabusFilter = searchParams.syllabus && syllabuses.includes(searchParams.syllabus) ? searchParams.syllabus : '0625';
  const papers = allPapers.filter((p) => p.syllabus_code === syllabusFilter);

  const paperFilter = searchParams.paper ? parseInt(searchParams.paper, 10) : null;
  const yearFilter = searchParams.year ? parseInt(searchParams.year, 10) : null;

  const years = Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a);
  const filtered = papers.filter(
    (p) => (paperFilter === null || p.paper_number === paperFilter) && (yearFilter === null || p.year === yearFilter)
  );

  const grouped = new Map<string, PaperCardData[]>();
  for (const p of filtered) {
    const key = `${p.year}|${p.session}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  const groupKeys = Array.from(grouped.keys()).sort((a, b) => {
    const [ya, sa] = a.split('|');
    const [yb, sb] = b.split('|');
    if (ya !== yb) return parseInt(yb, 10) - parseInt(ya, 10);
    return SESSION_ORDER[sb] - SESSION_ORDER[sa];
  });

  const buildHref = (params: { syllabus?: string; paper?: number | null; year?: number | null }) => {
    const sp = new URLSearchParams();
    const syl = params.syllabus !== undefined ? params.syllabus : syllabusFilter;
    const p = params.paper !== undefined ? params.paper : params.syllabus !== undefined ? null : paperFilter;
    const y = params.year !== undefined ? params.year : params.syllabus !== undefined ? null : yearFilter;
    if (syl !== '0625') sp.set('syllabus', syl);
    if (p !== null && p !== undefined) sp.set('paper', String(p));
    if (y !== null && y !== undefined) sp.set('year', String(y));
    const qs = sp.toString();
    return qs ? `/past-papers?${qs}` : '/past-papers';
  };

  const label = SYLLABUS_LABELS[syllabusFilter] ?? { short: syllabusFilter, heading: `Cambridge IGCSE Physics · ${syllabusFilter}` };

  const pill = (active: boolean) =>
    `text-[13px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
      active ? 'bg-[#1b2a41] text-white border-[#1b2a41]' : 'bg-white text-[#1b2a41] border-[#d8cfb6] hover:bg-[#f5f0e2]'
    }`;

  const withFiles = papers.filter((p) => p.question_paper_url).length;

  return (
    <div className="min-h-screen bg-[#faf7f0]" style={{ backgroundImage: 'radial-gradient(#e6ddc4 0.6px, transparent 0.6px)', backgroundSize: '18px 18px' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <p className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72] mb-2">
          {label.heading}
        </p>
        <h1 className="text-[32px] font-bold text-[#1b2a41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Past Papers
        </h1>
        <p className="text-[14px] text-[#4a5a72] leading-snug mb-6 max-w-2xl">
          Record your mark on each paper to track your progress, and work through the video solutions as they are
          published.{' '}
          {withFiles === 0 && syllabusFilter === '0625' && (
            <>
              Download the papers themselves from{' '}
              <a
                href="https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-physics-0625/past-papers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2e7d6b] font-semibold underline"
              >
                Cambridge&rsquo;s own portal
              </a>{' '}
              or your school.
            </>
          )}
          {withFiles === 0 && syllabusFilter !== '0625' && 'Download the papers themselves from Cambridge or your school.'}
        </p>

        {syllabuses.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {syllabuses.map((code) => (
              <Link
                key={code}
                href={buildHref({ syllabus: code })}
                className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                  syllabusFilter === code
                    ? 'bg-[#2e7d6b] text-white border-[#2e7d6b]'
                    : 'bg-white text-[#1b2a41] border-[#d8cfb6] hover:bg-[#f5f0e2]'
                }`}
              >
                {SYLLABUS_LABELS[code]?.short ?? code}
              </Link>
            ))}
          </div>
        )}

        {!user && (
          <div className="bg-white border border-[#e4ddcc] rounded-lg px-4 py-3 mb-6 text-[13px] text-[#4a5a72]">
            <Link href="/auth/login" className="text-[#2e7d6b] font-semibold underline">Sign in</Link> to save your
            score on each paper and build a record of your progress.
          </div>
        )}

        {/* paper filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Link href={buildHref({ paper: null })} className={pill(paperFilter === null)}>All Papers</Link>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Link key={n} href={buildHref({ paper: n })} className={pill(paperFilter === n)}>Paper {n}</Link>
          ))}
        </div>

        {/* year filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={buildHref({ year: null })}
            className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${
              yearFilter === null ? 'bg-[#2e7d6b] text-white border-[#2e7d6b]' : 'bg-white text-[#4a5a72] border-[#e4ddcc] hover:bg-[#f5f0e2]'
            }`}
          >
            All Years
          </Link>
          {years.map((y) => (
            <Link
              key={y}
              href={buildHref({ year: y })}
              className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${
                yearFilter === y ? 'bg-[#2e7d6b] text-white border-[#2e7d6b]' : 'bg-white text-[#4a5a72] border-[#e4ddcc] hover:bg-[#f5f0e2]'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>

        {groupKeys.length === 0 && (
          <div className="bg-white border border-[#e4ddcc] rounded-xl p-8 text-center">
            <p className="text-[14px] text-[#4a5a72]">No papers match this filter.</p>
          </div>
        )}

        {groupKeys.map((key) => {
          const [y, sess] = key.split('|');
          return (
            <div key={key} className="mb-10">
              <h2 className="text-[16px] font-bold text-[#1b2a41] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                {sess} {y}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.get(key)!.map((p) => (
                  <PastPaperCard key={p.id} paper={p} signedIn={!!user} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
