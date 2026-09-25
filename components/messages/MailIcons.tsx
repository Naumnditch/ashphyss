/** Line icons for the mailbox (24×24, stroked in currentColor). */

const PATHS = {
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7Zm0 7h7a3.5 3.5 0 0 1 0 7H7Z" />,
  italic: (
    <>
      <path d="M10 5h8" />
      <path d="M6 19h8" />
      <path d="m14 5-4 14" />
    </>
  ),
  underline: (
    <>
      <path d="M7 4v7a5 5 0 0 0 10 0V4" />
      <path d="M5 20h14" />
    </>
  ),
  bullets: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  numbers: (
    <>
      <path d="M10 6h10" />
      <path d="M10 12h10" />
      <path d="M10 18h10" />
      <path d="M4 5h1.5v4" />
      <path d="M3.5 14.5a1.5 1.5 0 0 1 3 .5c0 1-3 2-3 3.5h3" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </>
  ),
  quote: (
    <>
      <path d="M5 11h4v6H5v-4c0-3 1-5 4-6" />
      <path d="M14 11h4v6h-4v-4c0-3 1-5 4-6" />
    </>
  ),
  clear: (
    <>
      <path d="M6 5h12" />
      <path d="m12 5-3 14" />
      <path d="m15 15 5 5" />
      <path d="m20 15-5 5" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4Z" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Z" />
      <path d="M17 8a5 5 0 0 1 0 8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  template: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checks: (
    <>
      <path d="m2 12.5 4.5 4.5L16 7.5" />
      <path d="m11 16 1 1 9.5-9.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2h.01" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6Z" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
};

export type MailIconName = keyof typeof PATHS;

export function MailIcon({ name, className = 'w-4 h-4' }: { name: MailIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  );
}
