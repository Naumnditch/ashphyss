import Link from 'next/link';
import { query } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/session';
import { getBankSettings, paymentReference, getUsdRate, tryToUsd } from '@/lib/settings';
import { PricingCards, type PricingPlan } from '@/components/PricingCards';

export const dynamic = 'force-dynamic';

async function getPlans(): Promise<PricingPlan[]> {
  const res = await query(
    `SELECT id, name, slug, tier_level, description, price_monthly, price_quarterly, price_yearly, features,
            shopier_url_monthly, shopier_url_quarterly, shopier_url_yearly
     FROM subscription_plans WHERE is_active ORDER BY tier_level`
  );
  return res.rows;
}

export default async function PricingPage() {
  const [plans, user, bank, usdRate] = await Promise.all([getPlans(), getCurrentUser(), getBankSettings(), getUsdRate()]);
  const reference = user ? paymentReference(user.id) : null;

  return (
    <div className="min-h-screen bg-[#faf7f0]" style={{ backgroundImage: 'radial-gradient(#e6ddc4 0.6px, transparent 0.6px)', backgroundSize: '18px 18px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <p className="font-mono text-[11px] tracking-wide uppercase text-[#4a5a72] mb-2">Cambridge IGCSE Physics · 0625</p>
        <h1 className="text-[34px] font-bold text-[#1b2a41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          Plans
        </h1>
        <p className="text-[14.5px] text-[#4a5a72] leading-snug mb-10 max-w-2xl">
          Every lesson, every interactive simulation, and the full practice engine — built by a working IGCSE Physics
          teacher, not a content farm.
        </p>

        <PricingCards plans={plans} usdRate={usdRate} signedIn={!!user} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-[#e4ddcc] rounded-xl p-5">
            <h3 className="text-[14px] font-bold text-[#1b2a41] mb-1">🎥 Video solve requests</h3>
            <p className="text-[12.5px] text-[#4a5a72] leading-snug mb-3">
              Included free with Plus and Pro — stuck on a problem, get a personal video walkthrough.
            </p>
            <Link href="/video-requests" className="text-[12.5px] font-semibold text-[#2e7d6b] underline">
              Learn more →
            </Link>
          </div>
          <div className="bg-white border border-[#e4ddcc] rounded-xl p-5">
            <h3 className="text-[14px] font-bold text-[#1b2a41] mb-1">🧑‍🏫 1-on-1 tutoring</h3>
            <p className="text-[12.5px] text-[#4a5a72] leading-snug mb-3">
              Book a private session with a teacher — from ${tryToUsd(999, usdRate)} for Pro members.
            </p>
            <Link href="/tutoring" className="text-[12.5px] font-semibold text-[#2e7d6b] underline">
              Book a session →
            </Link>
          </div>
        </div>

        {bank.enabled && bank.iban && (
          <div className="bg-white border-2 border-[#2e7d6b] rounded-xl p-6 mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-[16px] font-bold text-[#1b2a41]" style={{ fontFamily: 'Georgia, serif' }}>
                Pay by bank transfer
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-[#e6f2ee] text-[#1b5c4d] px-2 py-0.5 rounded-full">
                No card needed
              </span>
            </div>
            <p className="text-[13px] text-[#4a5a72] leading-snug mb-4">
              Transfer the amount for the plan you want to the account below, putting your reference code in the
              description so the payment can be matched to you.
            </p>

            <div className="bg-[#faf7f0] border border-[#eee6d3] rounded-lg p-4 mb-4 space-y-2.5">
              {bank.accountName && (
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-[12px] text-[#4a5a72]">Account holder</span>
                  <span className="font-mono text-[13px] font-bold text-[#1b2a41]">{bank.accountName}</span>
                </div>
              )}
              {bank.bankName && (
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-[12px] text-[#4a5a72]">Bank</span>
                  <span className="font-mono text-[13px] text-[#1b2a41]">{bank.bankName}</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2 items-baseline border-t border-[#eee6d3] pt-2.5">
                <span className="text-[12px] text-[#4a5a72]">IBAN</span>
                <span className="font-mono text-[14px] font-bold text-[#1b2a41] tracking-wide break-all">{bank.iban}</span>
              </div>
            </div>

            <div className={`rounded-lg p-4 ${reference ? 'bg-[#e6f2ee] border border-[#2e7d6b]' : 'bg-[#f6efdc] border border-[#e6d9b8]'}`}>
              {reference ? (
                <>
                  <div className="text-[11px] font-mono uppercase tracking-wide text-[#1b5c4d] mb-1">
                    Your payment reference — put this in the transfer description
                  </div>
                  <div className="font-mono text-[24px] font-bold text-[#1b5c4d] tracking-wider">{reference}</div>
                  <p className="text-[11.5px] text-[#1b5c4d] mt-1.5 leading-snug">
                    Without this code the transfer cannot be matched to your account, and activation will be delayed.
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] text-[#8f6428] leading-snug">
                  <Link href="/auth/signup" className="underline font-semibold">Create your free account</Link> first —
                  you will then be shown a unique reference code to include with your transfer.
                </p>
              )}
            </div>

            {bank.note && <p className="text-[12px] text-[#4a5a72] leading-snug mt-3">{bank.note}</p>}

            <Link
              href="/subscribe/verify"
              className="block text-center text-[13px] font-semibold px-4 py-2.5 rounded-lg bg-[#2e7d6b] text-white hover:bg-[#256355] mt-4"
            >
              Already paid? Upload your receipt →
            </Link>
          </div>
        )}

        <div className="bg-white border border-[#e4ddcc] rounded-xl p-6">
          <h2 className="text-[15px] font-bold text-[#1b2a41] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            How subscribing works
          </h2>
          <ol className="space-y-2.5 text-[13px] text-[#4a5a72] leading-snug">
            <li>
              <strong className="text-[#1b2a41]">1.</strong>{' '}
              {user ? 'You already have an account — good.' : (
                <>
                  <Link href="/auth/signup" className="text-[#2e7d6b] underline font-semibold">Create your free account</Link> first,
                  using the email you will pay with.
                </>
              )}
            </li>
            <li>
              <strong className="text-[#1b2a41]">2.</strong> Choose a plan above and complete the payment on the secure
              checkout page.
            </li>
            <li>
              <strong className="text-[#1b2a41]">3.</strong>{' '}
              <Link href="/subscribe/verify" className="text-[#2e7d6b] underline font-semibold">Upload your receipt</Link>{' '}
              so the payment can be matched to your account. Access is activated once it has been checked — usually
              the same day.
            </li>
          </ol>
          <p className="text-[12px] text-[#a8a196] mt-4 leading-snug">
            Paid a different way, or access not showing up? Email{' '}
            <span className="font-mono text-[#4a5a72]">naumnditch572@gmail.com</span> with the payment reference and it
            will be sorted the same day.
          </p>
        </div>
      </div>
    </div>
  );
}
