'use client';

/** Envelope in the site header with the live unread count. */

import Link from 'next/link';
import { MailIcon } from './MailIcons';
import { useUnreadCount } from './useUnreadCount';

export function MessagesNavLink({ href, initialCount = 0 }: { href: string; initialCount?: number }) {
  const count = useUnreadCount(initialCount);
  return (
    <Link
      href={href}
      aria-label={count ? `Messages, ${count} unread` : 'Messages'}
      title="Messages"
      className="relative inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      <MailIcon name="mail" className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-[18px] text-white ring-2 ring-white tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
