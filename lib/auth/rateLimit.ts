/**
 * Login rate limiting — per-email, sliding 15-minute window. Deliberately
 * keyed on email alone (not email+ip): an attacker rotating IPs against one
 * account is exactly the case this needs to catch, and a shared-IP school
 * network shouldn't throttle one student's mistakes into blocking another
 * student's account (different email = different counter).
 */

import { query } from '@/lib/db/client';

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

export interface RateLimitStatus {
  blocked: boolean;
  /** Minutes until the oldest attempt in the window ages out, for the error message. */
  retryAfterMinutes: number;
}

export async function checkLoginRateLimit(email: string): Promise<RateLimitStatus> {
  const result = await query(
    `SELECT count(*)::int AS attempts, min(attempted_at) AS oldest
     FROM login_attempts
     WHERE email = $1 AND attempted_at > now() - interval '${WINDOW_MINUTES} minutes'`,
    [email.toLowerCase()]
  );
  const { attempts, oldest } = result.rows[0];
  if (attempts < MAX_ATTEMPTS) {
    return { blocked: false, retryAfterMinutes: 0 };
  }
  const oldestMs = new Date(oldest).getTime();
  const retryAfterMs = oldestMs + WINDOW_MINUTES * 60 * 1000 - Date.now();
  return { blocked: true, retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60000)) };
}

export async function recordFailedLoginAttempt(email: string, ip: string): Promise<void> {
  await query('INSERT INTO login_attempts (email, ip) VALUES ($1, $2)', [email.toLowerCase(), ip]);
}
