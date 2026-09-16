'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/client';

/**
 * Dropped into every simulation page with no props needed — the DB id for
 * a simulation isn't known client-side (these are static routes), so the
 * server resolves it from the path (see /api/analytics/track).
 * Fires once per mount, not per interaction — that's what "start" means.
 */
export function SimulationStartTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackEvent({ eventType: 'simulation_start', entityType: 'simulation', path: pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
