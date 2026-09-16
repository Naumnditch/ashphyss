/**
 * POST /api/payments/shopier/callback
 *
 * This is Shopier's OSB (Otomatik Siparis Bildirimi) endpoint — the
 * "Bildirim URL" configured under Ek Ozellikler -> Siparis Bildirimi.
 * The contract below is taken VERBATIM from Shopier's own "OSB ornek
 * kodunu goruntule" example (first-party, from inside their panel) —
 * not reverse-engineered, and quite different from the classic-gateway
 * callback shape documented in older third-party integration guides:
 *
 *  - incoming POST fields are just `res` (base64-encoded JSON) and
 *    `hash` (hex HMAC-SHA256 of `res + OSB Kullanici Adi`, keyed with
 *    OSB Sifresi — hex, not base64, no other fields folded in)
 *  - this fires only on a SUCCESSFUL payment — there's no separate
 *    status field to branch on
 *  - the only response Shopier accepts as acknowledgement is the
 *    literal text "success" (plain text body, not JSON/HTML)
 *  - this is a pure server-to-server notification, not a page a
 *    shopper's browser ever lands on
 *
 * Security: PUBLIC endpoint (Shopier calls it directly, no session).
 * The hex-HMAC hash is the only thing that makes a call trustworthy —
 * verify it before touching anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { verifyOsbHash, decodeOsbPayload } from '@/lib/shopier/client';
import { monthsForBillingCycle } from '@/lib/billing';

// Some notification systems ping with GET to check reachability first.
export async function GET() {
  return new NextResponse('OK', { status: 200 });
}

export async function POST(req: NextRequest) {
  const osbUsername = process.env.SHOPIER_API_KEY; // = "OSB Kullanici Adi"
  const osbSecret = process.env.SHOPIER_API_SECRET; // = "OSB Sifresi"
  if (!osbUsername || !osbSecret) {
    return new NextResponse('not configured', { status: 200 });
  }

  const form = await req.formData();
  const res = String(form.get('res') || '');
  const hash = String(form.get('hash') || '');

  if (!res || !hash) {
    return new NextResponse('missing parameter', { status: 200 });
  }

  if (!verifyOsbHash(res, osbUsername, hash, osbSecret)) {
    // Mirrors Shopier's own example: on a bad hash, say nothing useful
    // back — just don't echo "success", so a forged call is never
    // mistaken for a real one.
    await query(
      `INSERT INTO shopier_orders (platform_order_id, is_test, amount, currency, random_nr, status, raw_callback)
       VALUES ($1, true, 0, 'TRY', '', 'failed', $2)
       ON CONFLICT (platform_order_id) DO NOTHING`,
      [`osb-invalid-${Date.now()}`, JSON.stringify({ res, hash, signatureValid: false })]
    );
    return new NextResponse('', { status: 200 });
  }

  let payload;
  try {
    payload = decodeOsbPayload(res);
  } catch {
    return new NextResponse('bad payload', { status: 200 });
  }

  const orderId = String(payload.orderid);
  const amount = parseFloat(payload.price) || 0;
  const isTest = payload.istest === '1';

  // Best-effort correlation: if this order was created through our own
  // checkout (/api/payments/shopier/checkout), platform_order_id matches
  // Shopier's orderid and we can update it directly. Orders placed
  // through Shopier's own native storefront (like a manual test
  // purchase) won't have a row here — that's fine, still acknowledge.
  const existing = await query(`SELECT * FROM shopier_orders WHERE platform_order_id = $1`, [orderId]);

  if (existing.rows.length > 0) {
    const order = existing.rows[0];
    await query(
      `UPDATE shopier_orders SET status = 'success', raw_callback = $2, updated_at = now()
       WHERE platform_order_id = $1`,
      [orderId, JSON.stringify({ ...payload, signatureValid: true })]
    );

    await query(
      `INSERT INTO payment_logs (subscription_id, amount, currency, payment_method, status, iyzico_payment_id)
       VALUES (NULL, $1, 'TRY', 'shopier', 'success', $2)`,
      [order.amount, orderId]
    );

    if (!order.is_test && !isTest && order.student_id && order.plan_id) {
      const months = monthsForBillingCycle(order.billing_cycle);
      await query(
        `INSERT INTO subscriptions (student_id, plan_id, tier, status, billing_cycle, start_date, end_date)
         VALUES ($1, $2, 'premium', 'active', $3, now(), now() + ($4 || ' months')::interval)
         ON CONFLICT (student_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           tier = 'premium',
           status = 'active',
           billing_cycle = EXCLUDED.billing_cycle,
           end_date = GREATEST(subscriptions.end_date, now()) + ($4 || ' months')::interval,
           updated_at = now()`,
        [order.student_id, order.plan_id, order.billing_cycle || 'monthly', months]
      );
    }
  } else {
    // No matching row — log it anyway (e.g. a native-storefront sale)
    await query(
      `INSERT INTO shopier_orders (platform_order_id, is_test, amount, currency, random_nr, status, raw_callback)
       VALUES ($1, $2, $3, 'TRY', '', 'success', $4)
       ON CONFLICT (platform_order_id) DO UPDATE SET status = 'success', raw_callback = $4, updated_at = now()`,
      [orderId, isTest, amount, JSON.stringify({ ...payload, signatureValid: true, source: 'unmatched' })]
    );
  }

  // The ONLY acknowledgement Shopier's OSB accepts — must be exactly this.
  return new NextResponse('success', { status: 200 });
}
