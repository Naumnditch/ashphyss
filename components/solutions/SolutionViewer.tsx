'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from './api';
import { DifficultyBadge, TierBadge } from './Badges';

type AccessReason = 'ok' | 'sign_in_required' | 'tier_required' | 'limit_reached';

interface SolutionDetail {
  id: string;
  chapter: number;
  chapterTitle: string | null;
  topic: string;
  problemTitle: string;
  problemNumber: string | null;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  staticPreview: string;
  description: string | null;
  tags: string[];
  solutionType: 'interactive' | 'static';
  tierRequired: 'free' | 'plus' | 'pro';
  interactiveHtml: string | null;
  interactiveHtmlUrl: string | null;
  access: { allowed: boolean; reason: AccessReason; viewsUsed: number; viewLimit: number | null };
}

const REASON_COPY: Record<AccessReason, { title: string; body: string }> = {
  ok: { title: '', body: '' },
  sign_in_required: { title: 'Sign in to view this solution', body: 'Create a free account to start unlocking step-by-step solutions.' },
  tier_required: { title: 'This solution needs a higher plan', body: 'Some solutions are reserved for Plus or Pro. Upgrade to open it.' },
  limit_reached: { title: "You've used your free solution views", body: "Upgrade your plan to keep opening full step-by-step solutions." },
};

export function SolutionViewer({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [solution, setSolution] = useState<SolutionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ solution: SolutionDetail }>(`/api/solutions/${id}`)
      .then((res) => !cancelled && setSolution(res.solution))
      .catch((err) => !cancelled && setError((err as Error).message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const trackInterest = () => {
    api(`/api/solutions/${id}/interest`, { method: 'POST' }).catch(() => {});
  };

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        {!embedded && <Link href="/curriculum" className="mt-3 inline-block text-sm font-medium text-gray-700 underline">Back to curriculum</Link>}
      </div>
    );
  }
  if (!solution) return <p className="py-16 text-center text-sm text-gray-400">Loading…</p>;

  const { access } = solution;

  return (
    <div>
      {!embedded && (
        <>
          <Link href="/curriculum" className="text-sm text-[#2e7d6b] hover:underline mb-6 inline-block font-medium">
            ← Back to curriculum
          </Link>

          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <DifficultyBadge difficulty={solution.difficulty} />
            <TierBadge tier={solution.tierRequired} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b2a41] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {solution.problemTitle}
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            {solution.topic}
            {solution.problemNumber ? ` · #${solution.problemNumber}` : ''}
          </p>
        </>
      )}

      {access.allowed ? (
        <SolutionContent solution={solution} />
      ) : (
        <div>
          <div
            className="bg-white border border-gray-200 rounded-xl p-6 text-gray-700 mb-6"
            dangerouslySetInnerHTML={{ __html: solution.staticPreview }}
          />
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-lg mx-auto">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-[#1b2a41] mb-2">{REASON_COPY[access.reason].title}</h2>
            <p className="text-[#4a5a72] text-sm mb-6">{REASON_COPY[access.reason].body}</p>
            {access.reason === 'sign_in_required' ? (
              <Link href="/auth/login" className="btn btn-primary">Sign in</Link>
            ) : (
              <Link href="/pricing" onClick={trackInterest} className="btn btn-primary">See plans</Link>
            )}
            {access.viewLimit !== null && access.reason === 'limit_reached' && (
              <p className="mt-3 text-xs text-gray-400">{access.viewsUsed} of {access.viewLimit} free views used</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SolutionContent({ solution }: { solution: SolutionDetail }) {
  if (solution.solutionType === 'interactive' && solution.interactiveHtml) {
    return (
      <iframe
        title={solution.problemTitle}
        srcDoc={solution.interactiveHtml}
        sandbox="allow-scripts allow-same-origin"
        className="w-full rounded-xl border border-gray-200 bg-white"
        style={{ minHeight: '70vh' }}
      />
    );
  }
  if (solution.solutionType === 'interactive' && solution.interactiveHtmlUrl) {
    return (
      <iframe
        title={solution.problemTitle}
        src={solution.interactiveHtmlUrl}
        sandbox="allow-scripts allow-same-origin"
        className="w-full rounded-xl border border-gray-200 bg-white"
        style={{ minHeight: '70vh' }}
      />
    );
  }
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-6 text-gray-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: solution.interactiveHtml || solution.staticPreview }}
    />
  );
}
