import Link from 'next/link';
import type { ReactNode } from 'react';
import { SimulationIcon } from '@/components/icons/SimulationIcon';

/**
 * The four learning resources on a lesson page (cheat sheet, videos,
 * simulation, practice), drawn as equal cards in one row. Presentation only:
 * the page decides what each card says and where it links.
 */

export type ResourceKind = 'sheet' | 'video' | 'simulation' | 'practice';

const SVG_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ResourceIcon({ kind, className }: { kind: ResourceKind; className: string }) {
  if (kind === 'simulation') return <SimulationIcon className={className} />;
  if (kind === 'video') {
    return (
      <svg {...SVG_PROPS} className={className}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === 'practice') {
    return (
      <svg {...SVG_PROPS} className={className}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...SVG_PROPS} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** Tinted icon circle and status pill per resource; all theme-aware colours. */
const ACCENT: Record<ResourceKind, { icon: string; pill: string }> = {
  sheet: { icon: 'bg-h-eef0fd text-h-5a67d8', pill: 'bg-h-eef0fd text-h-5a67d8' },
  video: { icon: 'bg-rose-50 text-rose-600', pill: 'bg-rose-50 text-rose-700' },
  simulation: { icon: 'bg-blue-50 text-blue-600', pill: 'bg-blue-50 text-blue-700' },
  practice: { icon: 'bg-green-100 text-green-700', pill: 'bg-green-100 text-green-800' },
};

const PILL = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';
const CARD = 'relative flex h-full min-w-0 flex-col rounded-2xl border p-5';
const LABEL = 'mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-h-5a67d8 focus-visible:ring-offset-2';

function IconCircle({ kind, muted = false }: { kind: ResourceKind; muted?: boolean }) {
  return (
    <span
      className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
        muted ? 'bg-gray-100 text-gray-400' : ACCENT[kind].icon
      }`}
    >
      <ResourceIcon kind={kind} className="h-5 w-5" />
    </span>
  );
}

export type ResourceStatus = { text: string; tone?: 'accent' | 'locked' };

export function ResourceCard({
  kind,
  label,
  title,
  description,
  status,
  primary = false,
  children,
}: {
  kind: ResourceKind;
  /** The small uppercase section label; rendered as the card's h2. */
  label: string;
  title: string;
  description?: string | null;
  status: ResourceStatus;
  /** Practice: green accent, stronger border. */
  primary?: boolean;
  /** The CTA(s): a ResourceCta, plus any secondary link. */
  children: ReactNode;
}) {
  const id = `resource-${kind}`;
  return (
    <article
      aria-labelledby={id}
      className={`${CARD} overflow-hidden bg-white motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1 hover:shadow-lg ${
        primary ? 'border-green-300 shadow-md' : 'border-gray-200 shadow-sm hover:border-gray-300'
      }`}
    >
      {primary && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-green-600" />}
      <div className="flex items-start justify-between gap-3">
        <IconCircle kind={kind} />
        <span className={`${PILL} ${status.tone === 'locked' ? 'bg-amber-50 text-amber-800' : ACCENT[kind].pill}`}>
          {status.tone === 'locked' && (
            <svg {...SVG_PROPS} strokeWidth={2} className="h-3 w-3">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          )}
          {status.text}
        </span>
      </div>
      <h2 id={id} className={LABEL}>
        {label}
      </h2>
      <h3 className="mt-1 break-words text-base font-semibold leading-snug text-gray-900 line-clamp-2" title={title}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 break-words text-sm leading-relaxed text-gray-600 line-clamp-3" title={description}>
          {description}
        </p>
      )}
      {/* wrap-reverse: if a secondary link doesn't fit beside the CTA it wraps
          ABOVE it, so every card's main button stays on the bottom line. */}
      <div className="mt-auto flex flex-wrap-reverse items-center gap-2 pt-5">{children}</div>
    </article>
  );
}

/**
 * The card's main action. It also stretches over the whole card (the
 * ::after layer), so a click anywhere on the card follows it; secondary
 * links sit above that layer with `relative z-10`.
 */
export function ResourceCta({
  href,
  variant = 'secondary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary' | 'locked';
  children: ReactNode;
}) {
  const look =
    variant === 'primary'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : variant === 'locked'
        ? 'bg-gray-900 text-on-ink hover:bg-black'
        : 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50';
  return (
    <Link
      href={href}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold after:absolute after:inset-0 after:rounded-2xl ${look} ${FOCUS}`}
    >
      {children}
    </Link>
  );
}

/** A secondary link inside a card, above the stretched CTA layer. */
export function ResourceSecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 ${FOCUS}`}
    >
      {children}
    </Link>
  );
}

/** Same size as an active card, with nothing to open yet. */
export function ComingSoonCard({ kind, label }: { kind: ResourceKind; label: string }) {
  const id = `resource-${kind}`;
  return (
    <article aria-labelledby={id} className={`${CARD} border-dashed border-gray-300 bg-gray-50`}>
      <div className="flex items-start justify-between gap-3">
        <IconCircle kind={kind} muted />
        {/* Visual status only: the line below says the same to screen readers. */}
        <span aria-hidden className={`${PILL} bg-gray-100 text-gray-600`}>
          Coming soon
        </span>
      </div>
      <h2 id={id} className={LABEL}>
        {label}
      </h2>
      <p className="mt-1 text-base font-medium text-gray-500">Coming soon</p>
    </article>
  );
}
