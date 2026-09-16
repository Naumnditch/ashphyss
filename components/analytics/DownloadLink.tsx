'use client';

import { trackEvent } from '@/lib/analytics/client';

/** A plain download <a>, instrumented — used from Server Component pages
 *  (like /booklets) that don't otherwise need client interactivity. */
export function DownloadLink({
  href,
  entityType,
  entityId,
  className,
  children,
}: {
  href: string;
  entityType: 'booklet' | 'past_paper';
  entityId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent({ eventType: 'download', entityType, entityId })}
      className={className}
    >
      {children}
    </a>
  );
}
