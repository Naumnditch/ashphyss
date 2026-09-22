'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminIcon, type AdminIconName } from '@/components/admin/AdminIcons';
import { LogoutButton } from '@/components/LogoutButton';
import type { PendingCounts } from '@/lib/admin/overview';

interface NavItem {
  href: string;
  label: string;
  icon: AdminIconName;
  pending?: keyof PendingCounts;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Dashboard',
    items: [
      { href: '/admin', label: 'Overview', icon: 'overview' },
      { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/admin/users', label: 'Users', icon: 'users' },
      { href: '/admin/teacher-applications', label: 'Teacher applications', icon: 'applications', pending: 'teacherApplications' },
      { href: '/admin/sections', label: 'Sections', icon: 'sections' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/curriculum', label: 'Curriculum', icon: 'curriculum' },
      { href: '/admin/past-papers', label: 'Past papers', icon: 'papers' },
      { href: '/admin/booklets', label: 'Booklets', icon: 'booklets' },
      { href: '/admin/courses', label: 'Engineering courses', icon: 'courses' },
    ],
  },
  {
    title: 'Requests',
    items: [
      { href: '/admin/video-requests', label: 'Video requests', icon: 'video', pending: 'videoRequests' },
      { href: '/admin/tutoring-bookings', label: 'Tutoring bookings', icon: 'tutoring', pending: 'tutoringToSchedule' },
      { href: '/admin/payment-requests', label: 'Payment receipts', icon: 'receipts', pending: 'paymentReceipts' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { href: '/admin/access', label: 'Subscriber access', icon: 'access' },
      { href: '/admin/settings', label: 'Payment settings', icon: 'settings' },
      { href: '/admin/test-payment', label: 'Test payment', icon: 'test' },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ name, pending }: { name: string; pending: PendingCounts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV_GROUPS.flatMap((g) => g.items).find((item) => isActive(pathname, item.href));

  // Close the phone drawer after navigating.
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = item.pending ? pending[item.pending] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <AdminIcon name={item.icon} className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                    <span className="flex-1 leading-snug">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={`min-w-[22px] text-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                          active ? 'bg-white text-gray-900' : 'bg-amber-100 text-amber-800'
                        }`}
                        aria-label={`${count} waiting`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-gray-200 pt-4 mt-6 space-y-1">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Signed in as</p>
      <p className="px-3 pb-1 text-sm font-medium text-gray-900 truncate">{name}</p>
      <Link
        href="/account/devices"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <AdminIcon name="devices" className="w-[18px] h-[18px] text-gray-400" />
        My devices
      </Link>
      <LogoutButton className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors" />
    </div>
  );

  return (
    <>
      {/* Phones and tablets: a bar with the current page and a menu button. */}
      <div className="lg:hidden flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 mb-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Admin portal</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{current?.label ?? 'Admin'}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <AdminIcon name={open ? 'close' : 'menu'} />
          Menu
        </button>
      </div>
      {open && (
        <div id="admin-drawer" className="lg:hidden rounded-xl border border-gray-200 bg-white p-3 mb-6">
          {nav}
          {account}
        </div>
      )}

      {/* Desktop: a sticky column on the left. */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
          <p className="px-3 pt-1 pb-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-900">Admin portal</p>
          {nav}
          {account}
        </div>
      </aside>
    </>
  );
}
