/**
 * Device identity — the client-generated `device_id` cookie that lets the
 * login device-limit (see lib/auth/sessions.ts) tell "the same browser
 * logging in again" apart from "a genuinely new device". Deliberately NOT
 * an httpOnly cookie and NOT cleared on logout: it identifies the browser
 * itself, independent of whether anyone is currently signed in on it.
 */

export const DEVICE_ID_COOKIE = 'device_id';
export const DEVICE_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, in seconds

/**
 * Best-effort, dependency-free User-Agent summary for a session list —
 * "Chrome on Windows", "Safari on iPhone". Never authoritative (a UA string
 * is trivially spoofable), purely a label to help a student recognize
 * their own devices.
 */
export function deviceLabelFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';

  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/crios\//i.test(ua)) browser = 'Chrome';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && /version\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/ipad/i.test(ua)) os = 'iPad';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(ua)) os = 'Mac';
  else if (/linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

/** Best-effort client IP from Vercel's forwarding headers. */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}
