'use client';

import { useState } from 'react';

interface SimRow {
  id: string;
  title: string;
  url_path: string;
  sim_type: string;
  required_tier: number;
  chapter_number: number;
  chapter_title: string;
  topic_name: string | null;
}

interface TopicRow {
  id: string;
  topic_name: string;
  required_tier: number;
  chapter_number: number;
  chapter_title: string;
}

const TIER_LABEL = ['Free', 'Plus', 'Pro'];

function TierSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 ${
        value === 0 ? 'bg-green-100 text-green-700' : value === 1 ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
      }`}
    >
      {TIER_LABEL.map((label, i) => (
        <option key={i} value={i}>{label}</option>
      ))}
    </select>
  );
}

export function CurriculumTierManager({ initialSimulations, initialTopics }: { initialSimulations: SimRow[]; initialTopics: TopicRow[] }) {
  const [simulations, setSimulations] = useState(initialSimulations);
  const [topics, setTopics] = useState(initialTopics);
  const [tab, setTab] = useState<'simulations' | 'lessons'>('simulations');

  const setTier = async (table: 'simulations' | 'topics', id: string, requiredTier: number) => {
    if (table === 'simulations') {
      setSimulations((prev) => prev.map((s) => (s.id === id ? { ...s, required_tier: requiredTier } : s)));
    } else {
      setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, required_tier: requiredTier } : t)));
    }
    await fetch('/api/admin/curriculum/tier', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, requiredTier }),
    });
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {(['simulations', 'lessons'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              tab === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'simulations' ? `Simulations (${simulations.length})` : `Lessons (${topics.length})`}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Chapters 0-1 are permanently free. Elsewhere, the required plan controls whether a student can open this item —
        this is enforced server-side, not just hidden in the UI.
      </p>

      {tab === 'simulations' ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {simulations.map((s) => (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-[15px]">{s.title}</div>
                  <div className="text-xs text-gray-400">
                    Chapter {s.chapter_number} · {s.topic_name || s.chapter_title} · {s.sim_type}
                  </div>
                </div>
                <TierSelect value={s.required_tier} onChange={(v) => setTier('simulations', s.id, v)} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {topics.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-[15px]">{t.topic_name}</div>
                  <div className="text-xs text-gray-400">Chapter {t.chapter_number} · {t.chapter_title}</div>
                </div>
                <TierSelect value={t.required_tier} onChange={(v) => setTier('topics', t.id, v)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
