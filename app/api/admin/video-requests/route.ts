/**
 * GET   /api/admin/video-requests — every student's requests, newest first
 * PATCH /api/admin/video-requests — update status / YouTube link / note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { signedFileUrl } from '@/lib/storage/signed';

const STATUSES = ['open', 'in_progress', 'fulfilled', 'declined'];

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const result = await query(
    `SELECT r.id, r.description, r.screenshot_path, r.status, r.youtube_url, r.admin_note, r.created_at,
            u.first_name, u.last_name, u.email,
            t.topic_name, c.chapter_number, c.title AS chapter_title
     FROM video_requests r
     JOIN users u ON u.id = r.student_id
     LEFT JOIN topics t ON t.id = r.topic_id
     LEFT JOIN chapters c ON c.id = r.chapter_id
     ORDER BY (r.status = 'open') DESC, r.created_at DESC`
  );

  const requests = await Promise.all(
    result.rows.map(async (r) => ({
      id: r.id,
      description: r.description,
      status: r.status,
      youtubeUrl: r.youtube_url,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      studentName: [r.first_name, r.last_name].filter(Boolean).join(' '),
      studentEmail: r.email,
      topicName: r.topic_name,
      chapterNumber: r.chapter_number,
      chapterTitle: r.chapter_title,
      screenshotUrl: r.screenshot_path ? await signedFileUrl('video-request-screenshots', r.screenshot_path) : null,
    }))
  );

  return NextResponse.json({ success: true, requests });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { id, status, youtubeUrl, adminNote } = (await req.json()) as {
    id?: string;
    status?: string;
    youtubeUrl?: string;
    adminNote?: string;
  };
  if (!id || !status || !STATUSES.includes(status)) {
    return NextResponse.json({ success: false, error: 'id and a valid status are required' }, { status: 400 });
  }
  if (status === 'fulfilled' && youtubeUrl && !/^https:\/\/(youtu\.be\/|(www\.)?youtube\.com\/)/i.test(youtubeUrl)) {
    return NextResponse.json({ success: false, error: 'youtubeUrl must be a youtube.com or youtu.be link' }, { status: 400 });
  }

  await query(
    `UPDATE video_requests SET status = $2, youtube_url = $3, admin_note = $4, updated_at = now() WHERE id = $1`,
    [id, status, youtubeUrl || null, adminNote || null]
  );

  return NextResponse.json({ success: true });
}
