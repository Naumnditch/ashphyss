import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const iso = String(form.get('datetime') || '');
  const datetime = new Date(iso);
  if (Number.isNaN(datetime.getTime())) {
    return NextResponse.json({ error: 'Invalid datetime' }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Private Tutoring Session' },
          unit_amount: 6000,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?booking=confirmed`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book`,
  });

  return NextResponse.redirect(checkout.url ?? '/book', { status: 303 });
}


