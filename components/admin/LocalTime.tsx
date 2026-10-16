'use client';

import { useEffect, useState } from 'react';

const FORMATS = {
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * A timestamp in the viewer's own timezone. Server components render in UTC
 * on Vercel, so the server pass prints UTC and the browser swaps in local time.
 */
export function LocalTime({
  value,
  format = 'datetime',
  className,
}: {
  value: string | Date | null | undefined;
  format?: keyof typeof FORMATS;
  className?: string;
}) {
  const iso = value ? new Date(value).toISOString() : null;
  const [text, setText] = useState(() => (iso ? fallback(iso, format) : '—'));

  useEffect(() => {
    if (iso) setText(new Date(iso).toLocaleString(undefined, FORMATS[format]));
  }, [iso, format]);

  if (!iso) return <span className={className}>—</span>;
  return (
    <time dateTime={iso} className={className} title={iso}>
      {text}
    </time>
  );
}

function fallback(iso: string, format: keyof typeof FORMATS): string {
  if (format === 'date') return iso.slice(0, 10);
  if (format === 'time') return `${iso.slice(11, 16)} UTC`;
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
