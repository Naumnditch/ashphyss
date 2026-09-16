'use client';

import Link from 'next/link';
import { useState } from 'react';
import { tryToUsd } from '@/lib/currency';
import { trackEvent } from '@/lib/analytics/client';

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  tier_level: number;
  description: string | null;
  price_monthly: string;
  price_quarterly: string;
  price_yearly: string;
  features: string[] | null;
  shopier_url_monthly: string | null;
  shopier_url_quarterly: string | null;
  shopier_url_yearly: string | null;
}

type Period = 'monthly' | 'quarterly' | 'yearly';

const PERIODS: { id: Period; label: string; months: number }[] = [
  { id: 'monthly', label: '1 month', months: 1 },
  { id: 'quarterly', label: '3 months', months: 3 },
  { id: 'yearly', label: '12 months', months: 12 },
];

export function PricingCards({ plans, usdRate, signedIn }: { plans: PricingPlan[]; usdRate: number; signedIn: boolean }) {
  const [period, setPeriod] = useState<Period>('yearly');

  return (
    <div className="mb-10">
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-white border border-[#e4ddcc] rounded-full p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors ${
                period === p.id ? 'bg-[#1b2a41] text-white' : 'text-[#4a5a72] hover:bg-[#faf7f0]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <PricingCard key={p.id} plan={p} period={period} usdRate={usdRate} signedIn={signedIn} />
        ))}
      </div>
    </div>
  );
}

function PricingCard({ plan, period, usdRate, signedIn }: { plan: PricingPlan; period: Period; usdRate: number; signedIn: boolean }) {
  const isFree = plan.tier_level === 0;

  const monthly = parseFloat(plan.price_monthly);
  const quarterly = parseFloat(plan.price_quarterly);
  const yearly = parseFloat(plan.price_yearly);

  const totals: Record<Period, number> = { monthly, quarterly, yearly };
  const divisors: Record<Period, number> = { monthly: 1, quarterly: 3, yearly: 12 };
  const perMonth = Math.round(totals[period] / divisors[period]);

  const savingsPct = monthly > 0 && period !== 'monthly' ? Math.round((1 - perMonth / monthly) * 100) : 0;

  const billedNote =
    period === 'monthly'
      ? '1-month rolling plan'
      : period === 'quarterly'
      ? `billed at ${quarterly.toFixed(0)} TRY every 3 months`
      : `billed at ${yearly.toFixed(0)} TRY / year`;

  const shopierUrl =
    period === 'monthly' ? plan.shopier_url_monthly : period === 'quarterly' ? plan.shopier_url_quarterly : plan.shopier_url_yearly;

  const isPlus = plan.slug === 'plus';
  const badge = isPlus ? (period === 'yearly' ? 'Best value' : 'Most popular') : null;

  const features: string[] = Array.isArray(plan.features) ? plan.features : [];

  return (
    <div
      className={`bg-white border rounded-xl p-6 flex flex-col ${
        isPlus ? 'border-[#b8823d] shadow-sm' : 'border-[#e4ddcc]'
      }`}
    >
      <div className="flex items-center gap-2 mb-3 min-h-[22px]">
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#f6efdc] text-[#8f6428] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {savingsPct > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#e6f2ee] text-[#1b5c4d] px-2 py-0.5 rounded-full">
            Save {savingsPct}%
          </span>
        )}
      </div>

      <h2 className="text-[20px] font-bold text-[#1b2a41] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
        {plan.name}
      </h2>

      <div className="mb-3">
        {isFree ? (
          <>
            <span className="text-[30px] font-bold text-[#1b2a41]">Free</span>
            <div className="text-[12px] text-[#4a5a72] mt-0.5">free forever</div>
          </>
        ) : (
          <>
            <span className="text-[30px] font-bold text-[#1b2a41]">{perMonth}</span>
            <span className="text-[13px] text-[#4a5a72] ml-1">TRY / month</span>
            <div className="text-[12px] text-[#a8a196] mt-0.5">approx. ${tryToUsd(perMonth, usdRate)} USD</div>
            <div className="text-[12px] text-[#4a5a72] mt-1.5 pt-1.5 border-t border-[#eee6d3]">{billedNote}</div>
          </>
        )}
      </div>

      {plan.description && <p className="text-[12.5px] text-[#4a5a72] leading-snug mb-4">{plan.description}</p>}

      {features.length > 0 && (
        <ul className="space-y-1.5 mb-5 flex-1">
          {features.map((f, i) => (
            <li key={i} className="text-[12.5px] text-[#4a5a72] flex gap-2">
              <span className="text-[#2e7d6b] flex-shrink-0">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-2">
        {isFree ? (
          <Link
            href={signedIn ? '/curriculum' : '/auth/signup'}
            className="block text-center text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-[#d8cfb6] text-[#1b2a41] hover:bg-[#faf7f0]"
          >
            {signedIn ? 'Browse the curriculum' : 'Create a free account'}
          </Link>
        ) : shopierUrl ? (
          <a
            href={shopierUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent({ eventType: 'subscribe_click', metadata: { plan: plan.slug, period } })}
            className="block text-center text-[13px] font-semibold px-4 py-2.5 rounded-lg bg-[#1b2a41] text-white hover:bg-[#243a5e]"
          >
            Subscribe
          </a>
        ) : (
          <span className="block text-center text-[12.5px] px-4 py-2.5 rounded-lg bg-[#f5f0e2] text-[#8f6428]">
            Checkout link coming soon
          </span>
        )}
      </div>
    </div>
  );
}
