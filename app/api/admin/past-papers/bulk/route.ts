/**
 * POST /api/admin/past-papers/bulk
 *
 * Two-phase, so the actual PDF bytes never pass through this function (the
 * previous design sent whole files here and silently broke on Vercel's
 * ~4.5MB serverless request-body ceiling for anything beyond a small,
 * text-only paper — see lib/storage/signedUpload.ts for the full story).
 *
 * action: "prepare" — JSON { files: [{ name, size, type }] } (metadata
 *   only). For each file, reads its Cambridge filename (0625_s23_qp_42.pdf
 *   = May/June 2023 Paper 4 Variant 2 question paper), upserts the matching
 *   past_papers row (any syllabus code in the filename — not just 0625 —
 *   auto-creates its slot on first sight, since Cambridge runs several
 *   parallel syllabuses, e.g. 0972 IGCSE (9-1) Physics, with the same paper
 *   structure but a different code, and guessing which years/sessions to
 *   pre-seed for each one isn't reliable), and mints a signed upload URL.
 *   Only real problems are skipped and reported rather than guessed at:
 *   wrong name, wrong type, too big, or a paper number outside 1-6.
 *
 * action: "confirm" — JSON { updates: [{ paperId, column, publicUrl }] },
 *   sent after the browser has PUT each file directly to its signed URL.
 *   Writes the public URL onto each matched row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { parseCambridgeName } from '@/lib/papers/filename';
import { createSignedUploadUrl, publicStorageUrl } from '@/lib/storage/signedUpload';

const BUCKET = 'past-papers';
const MAX_BYTES = 20 * 1024 * 1024;

/** Paper structure is the same across Cambridge's parallel IGCSE syllabuses
 *  (e.g. 0625 and the 9-1 variant 0972) — same six papers, same tiers and
 *  marks — so this map isn't syllabus-specific. */
const PAPER_META: Record<number, { name: string; tier: string | null; maxMarks: number }> = {
  1: { name: 'Multiple Choice', tier: 'Core', maxMarks: 40 },
  2: { name: 'Multiple Choice', tier: 'Extended', maxMarks: 40 },
  3: { name: 'Theory', tier: 'Core', maxMarks: 80 },
  4: { name: 'Theory', tier: 'Extended', maxMarks: 80 },
  5: { name: 'Practical Test', tier: null, maxMarks: 40 },
  6: { name: 'Alternative to Practical', tier: null, maxMarks: 40 },
};

interface FileMeta {
  name: string;
  size: number;
  type: string;
}
interface PrepareOk {
  name: string;
  ok: true;
  label: string;
  paperId: string;
  column: 'question_paper_url' | 'mark_scheme_url';
  signedUrl: string;
  publicUrl: string;
}
interface PrepareSkip {
  name: string;
  ok: false;
  reason: string;
}

async function prepareOne(f: FileMeta): Promise<PrepareOk | PrepareSkip> {
  const parsed = parseCambridgeName(f.name);
  if (!parsed) return { name: f.name, ok: false, reason: 'filename not in Cambridge format' };
  if (f.type !== 'application/pdf') return { name: f.name, ok: false, reason: 'not a PDF' };
  if (f.size > MAX_BYTES) return { name: f.name, ok: false, reason: 'over 20 MB' };
  const meta = PAPER_META[parsed.paperNumber];
  if (!meta) return { name: f.name, ok: false, reason: `paper number ${parsed.paperNumber} is outside 1-6` };

  const rowRes = await query(
    `INSERT INTO past_papers (syllabus_code, year, session, paper_number, variant, paper_name, tier, max_marks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (syllabus_code, year, session, paper_number, variant) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [parsed.syllabus, parsed.year, parsed.session, parsed.paperNumber, parsed.variant, meta.name, meta.tier, meta.maxMarks]
  );
  const paperId = rowRes.rows[0].id;
  const path = `${parsed.syllabus}/${parsed.year}-${parsed.session.replace('/', '-')}/${f.name.toLowerCase()}`;

  const signed = await createSignedUploadUrl(BUCKET, path);
  if ('error' in signed) return { name: f.name, ok: false, reason: signed.error };

  return {
    name: f.name,
    ok: true,
    label: `${parsed.session} ${parsed.year} P${parsed.paperNumber}V${parsed.variant} ${parsed.type.toUpperCase()}`,
    paperId,
    column: parsed.type === 'qp' ? 'question_paper_url' : 'mark_scheme_url',
    signedUrl: signed.signedUrl,
    publicUrl: publicStorageUrl(BUCKET, path),
  };
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === 'confirm') {
    const updates = body.updates as { paperId: string; column: string; publicUrl: string }[];
    if (!Array.isArray(updates)) {
      return NextResponse.json({ success: false, error: 'updates array is required' }, { status: 400 });
    }
    let confirmed = 0;
    for (const u of updates) {
      if (u.column !== 'question_paper_url' && u.column !== 'mark_scheme_url') continue;
      await query(`UPDATE past_papers SET ${u.column} = $2, updated_at = now() WHERE id = $1`, [u.paperId, u.publicUrl]);
      confirmed++;
    }
    return NextResponse.json({ success: true, confirmed });
  }

  if (body.action === 'prepare') {
    const files = body.files as FileMeta[];
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ success: false, error: 'files array is required' }, { status: 400 });
    }
    const results = await Promise.all(files.map(prepareOne));
    return NextResponse.json({ success: true, results });
  }

  return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 });
}
