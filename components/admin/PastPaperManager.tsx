'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { putFileToSignedUrl } from '@/lib/storage/directUpload';

interface PastPaper {
  id: string;
  year: number;
  session: string;
  paper_number: number;
  variant: number;
  question_paper_url: string | null;
  mark_scheme_url: string | null;
  explanation_status: 'coming_soon' | 'published';
  explanation_video_url: string | null;
  explanation_notes: string | null;
}

const SESSIONS = ['Feb/Mar', 'May/Jun', 'Oct/Nov'];
const PAPER_LABELS: Record<number, string> = {
  1: 'Paper 1 — MCQ Core',
  2: 'Paper 2 — MCQ Extended',
  3: 'Paper 3 — Theory Core',
  4: 'Paper 4 — Theory Extended',
  5: 'Paper 5 — Practical Test',
  6: 'Paper 6 — Alt. to Practical',
};

const emptyForm = {
  year: new Date().getFullYear(),
  session: 'May/Jun',
  paper_number: 4,
  variant: 2,
  question_paper_url: '',
  mark_scheme_url: '',
  explanation_status: 'coming_soon' as 'coming_soon' | 'published',
  explanation_video_url: '',
  explanation_notes: '',
};

export function PastPaperManager({ initialPapers }: { initialPapers: PastPaper[] }) {
  const router = useRouter();
  const [papers, setPapers] = useState(initialPapers);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'qp' | 'ms' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleUpload = async (kind: 'qp' | 'ms', file: File) => {
    setUploading(kind);
    setUploadError(null);
    try {
      const path = `${form.year}-${slug(form.session)}/paper-${form.paper_number}-v${form.variant}-${kind}.pdf`;
      const res = await fetch('/api/admin/past-papers/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Upload failed');
        return;
      }
      const put = await putFileToSignedUrl(data.signedUrl, file);
      if (!put.ok) {
        setUploadError(put.error);
        return;
      }
      if (kind === 'qp') setForm((f) => ({ ...f, question_paper_url: data.publicUrl }));
      else setForm((f) => ({ ...f, mark_scheme_url: data.publicUrl }));
    } catch {
      setUploadError('Network error during upload');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/past-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong');
        setSaving(false);
        return;
      }
      setPapers((prev) => {
        const idx = prev.findIndex((p) => p.id === data.paper.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.paper;
          return next;
        }
        return [data.paper, ...prev];
      });
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this paper entry?')) return;
    const res = await fetch(`/api/admin/past-papers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPapers((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  };

  const loadForEdit = (p: PastPaper) => {
    setForm({
      year: p.year,
      session: p.session,
      paper_number: p.paper_number,
      variant: p.variant,
      question_paper_url: p.question_paper_url || '',
      mark_scheme_url: p.mark_scheme_url || '',
      explanation_status: p.explanation_status,
      explanation_video_url: p.explanation_video_url || '',
      explanation_notes: p.explanation_notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* ---- Add / edit form ---- */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Add / Update Entry</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
            <select
              value={form.session}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {SESSIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Paper</label>
            <select
              value={form.paper_number}
              onChange={(e) => setForm({ ...form, paper_number: parseInt(e.target.value, 10) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{PAPER_LABELS[n]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Variant</label>
            <select
              value={form.variant}
              onChange={(e) => setForm({ ...form, variant: parseInt(e.target.value, 10) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Question Paper (PDF)</label>
            <div className="flex items-center gap-2">
              <label className="flex-shrink-0 cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                {uploading === 'qp' ? 'Uploading…' : 'Choose PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload('qp', f);
                    e.target.value = '';
                  }}
                />
              </label>
              {form.question_paper_url ? (
                <a href={form.question_paper_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline truncate">
                  ✓ uploaded — view
                </a>
              ) : (
                <span className="text-xs text-gray-400">no file yet</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mark Scheme (PDF)</label>
            <div className="flex items-center gap-2">
              <label className="flex-shrink-0 cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                {uploading === 'ms' ? 'Uploading…' : 'Choose PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload('ms', f);
                    e.target.value = '';
                  }}
                />
              </label>
              {form.mark_scheme_url ? (
                <a href={form.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline truncate">
                  ✓ uploaded — view
                </a>
              ) : (
                <span className="text-xs text-gray-400">no file yet</span>
              )}
            </div>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600 mb-3">{uploadError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Explanation Status</label>
            <select
              value={form.explanation_status}
              onChange={(e) => setForm({ ...form, explanation_status: e.target.value as 'coming_soon' | 'published' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="coming_soon">Coming Soon</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Explanation Video URL (YouTube)</label>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=…"
              value={form.explanation_video_url}
              onChange={(e) => setForm({ ...form, explanation_video_url: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
          <button
            onClick={() => setForm(emptyForm)}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2.5"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ---- Existing entries ---- */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">All Entries</h2>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter — e.g. 2023 or Paper 4 or May"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-72"
        />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {papers.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">No papers added yet.</div>}
        {papers
          .filter((p) => {
            if (!filter.trim()) return true;
            const hay = `${p.year} ${p.session} paper ${p.paper_number} variant ${p.variant} ${PAPER_LABELS[p.paper_number] ?? ''}`.toLowerCase();
            return filter.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
          })
          .slice(0, 80)
          .map((p) => (
          <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[14.5px]">
                {p.year} {p.session} · {PAPER_LABELS[p.paper_number]} · Variant {p.variant}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                <span className={p.question_paper_url ? 'text-green-600' : 'text-gray-300'}>QP</span>
                <span className={p.mark_scheme_url ? 'text-green-600' : 'text-gray-300'}>MS</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    p.explanation_status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {p.explanation_status === 'published' ? 'Published' : 'Coming Soon'}
                </span>
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => loadForEdit(p)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-sm font-medium text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
          ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Showing up to 80 at a time — use the filter to narrow down.
      </p>
    </div>
  );
}
