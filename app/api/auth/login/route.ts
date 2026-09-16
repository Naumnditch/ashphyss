/**
 * POST /api/auth/login
 * User login endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken, generatePreAuthToken } from '@/lib/auth/jwt';
import { checkLoginRateLimit, recordFailedLoginAttempt } from '@/lib/auth/rateLimit';
import { resolveLoginSession } from '@/lib/auth/sessions';
import { DEVICE_ID_COOKIE, DEVICE_ID_MAX_AGE, deviceLabelFromUserAgent, clientIpFromHeaders } from '@/lib/auth/device';
import { LoginRequest, ApiResponse } from '@/types';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ip = clientIpFromHeaders(req.headers);

    // Checked before touching the user row at all, so a wrong-password
    // guessing spree costs the same whether the email exists or not.
    const rateLimit = await checkLoginRateLimit(email);
    if (rateLimit.blocked) {
      return NextResponse.json(
        {
          success: false,
          error: 'too_many_attempts',
          message: `Too many failed attempts for this account. Try again in about ${rateLimit.retryAfterMinutes} minute${rateLimit.retryAfterMinutes === 1 ? '' : 's'}.`,
        },
        { status: 429 }
      );
    }

    const result = await query(
      'SELECT id, email, password_hash, role, section_id, status, first_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await recordFailedLoginAttempt(email, ip);
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const user = result.rows[0];

    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'This account has been suspended.' },
        { status: 403 }
      );
    }

    // Pending teachers (status='inactive') ARE allowed to log in so they can
    // see their application status page - only suspended accounts are blocked.

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      await recordFailedLoginAttempt(email, ip);
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // The device_id cookie is normally already set by middleware on an
    // earlier page load; generated here too as a fallback so a login that
    // somehow arrives as the very first request from this browser still
    // works (middleware can't see this request's own Set-Cookie).
    const existingDeviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    const deviceId = existingDeviceId || crypto.randomUUID();
    const deviceLabel = deviceLabelFromUserAgent(req.headers.get('user-agent'));

    const sessionResult = await resolveLoginSession(user.id, deviceId, deviceLabel, ip);

    if (!sessionResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'device_limit',
          message: `You're signed in on ${sessionResult.devices.length} devices already. Sign out of one to continue.`,
          devices: sessionResult.devices.map((s) => ({ id: s.id, label: s.deviceLabel, lastSeenAt: s.lastSeenAt })),
          preAuthToken: generatePreAuthToken(user.id),
        },
        { status: 409 }
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      sectionId: user.section_id,
      sessionId: sessionResult.sessionId,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      message: 'Login successful',
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    if (!existingDeviceId) {
      response.cookies.set(DEVICE_ID_COOKIE, deviceId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: DEVICE_ID_MAX_AGE,
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
