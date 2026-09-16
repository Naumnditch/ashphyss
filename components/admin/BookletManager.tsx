'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { putFileToSignedUrl } from '@/lib/storage/directUpload';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
}
interface Topic {
  id: string;
  chapter_id: string;
  topic_name: string;
  order: number;
}
interface Booklet {
  id: string;
  chapter_id: string;
  topic_id: string | null;
  chapter_number: number;
  chapter_title: string;
  topic_name: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  order: number;
}

const emptyForm = {
  id: null as string | null,
  chapter_id: '',
  topic_id: '',
  title: '',
  description: '',
  file_url: '',
  file_size_bytes: null as number | null,
  order: 0,
};

function formatBytes(n: number | null) {
  if (!n) return '';
  return n > 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

export function BookletManager({
  initialBooklets,
  chapters,
  topics,
}: {
  initialBooklets: Booklet[];
  chapters: Chapter[];
  topics: Topic[];
}) {
  const router = useRouter();
  const [booklets, setBooklets] = useState(initialBooklets);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const topicsForChapter = topics.filter((t) => t.chapter_id === form.chapter_id);

  const handleUpload = async (file: File) => {
    if (!form.chapter_id) {
      setError('Pick a chapter first, so the file path is meaningful');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const chapter = chapters.find((c) => c.id === form.chapter_id);
      const topic = topics.find((t) => t.id === form.topic_id);
      const path = `chapter-${chapter?.chapter_number}${topic ? `/${slug(topic.topic_name)}` : ''}/${slug(form.title || file.name)}.pdf`;
      const res = await fetch('/api/admin/booklets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Upload failed');
        return;
      }
      const put = await putFileToSignedUrl(data.signedUrl, file);
      if (!put.ok) {
        setError(put.error);
        return;
      }
      setForm((f) => ({ ...f, file_url: data.publicUrl, file_size_bytes: file.size }));
    } catch {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.chapter_id || !form.title) {
      setError('Chapter and title are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/booklets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Save failed');
        return;
      }
      setForm(emptyForm);
      router.refresh();
      // refetch list to pick up joined chapter/topic titles
      const listRes = await fetch('/api/admin/booklets');
      const listData = await listRes.json();
      if (listData.success) setBooklets(listData.booklets);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this booklet?')) return;
    const res = await fetch(`/api/admin/booklets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBooklets((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    }
  };

  const loadForEdit = (b: Booklet) => {
    setForm({
      id: b.id,
      chapter_id: b.chapter_id,
      topic_id: b.topic_id || '',
      title: b.title,
      description: b.description || '',
      file_url: b.file_url || '',
      file_size_bytes: b.file_size_bytes,
      order: b.order,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {form.id ? 'Edit Booklet' : 'Add Booklet'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chapter</label>
            <select
              value={form.chapter_id}
              onChange={(e) => setForm({ ...form, chapter_id: e.target.value, topic_id: '' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a chapter…</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>Ch. {c.chapter_number} — {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Lesson (optional — leave blank for a whole-chapter booklet)</label>
            <select
              value={form.topic_id}
              onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
              disabled={!form.chapter_id}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Whole chapter</option>
              {topicsForChapter.map((t) => (
                <option key={t.id} value={t.id}>{t.topic_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input
            type="text"
            placeholder="e.g. Chapter 3 Booklet — Forces and Motion"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Booklet (PDF)</label>
          <div className="flex items-center gap-2">
            <label className="flex-shrink-0 cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              {uploading ? 'Uploading…' : 'Choose PDF'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = '';
                }}
              />
            </label>
            {form.file_url ? (
              <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline">
                ✓ uploaded ({formatBytes(form.file_size_bytes)}) — view
              </a>
            ) : (
              <span className="text-xs text-gray-400">no file yet</span>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : form.id ? 'Update Booklet' : 'Save Booklet'}
          </button>
          <button onClick={() => setForm(emptyForm)} className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2.5">
            Clear
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All Booklets</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {booklets.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">No booklets added yet.</div>}
        {booklets.map((b) => (
          <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[14.5px]">{b.title}</div>
              <div className="text-xs text-gray-400">
                Ch. {b.chapter_number} — {b.chapter_title}{b.topic_name ? ` · ${b.topic_name}` : ' · whole chapter'}
                {b.file_url ? ` · ${formatBytes(b.file_size_bytes)}` : ' · no file'}
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => loadForEdit(b)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Edit</button>
              <button onClick={() => handleDelete(b.id)} className="text-sm font-medium text-red-500 hover:text-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
