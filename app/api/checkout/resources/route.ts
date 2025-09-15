import { NextRequest, NextResponse } from 'next/server';

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

  // For now, redirect to success page without payment processing
  // You can implement your own payment logic here later
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/success?resource=${id}`, { status: 303 });
}


