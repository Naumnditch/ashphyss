import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const PRODUCTS = {
  r1: { name: 'Kinematics Problem Set', priceCents: 999 },
  r2: { name: 'Electricity & Magnetism Notes', priceCents: 1299 },
  r3: { name: 'Exam Prep Checklist', priceCents: 499 },
} as const;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const id = String(form.get('resourceId') || '');
  const prod = (PRODUCTS as any)[id];
  if (!prod) return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: prod.name },
          unit_amount: prod.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?resource=${id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/resources`,
  });

  return NextResponse.redirect(checkout.url ?? '/resources', { status: 303 });
}


