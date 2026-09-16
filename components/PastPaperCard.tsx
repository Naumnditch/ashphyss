'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics/client';

export interface PaperCardData {
  id: string;
  year: number;
  session: string;
  paper_number: number;
  variant: number;
  paper_name: string | null;
  tier: string | null;
  max_marks: number | null;
  syllabus_code: string;
  question_paper_url: string | null;
  mark_scheme_url: string | null;
  explanation_status: string;
  explanation_video_url: string | null;
  my_score: string | null;
}

const DownloadIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function PastPaperCard({ paper, signedIn }: { paper: PaperCardData; signedIn: boolean }) {
  const [score, setScore] = useState(paper.my_score ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const code = `${paper.syllabus_code}/${paper.paper_number}${paper.variant}`;
  const hasVideo = paper.explanation_status === 'published' && paper.explanation_video_url;

  const save = async (value: string) => {
    if (!signedIn) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/paper-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paper.id, score: value === '' ? null : value }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) setErr(d.error || 'Could not save');
    } catch {
      setErr('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#e4ddcc] rounded-xl p-5 flex flex-col">
      <h3 className="text-[17px] font-bold text-[#1b2a41] leading-tight mb-1">
        Paper {paper.paper_number}: {paper.paper_name}
      </h3>
      <p className="text-[14px] text-[#4a5a72] mb-2">
        {paper.session} {paper.year}
      </p>

      <div className="flex items-center gap-3 mb-4 text-[12.5px] text-[#4a5a72]">
        {paper.tier && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 011.4.6l7 7a2 2 0 010 2.8l-5.2 5.2a2 2 0 01-2.8 0l-7-7A2 2 0 013 10V5a2 2 0 012-2z" />
            </svg>
            {paper.tier}
          </span>
        )}
        <span className="inline-flex items-center gap-1 font-mono">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 1.75 1.5-1.25 3.5-1.75 8-1.75v-13c-4.5 0-6.5.5-8 1.75z" />
          </svg>
          {code}
        </span>
      </div>

      {/* score tracker */}
      <div className={`flex items-center justify-between gap-2 border border-dashed rounded-lg px-3 py-2.5 mb-3 ${score ? 'border-[#2e7d6b] bg-[#f2f9f7]' : 'border-[#d8cfb6]'}`}>
        <span className="text-[13.5px] text-[#4a5a72]">Your score</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={paper.max_marks ?? undefined}
            value={score}
            disabled={!signedIn}
            placeholder="—"
            onChange={(e) => setScore(e.target.value)}
            onBlur={(e) => save(e.target.value)}
            className="w-14 text-center text-[14px] font-mono border border-[#d8cfb6] rounded-md px-1.5 py-1 disabled:bg-transparent disabled:border-transparent"
            title={signedIn ? 'Enter your mark' : 'Sign in to record your score'}
          />
          <span className="text-[14px] text-[#4a5a72] font-mono">/ {paper.max_marks ?? '—'}</span>
        </div>
      </div>
      {err && <p className="text-[11.5px] text-[#b34a3c] -mt-2 mb-2">{err}</p>}
      {saving && <p className="text-[11.5px] text-[#a8a196] -mt-2 mb-2">saving…</p>}

      {/* actions */}
      <div className="mt-auto space-y-2">
        {paper.question_paper_url ? (
          <a
            href={paper.question_paper_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ eventType: 'download', entityType: 'past_paper', entityId: paper.id, metadata: { file: 'question_paper' } })}
            className="flex items-center justify-center gap-2 text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#eef2fb] text-[#2f52c9] hover:bg-[#e3eaf9]"
          >
            <DownloadIcon /> Question Paper
          </a>
        ) : (
          <span className="flex items-center justify-center gap-2 text-[13.5px] px-3 py-2.5 rounded-lg bg-[#f7f4ec] text-[#a8a196]">
            <DownloadIcon /> Question Paper
          </span>
        )}

        {paper.mark_scheme_url ? (
          <a
            href={paper.mark_scheme_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ eventType: 'download', entityType: 'past_paper', entityId: paper.id, metadata: { file: 'mark_scheme' } })}
            className="flex items-center justify-center gap-2 text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#f2f1ef] text-[#1b2a41] hover:bg-[#e9e7e3]"
          >
            <DownloadIcon /> Mark Scheme
          </a>
        ) : (
          <span className="flex items-center justify-center gap-2 text-[13.5px] px-3 py-2.5 rounded-lg bg-[#f7f4ec] text-[#a8a196]">
            <DownloadIcon /> Mark Scheme
          </span>
        )}

        {hasVideo ? (
          <a
            href={paper.explanation_video_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#1b2a41] text-white hover:bg-[#243a5e]"
          >
            <PlayIcon /> Video Solution
          </a>
        ) : (
          <span className="flex items-center justify-center gap-2 text-[12.5px] px-3 py-2.5 rounded-lg bg-[#f6efdc] text-[#8f6428] border border-[#e6d9b8]">
            <PlayIcon /> Video Solution — coming soon
          </span>
        )}
      </div>
    </div>
  );
}
