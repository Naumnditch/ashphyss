import Link from 'next/link';
import { tierName } from '@/lib/subscriptions/getUserTier';
import { LockedContentTracker } from './LockedContentTracker';

/**
 * Server-rendered lock screen shown INSTEAD of a simulator when the
 * viewer's tier is too low — the actual gate (app/simulations/*\/page.tsx
 * conditionally renders this or the real simulator), not a UI overlay on
 * top of content that was already sent to the browser.
 */
export function LockedContent({ requiredTier, title }: { requiredTier: number; title: string }) {
  return (
    <div className="bg-white border border-[#e4ddcc] rounded-xl p-10 text-center max-w-lg mx-auto">
      <LockedContentTracker />
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-xl font-bold text-[#1b2a41] mb-2">{title}</h2>
      <p className="text-[#4a5a72] text-sm mb-6">
        This simulation is part of the <strong>{tierName(requiredTier)}</strong> plan. Upgrade to unlock it along
        with the rest of the curriculum.
      </p>
      <Link href="/pricing" className="btn btn-primary">See plans</Link>
    </div>
  );
}
