/**
 * Client-side event firing — fire-and-forget, never blocks rendering or
 * delays navigation. Uses navigator.sendBeacon (designed for exactly this:
 * a small POST that survives the page unloading), falling back to a
 * keepalive fetch where sendBeacon isn't available.
 *
 * Deliberately has no imports beyond browser globals, so importing it from
 * a 'use client' component never pulls server-only code (e.g. the pg
 * driver) into the browser bundle.
 */

export interface TrackEventInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export function trackEvent(input: TrackEventInput): void {
  try {
    const body = JSON.stringify(input);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
      return;
    }
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the page it's attached to.
  }
}
