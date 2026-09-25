'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The unread-message badge: polls /api/messages/unread-count, refreshes when
 * the tab regains focus, and listens for "messages:changed" events so a page
 * that just read or sent something can update every badge at once.
 */
export function useUnreadCount(initial = 0, intervalMs = 45_000) {
  const [count, setCount] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread-count', { cache: 'no-store' });
      const data = await res.json();
      if (typeof data.count === 'number') setCount(data.count);
    } catch {
      /* offline: keep the last number */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('messages:changed', refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('messages:changed', refresh);
    };
  }, [refresh, intervalMs]);

  return count;
}

export function announceMessagesChanged() {
  window.dispatchEvent(new Event('messages:changed'));
}
