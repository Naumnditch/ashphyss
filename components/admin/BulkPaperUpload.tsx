'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { putFileToSignedUrl } from '@/lib/storage/directUpload';

interface Result {
  matchedCount: number;
  matched: string[];
  skipped: { name: string; reason: string }[];
}
type PrepareResult =
  | { name: string; ok: true; label: string; paperId: string; column: string; signedUrl: string; publicUrl: string }
  | { name: string; ok: false; reason: string };

/** Keeps each server round trip (metadata only, never file bytes) small and fast. */
const BATCH_SIZE = 20;
/** How many direct-to-storage uploads run at once within a batch. */
const UPLOAD_CONCURRENCY = 4;

export function BulkPaperUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: files.length });

    const all: Result = { matchedCount: 0, matched: [], skipped: [] };
    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const byName = new Map(batch.map((f) => [f.name, f]));

        // Phase 1: which files match a real slot, plus a signed upload URL
        // for each — small JSON only, no file bytes cross this call.
        const prepRes = await fetch('/api/admin/past-papers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prepare', files: batch.map((f) => ({ name: f.name, size: f.size, type: f.type })) }),
        });
        const prepData = await prepRes.json();
        if (!prepRes.ok || !prepData.success) {
          setError(prepData.error || 'Could not prepare this batch');
          break;
        }
        const results: PrepareResult[] = prepData.results;

        // Phase 2: PUT each matched file straight to Supabase Storage —
        // never through our own function. This is what actually fixes the
        // size limit. Bounded concurrency so a big batch doesn't open
        // dozens of uploads simultaneously.
        const uploaded: { paperId: string; column: string; publicUrl: string; label: string }[] = [];
        let cursor = 0;
        const worker = async () => {
          while (cursor < results.length) {
            const r = results[cursor++];
            if (!r.ok) {
              all.skipped.push({ name: r.name, reason: r.reason });
              continue;
            }
            const file = byName.get(r.name);
            if (!file) continue;
            const put = await putFileToSignedUrl(r.signedUrl, file);
            if (!put.ok) {
              all.skipped.push({ name: r.name, reason: put.error });
              continue;
            }
            uploaded.push({ paperId: r.paperId, column: r.column, publicUrl: r.publicUrl, label: r.label });
          }
        };
        await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, results.length) }, worker));

        // Phase 3: record the resulting public URLs — small JSON again.
        if (uploaded.length > 0) {
          const confirmRes = await fetch('/api/admin/past-papers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'confirm', updates: uploaded.map(({ paperId, column, publicUrl }) => ({ paperId, column, publicUrl })) }),
          });
          const confirmData = await confirmRes.json();
          if (confirmRes.ok && confirmData.success) {
            all.matchedCount += confirmData.confirmed;
            all.matched.push(...uploaded.map((u) => u.label));
          } else {
            for (const u of uploaded) all.skipped.push({ name: u.label, reason: 'uploaded, but saving the link failed — try again' });
          }
        }

        setProgress({ done: Math.min(i + BATCH_SIZE, files.length), total: files.length });
      }
      setResult(all);
      setFiles([]);
      router.refresh();
    } catch {
      setError('Network error during upload');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Bulk upload</h2>
      <p className="text-[13px] text-gray-500 leading-snug mb-4">
        Select as many papers as you like at once. Each file is filed automatically by its Cambridge name —{' '}
        <span className="font-mono text-gray-700">0625_s23_qp_42.pdf</span> becomes the May/Jun 2023 Paper 4 Variant 2
        question paper. Keep the original filenames and nothing needs sorting by hand.
      </p>

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <label className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          Choose PDFs
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setResult(null); setError(null); }}
          />
        </label>
        <span className="text-sm text-gray-500">
          {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'} ready` : 'no files chosen'}
        </span>
        {files.length > 0 && !busy && (
          <button onClick={upload} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2 rounded-lg">
            Upload and file them
          </button>
        )}
      </div>

      {busy && (
        <div className="mb-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{progress.done} of {progress.total} processed…</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-green-800">
              {result.matchedCount} file{result.matchedCount === 1 ? '' : 's'} filed successfully
            </p>
            {result.matched.length > 0 && (
              <p className="text-xs text-green-700 mt-1 leading-relaxed">
                {result.matched.slice(0, 12).join(' · ')}
                {result.matched.length > 12 ? ` · and ${result.matched.length - 12} more` : ''}
              </p>
            )}
          </div>

          {result.skipped.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {result.skipped.length} skipped — nothing was guessed at
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5 max-h-40 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={i}><span className="font-mono">{s.name}</span> — {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
