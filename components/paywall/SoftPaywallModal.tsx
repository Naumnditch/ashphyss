'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAYWALL_TRIGGER_EVENT, startPaywallCooldown } from '@/lib/paywall/client';
import { trackEvent } from '@/lib/analytics/client';

const EXCLUDED_PREFIXES = ['/admin', '/teacher'];

/**
 * Mounted once, globally (app/layout.tsx). `eligible` is computed
 * server-side there from the viewer's tier — logged-in Plus/Pro never see
 * this, but it fires for anonymous visitors and free-tier students alike.
 */
export function SoftPaywallModal({ eligible }: { eligible: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (!eligible || excluded) return;
    const handler = () => setOpen(true);
    window.addEventListener(PAYWALL_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(PAYWALL_TRIGGER_EVENT, handler);
  }, [eligible, excluded]);

  useEffect(() => {
    if (open) trackEvent({ eventType: 'paywall_shown', path: pathname || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !eligible || excluded) return null;

  const dismiss = () => {
    startPaywallCooldown();
    setOpen(false);
  };

  const seePlans = () => {
    startPaywallCooldown();
    trackEvent({ eventType: 'subscribe_click', metadata: { source: 'soft_paywall' } });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40" onClick={dismiss}>
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full p-7 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Unlock the full curriculum</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          You've run into a few Plus-only lessons. Plus and Pro unlock every chapter, unlimited practice, and more.
        </p>
        <Link
          href="/pricing"
          onClick={seePlans}
          className="block text-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white mb-2"
        >
          See plans
        </Link>
        <button onClick={dismiss} className="text-xs text-gray-400 hover:text-gray-600">
          Not now
        </button>
      </div>
    </div>
  );
}
