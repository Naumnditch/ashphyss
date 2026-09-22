'use client';

import Link from 'next/link';

/**
 * The on-screen controls for a worksheet. Everything in here is hidden when
 * the page is printed, so the paper starts with the worksheet header.
 */
export function WorksheetToolbar({
  backHref,
  answerKeyHref,
  showingAnswers,
}: {
  backHref: string;
  answerKeyHref: string | null;
  showingAnswers: boolean;
}) {
  return (
    <div className="print:hidden border-b border-gray-200 bg-gray-50 mb-8 -mx-4 px-4 py-3 sm:rounded-lg sm:mx-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-900">
          &larr; Back to practice
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {answerKeyHref && (
            <Link
              href={answerKeyHref}
              className="text-sm font-semibold border border-gray-300 hover:bg-white text-gray-700 px-4 py-2 rounded-lg"
            >
              {showingAnswers ? 'Hide answer key' : 'Include answer key'}
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="text-sm font-semibold bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Your browser&rsquo;s print dialog can save this straight to PDF — choose
        &ldquo;Save as PDF&rdquo; as the destination.
      </p>
    </div>
  );
}
