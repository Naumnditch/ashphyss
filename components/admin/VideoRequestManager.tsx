'use client';

import { useEffect, useState } from 'react';

interface Req {
  id: string;
  description: string;
  status: 'open' | 'in_progress' | 'fulfilled' | 'declined';
  youtubeUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  topicName: string | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  screenshotUrl: string | null;
}

const STATUS_STYLE: Record<Req['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  fulfilled: 'bg-green-50 text-green-700',
  declined: 'bg-gray-100 text-gray-500',
};

function Editor({ req, onSaved }: { req: Req; onSaved: (r: Req) => void }) {
  const [status, setStatus] = useState(req.status);
  const [youtubeUrl, setYoutubeUrl] = useState(req.youtubeUrl || '');
  const [adminNote, setAdminNote] = useState(req.adminNote || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/video-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, status, youtubeUrl: youtubeUrl || undefined, adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Save failed');
        return;
      }
      onSaved({ ...req, status, youtubeUrl: youtubeUrl || null, adminNote: adminNote || null });
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as Req['status'])} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs">
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="declined">Declined</option>
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Unlisted YouTube link</label>
        <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/…" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Note (optional)</label>
        <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

export function VideoRequestManager() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Req['status']>('all');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/video-requests');
    const data = await res.json();
    if (data.success) setRequests(data.requests);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {(['all', 'open', 'in_progress', 'fulfilled', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No requests here.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <span className="text-[13px] font-medium text-gray-900">{r.studentName || r.studentEmail}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-1.5">
                {r.chapterTitle ? `Ch. ${r.chapterNumber} — ${r.chapterTitle}` : 'General'}
                {r.topicName ? ` · ${r.topicName}` : ''} · {new Date(r.createdAt).toLocaleDateString()}
              </div>
              <p className="text-sm text-gray-700 mb-1.5">{r.description}</p>
              {r.screenshotUrl && (
                <a href={r.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                  View screenshot
                </a>
              )}
              <Editor req={r} onSaved={(updated) => setRequests((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
