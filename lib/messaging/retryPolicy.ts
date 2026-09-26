/**
 * When a failed email is tried again. The first attempt happens as the
 * message is sent (with one quick in-place retry for a transient error);
 * after that, a background job retries on this schedule, then gives up.
 */

/** Minutes to wait after the Nth failed attempt (1-based). */
export const RETRY_DELAYS_MIN = [2, 10, 30, 120, 480, 1440];
export const MAX_EMAIL_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;

/** When to try next after `attempts` failures, or null to stop. */
export function nextRetryAt(attempts: number, permanent: boolean, now: number = Date.now()): Date | null {
  if (permanent || attempts >= MAX_EMAIL_ATTEMPTS) return null;
  const minutes = RETRY_DELAYS_MIN[Math.max(0, attempts - 1)] ?? RETRY_DELAYS_MIN[RETRY_DELAYS_MIN.length - 1];
  return new Date(now + minutes * 60_000);
}

/** How long a claimed ("pending") email is held before another worker may pick it up again. */
export const SEND_LEASE_MIN = 10;
