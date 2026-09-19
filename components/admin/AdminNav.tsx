'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/teacher-applications', label: 'Teacher Applications' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/sections', label: 'Sections' },
  { href: '/admin/curriculum', label: 'Curriculum' },
  { href: '/admin/past-papers', label: 'Past Papers' },
  { href: '/admin/booklets', label: 'Booklets' },
  { href: '/admin/courses', label: 'Engineering Courses' },
  { href: '/admin/video-requests', label: 'Video Requests' },
  { href: '/admin/tutoring-bookings', label: 'Tutoring Bookings' },
  { href: '/admin/payment-requests', label: 'Payment Receipts' },
  { href: '/admin/access', label: 'Subscriber Access' },
  { href: '/admin/settings', label: 'Payment Settings' },
  { href: '/admin/test-payment', label: 'Test Payment' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 -mb-px overflow-x-auto">
      {ADMIN_NAV.map((item) => {
        const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium px-3.5 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
