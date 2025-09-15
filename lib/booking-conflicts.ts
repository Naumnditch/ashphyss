import { addDays } from 'date-fns';

export interface BookingConflict {
  date: Date;
  timeSlot: string;
  studentName: string;
}

// Generate session dates for a monthly course starting from a given date using consistent weekly patterns
export function generateMonthlySessionDates(startDate: Date, sessionsPerWeek: 2 | 3 = 3): Date[] {
  const sessions: Date[] = [];
  const totalSessions = sessionsPerWeek === 2 ? 8 : 12;
  
  // Create the weekly pattern starting from the selected date
  const weeklyPattern: number[] = []; // Array of day-of-week numbers
  let currentDate = new Date(startDate);
  
  // Build the weekly pattern by finding the next available days with day off between sessions
  for (let i = 0; i < sessionsPerWeek; i++) {
    // Skip Sunday (day 0)
    while (currentDate.getDay() === 0) {
      currentDate = addDays(currentDate, 1);
    }
    
    weeklyPattern.push(currentDate.getDay());
    
    // Move to next available day for the pattern (skip one day for day off)
    if (i < sessionsPerWeek - 1) {
      currentDate = addDays(currentDate, 2); // Skip one day (day off)
      // Skip Sunday if we land on it
      while (currentDate.getDay() === 0) {
        currentDate = addDays(currentDate, 1);
      }
    }
  }
  
  // Sort the pattern to ensure consistent weekly order
  weeklyPattern.sort();
  
  // Generate sessions using the consistent weekly pattern
  let sessionCount = 0;
  let weekStartDate = new Date(startDate);
  // Move to the beginning of the week (Monday)
  while (weekStartDate.getDay() !== 1) {
    weekStartDate = addDays(weekStartDate, weekStartDate.getDay() === 0 ? 1 : -1);
  }
  
  // Find the first occurrence of our pattern in the start week
  const startDayOfWeek = startDate.getDay();
  const patternIndex = weeklyPattern.indexOf(startDayOfWeek);
  
  // Start from the selected date's position in the pattern
  let currentPatternIndex = patternIndex >= 0 ? patternIndex : 0;
  let currentWeekStart = new Date(weekStartDate);
  
  // If we need to start from the actual selected date, adjust the week
  if (patternIndex >= 0) {
    // Start from the week containing the selected date
    while (addDays(currentWeekStart, weeklyPattern[currentPatternIndex] - 1).getTime() < startDate.getTime()) {
      currentWeekStart = addDays(currentWeekStart, 7);
    }
  }
  
  while (sessionCount < totalSessions) {
    // Get the day of week for this session from the pattern
    const dayOfWeek = weeklyPattern[currentPatternIndex];
    
    // Calculate the actual date (Monday = 1, so we subtract 1)
    const sessionDate = addDays(currentWeekStart, dayOfWeek - 1);
    
    sessions.push(new Date(sessionDate));
    
    sessionCount++;
    currentPatternIndex = (currentPatternIndex + 1) % weeklyPattern.length;
    
    // If we've completed a full pattern cycle, move to the next week
    if (currentPatternIndex === 0) {
      currentWeekStart = addDays(currentWeekStart, 7);
    }
  }
  
  return sessions;
}

// Check if a proposed booking conflicts with existing bookings
export function checkBookingConflicts(
  proposedStartDate: Date,
  proposedTimeSlot: string,
  proposedSessionsPerWeek: 2 | 3,
  existingBookings: Array<{
    startDate: Date;
    timeSlot: string;
    studentName: string;
    sessionsPerWeek?: 2 | 3;
  }>
): BookingConflict[] {
  const proposedSessions = generateMonthlySessionDates(proposedStartDate, proposedSessionsPerWeek);
  const conflicts: BookingConflict[] = [];
  
  // Check each existing booking
  for (const existing of existingBookings) {
    // Skip if different time slot
    if (existing.timeSlot !== proposedTimeSlot) continue;
    
    const existingSessions = generateMonthlySessionDates(
      existing.startDate, 
      existing.sessionsPerWeek || 3
    );
    
    // Check for date conflicts
    for (const proposedSession of proposedSessions) {
      for (const existingSession of existingSessions) {
        if (proposedSession.getTime() === existingSession.getTime()) {
          conflicts.push({
            date: new Date(proposedSession),
            timeSlot: proposedTimeSlot,
            studentName: existing.studentName
          });
        }
      }
    }
  }
  
  return conflicts;
}

// Get all occupied time slots for a specific date
export function getOccupiedTimeSlotsForDate(
  targetDate: Date,
  existingBookings: Array<{
    startDate: Date;
    timeSlot: string;
    studentName: string;
    sessionsPerWeek?: 2 | 3;
  }>
): string[] {
  const occupiedSlots: string[] = [];
  
  for (const booking of existingBookings) {
    const sessionDates = generateMonthlySessionDates(
      booking.startDate, 
      booking.sessionsPerWeek || 3
    );
    
    // Check if any session falls on the target date
    const hasSessionOnDate = sessionDates.some(
      sessionDate => sessionDate.toDateString() === targetDate.toDateString()
    );
    
    if (hasSessionOnDate && !occupiedSlots.includes(booking.timeSlot)) {
      occupiedSlots.push(booking.timeSlot);
    }
  }
  
  return occupiedSlots;
}
