'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/client';

/** Dropped once into the root layout. Skips admin/teacher routes — no
 *  need to track staff using their own tools. */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin') || pathname.startsWith('/teacher')) return;
    trackEvent({ eventType: 'page_view', entityType: 'page', path: pathname });
  }, [pathname]);

  return null;
}
