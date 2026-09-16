/**
 * POST /api/analytics/track
 * Public sink for client-side event beacons (see lib/analytics/client.ts).
 * Body: { eventType, entityType?, entityId?, path?, metadata? }
 *
 * user_id is never taken from the client — always derived server-side from
 * the auth cookie, so a visitor can't attribute an event to someone else.
 * Always responds 200: a tracking failure is never something the caller
 * (a sendBeacon call with nothing listening for the result) should retry
 * or surface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/client';
import { logEvent, EVENT_TYPES } from '@/lib/analytics/track';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json({ success: true });
    }

    const user = await getCurrentUser();
    let entityId: string | null = body.entityId ?? null;

    // Simulation pages don't know their own DB id client-side (they're
    // static routes) — resolve it here from the path instead, so every
    // simulation page only needs to drop in a tracker with no props.
    if (!entityId && body.entityType === 'simulation' && body.path) {
      const r = await query(`SELECT id FROM simulations WHERE url_path = $1`, [body.path]);
      entityId = r.rows[0]?.id ?? null;
    }

    await logEvent({
      userId: user?.id ?? null,
      eventType: body.eventType,
      entityType: body.entityType ?? null,
      entityId,
      path: body.path ?? null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('analytics track route failed', err);
    return NextResponse.json({ success: true });
  }
}
