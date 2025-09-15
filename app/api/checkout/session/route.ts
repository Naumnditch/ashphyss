import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const iso = String(form.get('datetime') || '');
  const datetime = new Date(iso);
  if (Number.isNaN(datetime.getTime())) {
    return NextResponse.json({ error: 'Invalid datetime' }, { status: 400 });
  }

  // For now, redirect to success page without payment processing
  // You can implement your own payment logic here later
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/success?booking=confirmed`, { status: 303 });
}


