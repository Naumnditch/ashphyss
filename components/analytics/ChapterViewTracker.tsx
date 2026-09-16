'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/client';

/**
 * Dropped into the chapter detail page. There's no separate per-lesson
 * page in this app — a chapter's topics (= this site's "lessons", see
 * PROJECT_STATUS.md) are all listed on one page — so this fires one
 * lesson_view per topic shown when the chapter page loads. Coarser than
 * per-topic engagement, but simple, non-blocking, and still gives a real
 * "which chapters/topics get looked at" signal for the dashboard.
 */
export function ChapterViewTracker({ topicIds }: { topicIds: string[] }) {
  useEffect(() => {
    for (const topicId of topicIds) {
      trackEvent({ eventType: 'lesson_view', entityType: 'topic', entityId: topicId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
