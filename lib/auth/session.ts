/**
 * Server-side session helper.
 * Reads the JWT from the httpOnly cookie (set at login/signup) so
 * Server Components and API routes can identify the current user
 * without relying on client-side localStorage.
 */

import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import { query } from '@/lib/db/client';
import { LAST_SEEN_THROTTLE_MINUTES } from '@/lib/auth/sessions';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  sectionId: string | null;
}

/**
 * Returns the current user with FRESH status/role from the database
 * (not just what was in the JWT at login time), since a teacher's
 * approval status can change after their token was issued.
 *
 * Also validates the session the token is bound to: a JWT with a valid
 * signature and unexpired `exp` is NOT enough on its own anymore — if its
 * `sessionId` points at a row that's been revoked (or doesn't exist, e.g.
 * a token issued before this system shipped), the caller is treated as
 * logged out. This is what actually makes "sign out this device" work,
 * since a JWT itself can't be invalidated before it expires.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get('token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.sessionId) return null;

  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.section_id,
              s.revoked_at, s.last_seen_at
       FROM users u
       JOIN sessions s ON s.id = $2
       WHERE u.id = $1`,
      [payload.id, payload.sessionId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (row.revoked_at) return null;

    const staleMs = Date.now() - new Date(row.last_seen_at).getTime();
    if (staleMs > LAST_SEEN_THROTTLE_MINUTES * 60 * 1000) {
      await query(`UPDATE sessions SET last_seen_at = now() WHERE id = $1`, [payload.sessionId]);
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      status: row.status,
      sectionId: row.section_id,
    };
  } catch (err) {
    console.error('getCurrentUser: failed to load user', err);
    return null;
  }
}
