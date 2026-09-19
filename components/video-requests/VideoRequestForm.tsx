'use client';

import { useEffect, useState } from 'react';
import { putFileToSignedUrl } from '@/lib/storage/directUpload';

interface Chapter { id: string; chapter_number: number; title: string; }
interface Topic { id: string; chapter_id: string; topic_name: string; }
interface Req {
  id: string;
  description: string;
  status: 'open' | 'in_progress' | 'fulfilled' | 'declined';
  youtubeUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  topicName: string | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  screenshotUrl: string | null;
}

const STATUS_LABEL: Record<Req['status'], string> = {
  open: 'Awaiting a teacher',
  in_progress: 'Being recorded',
  fulfilled: 'Video ready',
  declined: 'Declined',
};

const STATUS_STYLE: Record<Req['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  fulfilled: 'bg-green-50 text-green-700',
  declined: 'bg-gray-100 text-gray-500',
};

export function VideoRequestForm({ chapters, topics }: { chapters: Chapter[]; topics: Topic[] }) {
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const topicsForChapter = topics.filter((t) => t.chapter_id === chapterId);

  const loadRequests = async () => {
    const res = await fetch('/api/video-requests');
    const data = await res.json();
    if (data.success) setRequests(data.requests);
    setLoading(false);
  };
  useEffect(() => { loadRequests(); }, []);

  const submit = async () => {
    if (!description.trim()) {
      setError('Describe the problem you need help with');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      let screenshotPath: string | undefined;
      if (file) {
        setUploading(true);
        const signRes = await fetch('/api/video-requests/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: file.name }),
        });
        const signData = await signRes.json();
        if (!signRes.ok || !signData.success) {
          setError(signData.error || 'Could not start upload');
          setSubmitting(false);
          setUploading(false);
          return;
        }
        const put = await putFileToSignedUrl(signData.signedUrl, file);
        setUploading(false);
        if (!put.ok) {
          setError(put.error);
          setSubmitting(false);
          return;
        }
        screenshotPath = signData.path;
      }

      const res = await fetch('/api/video-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, chapterId: chapterId || undefined, topicId: topicId || undefined, screenshotPath }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not submit request');
        setSubmitting(false);
        return;
      }
      setMsg('Request submitted — a teacher will record a video for you soon.');
      setDescription('');
      setFile(null);
      setChapterId('');
      setTopicId('');
      await loadRequests();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chapter (optional)</label>
            <select
              value={chapterId}
              onChange={(e) => { setChapterId(e.target.value); setTopicId(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Not sure / general</option>
              {chapters.map((c) => <option key={c.id} value={c.id}>Ch. {c.chapter_number} — {c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Lesson (optional)</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={!chapterId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Whole chapter</option>
              {topicsForChapter.map((t) => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">What are you stuck on?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g. Question 7b on the momentum past paper — I don't understand why the collision is treated as elastic."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Screenshot of the question (optional)</label>
          <div className="flex items-center gap-2">
            <label className="flex-shrink-0 cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              Choose image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs text-gray-400">{file ? file.name : 'no file chosen'}</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
        >
          {uploading ? 'Uploading screenshot…' : submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your requests</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-400">No requests yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                  <span className="text-[13px] text-gray-900">
                    {r.chapterTitle ? `Ch. ${r.chapterNumber} — ${r.chapterTitle}` : 'General'}
                    {r.topicName ? ` · ${r.topicName}` : ''}
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1.5">{r.description}</p>
                {r.screenshotUrl && (
                  <a href={r.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                    View screenshot
                  </a>
                )}
                {r.status === 'fulfilled' && r.youtubeUrl && (
                  <a href={r.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm font-semibold text-red-600 underline">
                    ▶ Watch your video
                  </a>
                )}
                {r.adminNote && <p className="text-xs text-gray-400 mt-1.5">Note: {r.adminNote}</p>}
                <p className="text-[11px] text-gray-400 mt-1.5">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
