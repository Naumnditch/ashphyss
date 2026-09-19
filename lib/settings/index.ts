import { query } from '@/lib/db/client';

export { tryToUsd } from '@/lib/currency';

/** Approximate TRY→USD rate, kept as an admin-editable setting rather than a live
 *  feed: a stale-but-labelled figure is safer than a page that breaks when an
 *  exchange API is down, and every price is shown as "approx." anyway. */
export async function getUsdRate(): Promise<number> {
  const res = await query(`SELECT value FROM site_settings WHERE key = 'usd_rate'`);
  const v = parseFloat(res.rows[0]?.value ?? '');
  return Number.isFinite(v) && v > 0 ? v : 47.18;
}

/** Per-student cap on simultaneously open video solve requests (Part 1). */
export async function getMaxOpenVideoRequests(): Promise<number> {
  const res = await query(`SELECT value FROM site_settings WHERE key = 'max_open_video_requests_per_student'`);
  const v = parseInt(res.rows[0]?.value ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : 3;
}

export interface BankSettings {
  enabled: boolean;
  accountName: string;
  iban: string;
  bankName: string;
  note: string;
}

/** Reads the site settings used by the public pricing page. */
export async function getBankSettings(): Promise<BankSettings> {
  const res = await query(`SELECT key, value FROM site_settings`);
  const map: Record<string, string> = {};
  for (const r of res.rows) map[r.key] = r.value ?? '';
  return {
    enabled: map['bank_transfer_enabled'] === 'true',
    accountName: map['bank_account_name'] ?? '',
    iban: map['bank_iban'] ?? '',
    bankName: map['bank_name'] ?? '',
    note: map['bank_note'] ?? '',
  };
}

/**
 * Short, stable reference a student quotes on their transfer so the payment
 * can be matched back to their account. Derived from the account id, so it
 * never changes and never needs storing separately.
 */
export function paymentReference(userId: string): string {
  return `ASH-${userId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}
