/** Small pieces shared by /admin/students and /admin/students/[id]. */

import { tierName } from '@/lib/subscriptions/getUserTier';
import type { StudentListRow } from '@/lib/admin/students';
import { LocalTime } from '@/components/admin/LocalTime';

export function displayName(s: { first_name: string | null; last_name: string | null; email: string }) {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
}

export function TierBadge({ level }: { level: number }) {
  const name = tierName(level);
  const tone =
    name === 'Pro'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : name === 'Plus'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-gray-50 text-gray-500 border-gray-200';
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tone}`}>{name}</span>;
}

/** "Active until 3 Nov", "Expired 2 Oct", "Revoked", or "—" for students who never had a plan. */
export function SubscriptionStatus({
  row,
}: {
  row: Pick<StudentListRow, 'sub_status' | 'sub_end' | 'tier_level' | 'plan_name' | 'plan_tier'>;
}) {
  if (!row.sub_status || !row.plan_name) return <span className="text-gray-400">—</span>;
  if (!row.plan_tier) return <span className="text-gray-500">Free plan</span>;
  if (row.tier_level > 0) {
    return (
      <span className="text-green-700">
        Active{row.sub_end ? <> until <LocalTime value={row.sub_end} format="date" /></> : ''}
      </span>
    );
  }
  const ended = row.sub_end && new Date(row.sub_end) < new Date();
  if (row.sub_status === 'active' && ended) {
    return (
      <span className="text-red-600">
        Expired <LocalTime value={row.sub_end} format="date" />
      </span>
    );
  }
  // revokeSubscription sets status 'expired' and leaves end_date alone.
  if (row.sub_status === 'expired' && !ended) return <span className="text-red-600">Revoked</span>;
  return (
    <span className="text-red-600 capitalize">
      {row.sub_status}
      {row.sub_end && (
        <>
          {' '}
          <LocalTime value={row.sub_end} format="date" />
        </>
      )}
    </span>
  );
}
