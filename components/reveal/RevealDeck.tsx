'use client';

/**
 * Reusable reveal.js wrapper — for this AND future step-by-step sims, not
 * equation-rearranger-specific. reveal.js is used purely as a NAVIGATION
 * state machine (which slide, which fragment, keyboard/back/next
 * plumbing); it draws none of the visible content itself. Every section
 * this deck renders is expected to hold its OWN visible content (built by
 * whatever engine the caller supplies, e.g. lib/equation-stage's FLIP
 * renderer) plus a set of zero-size `.fragment` placeholder elements that
 * exist only so reveal.js has something to count/index — see
 * reveal-deck-scope.css, which strips reveal.js's own fragment
 * opacity/transform animation for exactly that reason.
 *
 * Import this component via `next/dynamic` with `ssr: false` at the call
 * site — reveal.js touches `document` and must never evaluate server-side.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import 'reveal.js/reveal.css';
import './reveal-deck-scope.css';

// reveal.js ships no default-export-friendly types for a scoped instance
// in a shape TS can infer cleanly from a dynamic import, so the instance
// is held loosely typed here; every method used below is confirmed to
// exist on RevealApi in node_modules/reveal.js/dist/reveal.d.ts.
type RevealInstance = {
  initialize: (opts?: Record<string, unknown>) => Promise<unknown>;
  destroy: () => void;
  on: (type: string, listener: () => void) => void;
  off: (type: string, listener: () => void) => void;
  getIndices: () => { h: number; v: number; f: number };
  availableFragments: () => { prev: boolean; next: boolean };
  nextFragment: () => boolean;
  prevFragment: () => boolean;
  slide: (h?: number, v?: number, f?: number) => void;
  syncFragments: (slide: HTMLElement) => HTMLElement[];
};

export interface RevealDeckState {
  slideIndex: number;
  /** -1 = the current section is showing with no fragment revealed yet. */
  fragmentIndex: number;
  canNext: boolean;
  canPrev: boolean;
}

export interface RevealDeckHandle {
  /** Fragment-only advance. Never falls through to the next slide — a no-op past the last fragment. */
  next: () => void;
  /** Fragment-only retreat. A no-op before the first fragment. */
  prev: () => void;
  /** Jumps to a section with no fragment revealed, e.g. after picking a different item from a list. */
  goToSlide: (slideIndex: number) => void;
  /**
   * Re-scans one section's `.fragment` children after the caller has
   * mutated them (a new derivation for that section has a different
   * number of steps). Call after the DOM update has committed.
   */
  syncFragments: (slideIndex: number) => void;
}

interface RevealDeckProps {
  /** `<section>` elements — one per slide, each with its own `.fragment` placeholders and content container. */
  children: React.ReactNode;
  onStateChange?: (state: RevealDeckState) => void;
  className?: string;
}

function normalizeFragmentIndex(f: number | undefined | null): number {
  return typeof f === 'number' && Number.isFinite(f) && f >= 0 ? f : -1;
}

export const RevealDeck = forwardRef<RevealDeckHandle, RevealDeckProps>(function RevealDeck(
  { children, onStateChange, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<RevealInstance | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const sync = useCallback(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const idx = deck.getIndices();
    const avail = deck.availableFragments();
    onStateChangeRef.current?.({
      slideIndex: idx.h ?? 0,
      fragmentIndex: normalizeFragmentIndex(idx.f),
      canNext: avail.next,
      canPrev: avail.prev,
    });
  }, []);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const RevealModule = await import('reveal.js');
      const RevealCtor = RevealModule.default as unknown as new (el: HTMLElement, opts?: Record<string, unknown>) => RevealInstance;
      if (destroyed || !containerRef.current) return;

      const deck = new RevealCtor(containerRef.current, {
        embedded: true,
        hash: false,
        history: false,
        keyboardCondition: 'focused',
        controls: false,
        progress: false,
        slideNumber: false,
        help: false,
        center: false,
        touch: false,
        // We drive the visible content ourselves (lib/equation-stage's
        // FLIP renderer); reveal.js's own slide-change transition would
        // otherwise fight that when jumping between sections.
        transition: 'none',
        // Disables reveal.js's scale/center presentation layout (a fixed
        // 960x700 box transformed to fit the viewport) so the deck lays
        // out like a normal block element sized by its own content —
        // required for embedding in a page that isn't a full presentation.
        disableLayout: true,
      });
      await deck.initialize();
      if (destroyed) {
        deck.destroy();
        return;
      }
      deckRef.current = deck;
      deck.on('fragmentshown', sync);
      deck.on('fragmenthidden', sync);
      deck.on('slidechanged', sync);
      sync();
    })();

    return () => {
      destroyed = true;
      const deck = deckRef.current;
      if (deck) {
        deck.off('fragmentshown', sync);
        deck.off('fragmenthidden', sync);
        deck.off('slidechanged', sync);
        deck.destroy();
      }
      deckRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      next: () => {
        deckRef.current?.nextFragment();
        sync();
      },
      prev: () => {
        deckRef.current?.prevFragment();
        sync();
      },
      goToSlide: (slideIndex: number) => {
        deckRef.current?.slide(slideIndex);
        sync();
      },
      syncFragments: (slideIndex: number) => {
        const deck = deckRef.current;
        if (!deck || !containerRef.current) return;
        const section = containerRef.current.querySelectorAll('.slides > section')[slideIndex] as HTMLElement | undefined;
        if (section) deck.syncFragments(section);
        sync();
      },
    }),
    [sync]
  );

  // Own arrow-key handling, scoped to this container only (never a
  // window/document listener), so focusing the deck lets arrow keys step
  // through fragments without ever capturing arrow keys used anywhere
  // else on the page. Calls the same fragment-only methods as the
  // Back/Next buttons, so — like them — this can never fall through past
  // the last fragment into the next slide.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        deckRef.current?.nextFragment();
        sync();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        deckRef.current?.prevFragment();
        sync();
      }
    },
    [sync]
  );

  return (
    <div
      ref={containerRef}
      className={`reveal ash-reveal-deck${className ? ` ${className}` : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="slides">{children}</div>
    </div>
  );
});
