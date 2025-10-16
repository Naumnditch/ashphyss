import { NextRequest, NextResponse } from 'next/server';
import { sendBookingEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, notes, datetime, weeklySchedule } = await req.json();

    // Validate required fields
    if (!name || !email || !phone || !datetime || !weeklySchedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Parse datetime to extract date and time
    const startDate = new Date(datetime);
    const timeSlot = startDate.toTimeString().slice(0, 5); // HH:MM format
    const dateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Create application in Supabase
    try {
      const applicationData = {
        student_name: name,
        student_email: email,
        student_phone: phone,
        notes: notes || null,
        start_date: dateString,
        time_slot: timeSlot,
        sessions_per_week: 3, // Default to 3 sessions per week
        total_sessions: 12, // Default to 12 total sessions
        status: 'pending',
        payment_status: 'pending'
      };

      const { data: application, error: dbError } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (dbError) {
        console.error('Error saving to database:', dbError);
        // Continue with email even if DB save fails
      } else {
        console.log('Application saved to database:', application.id);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with email even if DB save fails
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
