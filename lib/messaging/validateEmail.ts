/**
 * Checks an address before we try to email it: the format, then that its
 * domain exists and can receive mail (an MX record, or an A/AAAA record as
 * the implicit fallback). A DNS lookup that errors or times out counts as
 * "can't tell", not "invalid", so an outage never blocks sending.
 * Set MAIL_VALIDATE_DNS=off to skip the DNS step.
 */

import { promises as dns } from 'dns';

export type EmailCheck = { ok: true } | { ok: false; reason: string };

// Practical, not RFC-complete: local@domain.tld with no spaces or doubled dots.
const EMAIL_RE = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*\.[A-Z]{2,63}$/i;

export function emailFormatOk(email: string): boolean {
  if (!email || email.length > 254) return false;
  const [local] = email.split('@');
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return EMAIL_RE.test(email);
}

const cache = new Map<string, { accepts: boolean | null; at: number }>();
const CACHE_MS = 60 * 60 * 1000;
const DNS_TIMEOUT_MS = 2500;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), DNS_TIMEOUT_MS))]);
}

const NO_RECORD = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);

/** true: can receive mail; false: domain doesn't exist or has no mail/host records; null: couldn't tell. */
export async function domainAcceptsMail(domain: string): Promise<boolean | null> {
  const key = domain.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.accepts;

  let accepts: boolean | null = null;
  try {
    const mx = await withTimeout(dns.resolveMx(key));
    // A "null MX" (RFC 7505: a single record with exchange ".") means the domain takes no mail.
    accepts = mx.some((r) => r.exchange && r.exchange !== '.');
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'ENOTFOUND') accepts = false;
    else if (NO_RECORD.has(code)) {
      // No MX: mail falls back to the domain's own address record.
      try {
        const [a, aaaa] = await Promise.allSettled([withTimeout(dns.resolve4(key)), withTimeout(dns.resolve6(key))]);
        if (a.status === 'fulfilled' && a.value.length) accepts = true;
        else if (aaaa.status === 'fulfilled' && aaaa.value.length) accepts = true;
        else {
          const codes = [a, aaaa].map((r) => (r.status === 'rejected' ? (r.reason as { code?: string }).code ?? '' : 'ENODATA'));
          accepts = codes.every((c) => NO_RECORD.has(c)) ? false : null;
        }
      } catch {
        accepts = null;
      }
    }
  }
  cache.set(key, { accepts, at: Date.now() });
  return accepts;
}

export async function checkEmail(email: string): Promise<EmailCheck> {
  const address = email.trim();
  if (!emailFormatOk(address)) return { ok: false, reason: `Invalid email address (${address || 'empty'})` };
  if (process.env.MAIL_VALIDATE_DNS === 'off') return { ok: true };
  const domain = address.split('@')[1];
  const accepts = await domainAcceptsMail(domain);
  if (accepts === false) return { ok: false, reason: `Invalid email address: ${domain} can't receive email` };
  return { ok: true };
}
