'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Calls `save` a moment after `value` stops changing (and not at all while
 * `enabled` is false). Returns the save state for a "Saved" indicator.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<void>, { enabled = true, delay = 1200 } = {}) {
  const [state, setState] = useState<SaveState>('idle');
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;
  const serialized = JSON.stringify(value);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    const t = setTimeout(async () => {
      setState('saving');
      try {
        await saveRef.current(JSON.parse(serialized));
        setState('saved');
      } catch {
        setState('error');
      }
    }, delay);
    return () => clearTimeout(t);
  }, [serialized, enabled, delay]);

  return state;
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const text = state === 'saving' ? 'Saving draft…' : state === 'saved' ? 'Draft saved' : 'Draft not saved';
  return <span className={`text-xs ${state === 'error' ? 'text-red-600' : 'text-gray-400'}`} aria-live="polite">{text}</span>;
}
