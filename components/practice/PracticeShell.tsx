'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';

export interface LessonInfo {
  title: string;
  /** "AS 6.2 · Practice" style line above the title. */
  refLabel: string;
  /** "AS Level question bank" */
  bankLabel: string;
  backHref: string;
}

/**
 * The practice page fills exactly one viewport (100dvh) above the site
 * chrome, like an app: a minimal top bar and a working area that never
 * scrolls as a page. Only the question column scrolls, and only when a
 * question is unusually long. Page scrolling (and iOS bounce) underneath is
 * locked while it is open.
 */
export function PracticeShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior] = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex h-[100dvh] flex-col overflow-hidden bg-white text-gray-900" style={{ overscrollBehavior: 'none' }}>
      {children}
    </div>
  );
}

/** Lesson title on the left; question navigation, progress and actions on the right. */
export function PracticeTopBar({ lesson, children }: { lesson: LessonInfo; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-2 sm:px-3">
      <Link
        href={lesson.backHref}
        aria-label="Back to the lesson"
        title="Back to the lesson"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-gray-400">
          {lesson.refLabel} · <span className="text-h-5a67d8">{lesson.bankLabel}</span>
        </p>
        <h1 className="truncate text-sm font-bold text-gray-900 sm:text-base">{lesson.title}</h1>
      </div>
      {children}
    </header>
  );
}
