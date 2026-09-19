/**
 * GET  /api/video-requests — the current student's own requests
 * POST /api/video-requests — submit a new video solve request
 *
 * Server-side tier enforcement (Part 1): this is the actual gate, not the
 * /video-requests page's UI — a Plus/Pro-only feature must reject a free
 * user's request even if they reach this endpoint directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PLUS } from '@/lib/subscriptions/getUserTier';
import { getMaxOpenVideoRequests } from '@/lib/settings';
import { query } from '@/lib/db/client';
import { signedFileUrl } from '@/lib/storage/signed';

const OPEN_STATUSES = ['open', 'in_progress'];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 });
  }

  const result = await query(
    `SELECT r.id, r.description, r.screenshot_path, r.status, r.youtube_url, r.admin_note, r.created_at,
            t.topic_name, c.chapter_number, c.title AS chapter_title
     FROM video_requests r
     LEFT JOIN topics t ON t.id = r.topic_id
     LEFT JOIN chapters c ON c.id = r.chapter_id
     WHERE r.student_id = $1
     ORDER BY r.created_at DESC`,
    [user.id]
  );

  const requests = await Promise.all(
    result.rows.map(async (r) => ({
      id: r.id,
      description: r.description,
      status: r.status,
      youtubeUrl: r.youtube_url,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      topicName: r.topic_name,
      chapterNumber: r.chapter_number,
      chapterTitle: r.chapter_title,
      screenshotUrl: r.screenshot_path ? await signedFileUrl('video-request-screenshots', r.screenshot_path) : null,
    }))
  );

  return NextResponse.json({ success: true, requests });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 });
  }

  const tier = await getUserTier(user.id);
  if (tier < TIER_PLUS) {
    return NextResponse.json({ success: false, error: 'Video solve requests are available on Plus and Pro plans.' }, { status: 403 });
  }

  const { description, topicId, chapterId, screenshotPath } = (await req.json()) as {
    description?: string;
    topicId?: string;
    chapterId?: string;
    screenshotPath?: string;
  };
  if (!description || !description.trim()) {
    return NextResponse.json({ success: false, error: 'A description of the problem is required' }, { status: 400 });
  }

  const maxOpen = await getMaxOpenVideoRequests();
  const openCount = await query(
    `SELECT COUNT(*)::int AS n FROM video_requests WHERE student_id = $1 AND status = ANY($2::text[])`,
    [user.id, OPEN_STATUSES]
  );
  if (openCount.rows[0].n >= maxOpen) {
    return NextResponse.json(
      { success: false, error: `You already have ${maxOpen} open video requests. Wait for one to be answered before submitting another.` },
      { status: 429 }
    );
  }

  const inserted = await query(
    `INSERT INTO video_requests (student_id, chapter_id, topic_id, description, screenshot_path)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [user.id, chapterId || null, topicId || null, description.trim(), screenshotPath || null]
  );

  return NextResponse.json({ success: true, id: inserted.rows[0].id });
}
