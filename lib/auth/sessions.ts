/**
 * Session/device-limit logic — the actual enforcement behind "sign in on at
 * most 2 devices at once". A "session" here is a `sessions` row keyed by
 * (user_id, device_id); the JWT only carries its id (see lib/auth/jwt.ts),
 * and lib/auth/session.ts's getCurrentUser() checks that row on every
 * request so revoking one here really does log that device out.
 */

import { query } from '@/lib/db/client';

export const MAX_DEVICES = 2;
/** Safety net so a session nobody ever explicitly revokes doesn't count
 *  against the limit forever — matches the JWT's own expiry order of
 *  magnitude but errs generous since re-login naturally refreshes it. */
export const SESSION_CEILING_DAYS = 90;
/** Only write last_seen_at when it's gone stale by more than this, so a
 *  page-load burst from one active user doesn't hammer the DB. */
export const LAST_SEEN_THROTTLE_MINUTES = 5;

export interface ActiveSession {
  id: string;
  deviceId: string;
  deviceLabel: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
}

const ACTIVE_WHERE = `revoked_at IS NULL AND created_at > now() - interval '${SESSION_CEILING_DAYS} days'`;

export async function listActiveSessions(userId: string): Promise<ActiveSession[]> {
  const result = await query(
    `SELECT id, device_id, device_label, ip, created_at, last_seen_at
     FROM sessions
     WHERE user_id = $1 AND ${ACTIVE_WHERE}
     ORDER BY last_seen_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    deviceId: r.device_id,
    deviceLabel: r.device_label,
    ip: r.ip,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  }));
}

export type LoginSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; devices: ActiveSession[] };

/**
 * Called after password verification, before a token is issued.
 * - Same device already has an active session -> refresh it, don't spend a slot.
 * - Otherwise, under the device limit -> create a new session.
 * - Otherwise -> refuse, returning the active devices so the caller can
 *   offer "sign out a device and try again".
 */
export async function resolveLoginSession(
  userId: string,
  deviceId: string,
  deviceLabel: string,
  ip: string
): Promise<LoginSessionResult> {
  const existing = await query(
    `SELECT id FROM sessions WHERE user_id = $1 AND device_id = $2 AND ${ACTIVE_WHERE}
     ORDER BY created_at DESC LIMIT 1`,
    [userId, deviceId]
  );
  if (existing.rows.length > 0) {
    const sessionId = existing.rows[0].id;
    await query(
      `UPDATE sessions SET last_seen_at = now(), ip = $2, device_label = $3 WHERE id = $1`,
      [sessionId, ip, deviceLabel]
    );
    return { ok: true, sessionId };
  }

  const active = await listActiveSessions(userId);
  if (active.length >= MAX_DEVICES) {
    return { ok: false, devices: active };
  }

  const created = await query(
    `INSERT INTO sessions (user_id, device_id, device_label, ip) VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, deviceId, deviceLabel, ip]
  );
  return { ok: true, sessionId: created.rows[0].id };
}

/** Returns the owning user_id, or null if the session doesn't exist. Used
 *  to authorize a revoke request without leaking whether a session exists. */
export async function getSessionOwner(sessionId: string): Promise<string | null> {
  const result = await query(`SELECT user_id FROM sessions WHERE id = $1`, [sessionId]);
  return result.rows[0]?.user_id ?? null;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await query(`UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [sessionId]);
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await query(
    `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL RETURNING id`,
    [userId]
  );
  return result.rowCount ?? 0;
}
