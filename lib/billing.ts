/**
 * Shared billing-period helpers — a subscription plan is sold in three
 * commitment lengths (1 / 3 / 12 months), tracked as `billing_cycle` on
 * `subscriptions` and `shopier_orders`. Centralized here so every place
 * that grants or reads a period (manual grants, receipt approval, the
 * Shopier OSB callback) agrees on the same mapping.
 */

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export function billingCycleForMonths(months: number): BillingCycle {
  if (months >= 12) return 'yearly';
  if (months >= 3) return 'quarterly';
  return 'monthly';
}

export function monthsForBillingCycle(cycle: string | null | undefined): number {
  if (cycle === 'yearly') return 12;
  if (cycle === 'quarterly') return 3;
  return 1;
}
