/**
 * POST /api/payments/shopier/addon-checkout
 *
 * Student-facing checkout for a one-time addon purchase (Part 2 — currently
 * just 1-on-1 tutoring). Extends the same shopier_orders row and
 * buildShopierFormFields helper the admin test-portal checkout uses
 * (app/api/payments/shopier/checkout/route.ts), with addon_id set and
 * plan_id left null instead of the other way around.
 *
 * NOTE: AshPhys's own-site Shopier checkout (api_pay4.php) has a known,
 * previously-reported 509 error at Shopier's end (see PROJECT_STATUS.md).
 * Real subscription purchases currently go through Shopier's native
 * storefront links instead. This endpoint is built the same way the
 * subscription test-portal checkout is, so it carries the same caveat —
 * it is not a new/separate risk.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PRO } from '@/lib/subscriptions/getUserTier';
import { query } from '@/lib/db/client';
import {
  buildShopierFormFields,
  generatePlatformOrderId,
  generateRandomNr,
  SHOPIER_PAYMENT_URL,
} from '@/lib/shopier/client';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 });
  }

  const apiKey = process.env.SHOPIER_API_KEY;
  const apiSecret = process.env.SHOPIER_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ success: false, error: 'Shopier is not configured' }, { status: 500 });
  }

  const { addonSlug } = (await req.json()) as { addonSlug?: string };
  if (!addonSlug) {
    return NextResponse.json({ success: false, error: 'addonSlug is required' }, { status: 400 });
  }

  const addonRes = await query(
    `SELECT id, name, price_try, pro_discount_price_try FROM addon_services WHERE slug = $1 AND active`,
    [addonSlug]
  );
  if (addonRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Unknown addon' }, { status: 404 });
  }
  const addon = addonRes.rows[0];

  const tier = await getUserTier(user.id);
  const price = tier >= TIER_PRO && addon.pro_discount_price_try ? addon.pro_discount_price_try : addon.price_try;
  const amount = parseFloat(price).toFixed(2);

  const platformOrderId = generatePlatformOrderId();
  const randomNr = generateRandomNr();

  await query(
    `INSERT INTO shopier_orders (platform_order_id, student_id, addon_id, is_test, amount, currency, random_nr, status)
     VALUES ($1, $2, $3, false, $4, 'TRY', $5, 'pending')`,
    [platformOrderId, user.id, addon.id, amount, randomNr]
  );

  const fields = buildShopierFormFields(
    { platformOrderId, productName: addon.name, totalOrderValue: amount, currency: 'TRY', randomNr },
    { id: user.id, name: user.firstName || 'AshPhys', surname: user.lastName || 'Student', email: user.email, phone: '5555555555' },
    apiKey,
    apiSecret
  );

  return NextResponse.json({ success: true, paymentUrl: SHOPIER_PAYMENT_URL, fields });
}
