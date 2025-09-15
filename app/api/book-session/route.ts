import { NextRequest, NextResponse } from 'next/server';
import { sendBookingEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, notes, datetime, weeklySchedule } = await req.json();

    // Validate required fields
    if (!name || !email || !phone || !datetime || !weeklySchedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email to contact@ashphys.com
    try {
      await sendBookingEmail({
        name,
        email,
        phone,
        notes,
        datetime,
        weeklySchedule,
      });

      console.log('Booking email sent successfully to abdo.ashmawy573@gmail.com');

      return NextResponse.json({ 
        success: true, 
        message: 'Booking request sent successfully' 
      });

    } catch (emailError) {
      console.error('Failed to send booking email:', emailError);
      
      // Still return success to user, but log the email failure
      // You might want to implement a fallback notification system
      return NextResponse.json({ 
        success: true, 
        message: 'Booking request received. We will contact you soon.' 
      });
    }

  } catch (error) {
    console.error('Error processing booking request:', error);
    return NextResponse.json({ 
      error: 'Failed to process booking request' 
    }, { status: 500 });
  }
}
