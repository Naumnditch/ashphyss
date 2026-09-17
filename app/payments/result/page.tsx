import Link from 'next/link';
import { query } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

async function getOrder(orderId?: string) {
  if (!orderId) return null;
  const result = await query(
    `SELECT o.*, a.name AS addon_name FROM shopier_orders o
     LEFT JOIN addon_services a ON a.id = o.addon_id
     WHERE o.platform_order_id = $1`,
    [orderId]
  );
  return result.rows[0] || null;
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: { status?: string; orderId?: string };
}) {
  const order = await getOrder(searchParams.orderId);
  const status = searchParams.status;
  const success = status === 'success';

  return (
    <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-[#e4ddcc] rounded-xl p-8 text-center">
        <div
          className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
            success ? 'bg-[#e6f2ee] text-[#2e7d6b]' : 'bg-[#fbeae7] text-[#b34a3c]'
          }`}
        >
          {success ? '✓' : '✕'}
        </div>
        <h1 className="text-[20px] font-bold text-[#1b2a41] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          {success ? 'Payment Successful' : status === 'invalid' ? 'Could Not Verify Payment' : 'Payment Not Completed'}
        </h1>
        <p className="text-[13.5px] text-[#4a5a72] mb-5 leading-snug">
          {success
            ? order?.is_test
              ? 'The test charge went through and the signature verified correctly — the integration is working end to end.'
              : order?.addon_name
              ? `Your booking for "${order.addon_name}" is confirmed. A teacher will email you to schedule a time.`
              : 'Your subscription is now active. You can head back to your dashboard.'
            : 'The payment was not completed, or the confirmation could not be verified. No charge should apply — check your Shopier panel to confirm.'}
        </p>
        {order && (
          <div className="bg-[#faf7f0] border border-[#eee6d3] rounded-lg p-3 text-left text-[12px] font-mono text-[#4a5a72] mb-5 space-y-1">
            <div>Order: {order.platform_order_id}</div>
            <div>Amount: {order.amount} {order.currency}</div>
            <div>Status: {order.status}</div>
            {order.shopier_payment_id && <div>Shopier ID: {order.shopier_payment_id}</div>}
          </div>
        )}
        <Link href="/" className="inline-block text-[13.5px] font-semibold text-white bg-[#1b2a41] px-5 py-2.5 rounded-lg">
          Back to AshPhys
        </Link>
      </div>
    </div>
  );
}
