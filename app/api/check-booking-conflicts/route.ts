import { NextRequest, NextResponse } from 'next/server';
import { checkBookingConflicts, getOccupiedTimeSlotsForDate } from '@/lib/booking-conflicts';

// Mock existing bookings - In production, this would come from your database
const mockExistingBookings: Array<{
  startDate: Date;
  timeSlot: string;
  studentName: string;
}> = [
  // Example: Alex booked Aug 31, 2024 at 6 PM
  // {
  //   startDate: new Date('2024-08-31T18:00:00'),
  //   timeSlot: '18:00',
  //   studentName: 'Alex'
  // }
];

export async function POST(req: NextRequest) {
  try {
    const { action, startDate, timeSlot, targetDate, sessionsPerWeek } = await req.json();

    if (action === 'checkConflicts') {
      // Check if a proposed booking conflicts with existing ones
      if (!startDate || !timeSlot) {
        return NextResponse.json({ error: 'Missing startDate or timeSlot' }, { status: 400 });
      }

      const proposedDate = new Date(startDate);
      const proposedFrequency = sessionsPerWeek === 2 ? 2 : 3;
      const conflicts = checkBookingConflicts(proposedDate, timeSlot, proposedFrequency, mockExistingBookings);

      return NextResponse.json({
        hasConflicts: conflicts.length > 0,
        conflicts,
        message: conflicts.length > 0 
          ? `This time slot conflicts with ${conflicts.length} existing session(s)`
          : 'No conflicts found'
      });
    }

    if (action === 'getOccupiedSlots') {
      // Get all occupied time slots for a specific date
      if (!targetDate) {
        return NextResponse.json({ error: 'Missing targetDate' }, { status: 400 });
      }

      const date = new Date(targetDate);
      const occupiedSlots = getOccupiedTimeSlotsForDate(date, mockExistingBookings);

      return NextResponse.json({
        occupiedSlots,
        message: `Found ${occupiedSlots.length} occupied time slot(s) for this date`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error checking booking conflicts:', error);
    return NextResponse.json({ 
      error: 'Failed to check booking conflicts' 
    }, { status: 500 });
  }
}

// Future: Database integration example
/*
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getExistingBookingsFromDB() {
  const bookings = await prisma.booking.findMany({
    select: {
      startDate: true,
      timeSlot: true,
      studentName: true,
    }
  });
  
  return bookings;
}
*/
