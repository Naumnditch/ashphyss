/**
 * PATCH /api/admin/curriculum/tier
 * Body: { table: 'simulations' | 'topics' | 'lessons', id: string, requiredTier: number }
 *
 * Sets the minimum plan tier needed to access a simulation or lesson
 * (Part 3). `table` is restricted to an allowlist rather than interpolated
 * directly — it never comes from anywhere but this fixed set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';

const TABLES = new Set(['simulations', 'topics', 'lessons']);

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const { table, id, requiredTier } = (await req.json()) as { table?: string; id?: string; requiredTier?: number };
  if (!table || !TABLES.has(table) || !id || typeof requiredTier !== 'number' || requiredTier < 0 || requiredTier > 2) {
    return NextResponse.json({ success: false, error: 'table, id and a requiredTier of 0-2 are required' }, { status: 400 });
  }

  await query(`UPDATE ${table} SET required_tier = $2 WHERE id = $1`, [id, requiredTier]);

  return NextResponse.json({ success: true });
}
