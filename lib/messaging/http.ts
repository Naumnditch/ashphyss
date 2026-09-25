/** Small helpers shared by the messaging API routes. */

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/session';

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function zodMessage(err: ZodError): string {
  const first = err.issues[0];
  return first ? `${first.path.join('.') || 'request'}: ${first.message}` : 'Invalid request';
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && user.role === 'admin' ? user : null;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
