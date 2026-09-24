'use client';

import { useCallback, useRef, useState } from 'react';
import type { RevealDeckHandle, RevealDeckState } from './RevealDeck';

const INITIAL_STATE: RevealDeckState = { slideIndex: 0, fragmentIndex: -1, canNext: false, canPrev: false };

/** Convenience hook pairing a RevealDeck ref with its reactive nav state. */
export function useRevealDeck() {
  const ref = useRef<RevealDeckHandle>(null);
  const [state, setState] = useState<RevealDeckState>(INITIAL_STATE);

  const next = useCallback(() => ref.current?.next(), []);
  const prev = useCallback(() => ref.current?.prev(), []);
  const goToSlide = useCallback((slideIndex: number) => ref.current?.goToSlide(slideIndex), []);
  const syncFragments = useCallback((slideIndex: number) => ref.current?.syncFragments(slideIndex), []);
  const goTo = useCallback((slideIndex: number, fragmentIndex: number) => ref.current?.goTo(slideIndex, fragmentIndex), []);

  return { ref, state, onStateChange: setState, next, prev, goToSlide, goTo, syncFragments };
}
