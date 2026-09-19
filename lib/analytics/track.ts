/**
 * Server-side event logging. Called directly from route handlers (login,
 * logout, signup) and from POST /api/analytics/track (which client-side
 * trackers hit via sendBeacon — see lib/analytics/client.ts).
 *
 * Never let a logging failure break the request it's attached to: this
 * always resolves, swallowing and just console.error-ing any DB error.
 */

import { query } from '@/lib/db/client';

export const EVENT_TYPES = [
  'page_view',
  'lesson_view',
  'simulation_start',
  'simulation_complete',
  'practice_start',
  'download',
  'login',
  'logout',
  'signup',
  'subscribe_click',
  'paywall_shown',
] as const;

export type AnalyticsEventType = (typeof EVENT_TYPES)[number];

export interface LogEventInput {
  userId?: string | null;
  eventType: AnalyticsEventType | string;
  entityType?: 'lesson' | 'simulation' | 'topic' | 'booklet' | 'past_paper' | 'page' | string | null;
  entityId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO analytics_events (user_id, event_type, entity_type, entity_id, path, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.userId ?? null,
        input.eventType,
        input.entityType ?? null,
        input.entityId ?? null,
        input.path ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );
  } catch (err) {
    console.error('logEvent: failed to record analytics event', input.eventType, err);
  }
}
