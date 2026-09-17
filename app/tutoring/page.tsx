import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PRO } from '@/lib/subscriptions/getUserTier';
import { getUsdRate, tryToUsd } from '@/lib/settings';
import { query } from '@/lib/db/client';
import { TutoringBooking } from '@/components/tutoring/TutoringBooking';

export const dynamic = 'force-dynamic';

async function getAddon() {
  const res = await query(
    `SELECT id, slug, name, description, price_try, pro_discount_price_try FROM addon_services WHERE slug = 'tutoring-1on1' AND active`
  );
  return res.rows[0] || null;
}

export default async function TutoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [addon, tier, usdRate] = await Promise.all([getAddon(), getUserTier(user.id), getUsdRate()]);
  if (!addon) {
    return <div className="container-max py-16 text-center text-gray-400">Tutoring is not available right now.</div>;
  }

  const isPro = tier >= TIER_PRO;
  const price = isPro && addon.pro_discount_price_try ? parseFloat(addon.pro_discount_price_try) : parseFloat(addon.price_try);
  const fullPrice = parseFloat(addon.price_try);

  return (
    <div className="container-max py-12 max-w-2xl">
      <p className="font-mono text-[11px] tracking-wide uppercase text-gray-400 mb-2">Open to every plan</p>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">1-on-1 Private Tutoring</h1>
      <p className="text-gray-500 mb-8">{addon.description}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          {isPro && addon.pro_discount_price_try && (
            <span className="text-lg text-gray-400 line-through">{fullPrice.toFixed(0)} TRY</span>
          )}
          <span className="text-3xl font-bold text-gray-900">{price.toFixed(0)} TRY</span>
        </div>
        <p className="text-sm text-gray-400 mb-1">approx. ${tryToUsd(price, usdRate)} USD</p>
        {isPro && addon.pro_discount_price_try ? (
          <p className="text-sm text-purple-700 font-medium mb-4">Pro member discount applied automatically</p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">Pro members pay {parseFloat(addon.pro_discount_price_try || '0').toFixed(0)} TRY for the same session.</p>
        )}
        <TutoringBooking addonSlug={addon.slug} price={price} />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-500 leading-relaxed">
        After payment, a teacher will email you to schedule a time that works for you. You can also check the status
        of your booking any time from your dashboard.
      </div>
    </div>
  );
}
