/**
 * GET   /api/admin/tutoring-bookings — every addon purchase, newest first
 * POST  /api/admin/tutoring-bookings — manually record a booking (payment
 *       confirmed outside the Shopier checkout, e.g. bank transfer or a
 *       native Shopier storefront link — mirrors /api/admin/access, which
 *       grants subscription access the same manual way)
 * PATCH /api/admin/tutoring-bookings — update status / schedule / note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';

const STATUSES = ['pending', 'paid', 'scheduled', 'completed', 'cancelled'];

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const result = await query(
    `SELECT p.id, p.price_paid_try, p.status, p.student_note, p.admin_note, p.scheduled_at, p.created_at,
            u.first_name, u.last_name, u.email, a.name AS addon_name
     FROM addon_purchases p
     JOIN users u ON u.id = p.student_id
     JOIN addon_services a ON a.id = p.addon_id
     ORDER BY (p.status = 'paid') DESC, p.created_at DESC`
  );

  return NextResponse.json({
    success: true,
    bookings: result.rows.map((r) => ({
      id: r.id,
      pricePaidTry: r.price_paid_try,
      status: r.status,
      studentNote: r.student_note,
      adminNote: r.admin_note,
      scheduledAt: r.scheduled_at,
      createdAt: r.created_at,
      studentName: [r.first_name, r.last_name].filter(Boolean).join(' '),
      studentEmail: r.email,
      addonName: r.addon_name,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { email, addonSlug, priceOverride } = (await req.json()) as {
    email?: string;
    addonSlug?: string;
    priceOverride?: string;
  };
  if (!email || !addonSlug) {
    return NextResponse.json({ success: false, error: 'email and addonSlug are required' }, { status: 400 });
  }

  const userRes = await query(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (userRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: `No account found for ${email}` }, { status: 404 });
  }
  const addonRes = await query(`SELECT id, price_try FROM addon_services WHERE slug = $1`, [addonSlug]);
  if (addonRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Unknown addon' }, { status: 400 });
  }
  const addon = addonRes.rows[0];
  const price = priceOverride || addon.price_try;

  await query(
    `INSERT INTO addon_purchases (student_id, addon_id, price_paid_try, status) VALUES ($1, $2, $3, 'paid')`,
    [userRes.rows[0].id, addon.id, price]
  );

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { id, status, scheduledAt, adminNote } = (await req.json()) as {
    id?: string;
    status?: string;
    scheduledAt?: string;
    adminNote?: string;
  };
  if (!id || !status || !STATUSES.includes(status)) {
    return NextResponse.json({ success: false, error: 'id and a valid status are required' }, { status: 400 });
  }

  await query(
    `UPDATE addon_purchases SET status = $2, scheduled_at = $3, admin_note = $4, updated_at = now() WHERE id = $1`,
    [id, status, scheduledAt || null, adminNote || null]
  );

  return NextResponse.json({ success: true });
}
