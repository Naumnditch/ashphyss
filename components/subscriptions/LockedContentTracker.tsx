'use client';

import { useEffect } from 'react';
import { recordLockedContentAttempt } from '@/lib/paywall/client';

/** Fires once when a locked simulation/lesson actually renders — the real "attempt", not a UI hover. */
export function LockedContentTracker() {
  useEffect(() => {
    recordLockedContentAttempt();
  }, []);
  return null;
}
