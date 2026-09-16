/**
 * JWT Authentication
 * Token generation and validation
 */

import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  sectionId?: string;
  /** Ties this token to a row in `sessions` — see lib/auth/session.ts. Every
   *  token issued after the device-limit system shipped carries one; a
   *  token without it (or one whose session was revoked) is treated as
   *  logged out even though the signature is still technically valid. */
  sessionId: string;
}

interface PreAuthPayload {
  type: 'pre_auth';
  userId: string;
}

/**
 * There is no real "startup" in a serverless function — this throws the
 * first time this module is imported for a given invocation, which is as
 * close to that as this platform gets. Deliberately no fallback: a missing
 * or short secret must be a loud failure, not a silently-insecure default
 * ('default-secret-key-change-in-production' let anyone forge a valid
 * token for any user if the real secret was never configured).
 */
function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Refusing to sign or verify tokens with an insecure default — set a real JWT_SECRET in the environment.'
    );
  }
  return secret;
}

const JWT_SECRET: jwt.Secret = requireSecret();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
const PRE_AUTH_EXPIRES_IN: jwt.SignOptions['expiresIn'] = '10m';

export function generateToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Proves "this caller just supplied the right password for this account"
 * without issuing a real session — handed back alongside a 409 device-limit
 * response so the login page can let the user revoke one of their existing
 * devices and retry, without a stranger being able to revoke a device just
 * by knowing the email address (see POST /api/auth/sessions/revoke).
 */
export function generatePreAuthToken(userId: string): string {
  const payload: PreAuthPayload = { type: 'pre_auth', userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: PRE_AUTH_EXPIRES_IN });
}

export function verifyPreAuthToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<PreAuthPayload>;
    if (decoded?.type !== 'pre_auth' || typeof decoded.userId !== 'string') return null;
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
}
