/**
 * Next.js Middleware
 * - Protects authenticated routes (dashboard, teacher panel, admin, account)
 * - Sets the long-lived device_id cookie on first visit to any page (see
 *   lib/auth/device.ts) — deliberately runs on page loads only, not on
 *   /api routes, so the login route stays the single place that generates
 *   a device_id for a request that doesn't already have one (avoids two
 *   different Set-Cookie writers racing on the same cookie for one login).
 * Note: JWT verification happens in API routes (Node runtime).
 * Middleware only checks token presence (Edge-compatible).
 */

import { NextRequest, NextResponse } from 'next/server';
import { DEVICE_ID_COOKIE, DEVICE_ID_MAX_AGE } from '@/lib/auth/device';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect these route prefixes
  const protectedPrefixes = ['/teacher', '/admin', '/dashboard', '/account'];

  const needsAuth = protectedPrefixes.some((route) => pathname.startsWith(route));

  if (needsAuth) {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  const response = NextResponse.next();

  if (!req.cookies.get(DEVICE_ID_COOKIE)) {
    response.cookies.set(DEVICE_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEVICE_ID_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  // Every page load except static assets and API routes — API routes (the
  // login route in particular) own their own device_id read-or-create logic.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|assets/).*)'],
};
