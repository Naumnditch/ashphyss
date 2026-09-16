/**
 * GET  /api/admin/past-papers          — list all entries
 * POST /api/admin/past-papers          — create or update one entry (upsert on the unique key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';

const SESSIONS = ['Feb/Mar', 'May/Jun', 'Oct/Nov'];
const SYLLABUSES = ['0625', '0972'];

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }
  const result = await query(`SELECT * FROM past_papers ORDER BY year DESC, paper_number ASC, variant ASC`);
  return NextResponse.json({ success: true, papers: result.rows });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    syllabus_code: syllabusCode,
    year,
    session,
    paper_number: paperNumber,
    variant,
    question_paper_url: questionPaperUrl,
    mark_scheme_url: markSchemeUrl,
    explanation_status: explanationStatus,
    explanation_video_url: explanationVideoUrl,
    explanation_notes: explanationNotes,
  } = body;

  if (!year || !session || !paperNumber) {
    return NextResponse.json({ success: false, error: 'year, session, and paper_number are required' }, { status: 400 });
  }
  if (!SESSIONS.includes(session)) {
    return NextResponse.json({ success: false, error: `session must be one of ${SESSIONS.join(', ')}` }, { status: 400 });
  }
  if (paperNumber < 1 || paperNumber > 6) {
    return NextResponse.json({ success: false, error: 'paper_number must be between 1 and 6' }, { status: 400 });
  }
  if (syllabusCode && !SYLLABUSES.includes(syllabusCode)) {
    return NextResponse.json({ success: false, error: `syllabus_code must be one of ${SYLLABUSES.join(', ')}` }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO past_papers
       (syllabus_code, year, session, paper_number, variant, question_paper_url, mark_scheme_url,
        explanation_status, explanation_video_url, explanation_notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (syllabus_code, year, session, paper_number, variant)
     DO UPDATE SET
       question_paper_url = EXCLUDED.question_paper_url,
       mark_scheme_url = EXCLUDED.mark_scheme_url,
       explanation_status = EXCLUDED.explanation_status,
       explanation_video_url = EXCLUDED.explanation_video_url,
       explanation_notes = EXCLUDED.explanation_notes,
       updated_at = now()
     RETURNING *`,
    [
      syllabusCode || '0625',
      year,
      session,
      paperNumber,
      variant || 1,
      questionPaperUrl || null,
      markSchemeUrl || null,
      explanationStatus || 'coming_soon',
      explanationVideoUrl || null,
      explanationNotes || null,
    ]
  );

  return NextResponse.json({ success: true, paper: result.rows[0] });
}
