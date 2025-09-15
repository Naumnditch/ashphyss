"use client";
import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { addDays } from 'date-fns';

interface SessionDate {
  date: Date;
  sessionNumber: number;
  time: string; // Time for this specific session
}

// Day of week timing configuration
interface DayTimings {
  [dayOfWeek: number]: string; // 0 = Sunday, 1 = Monday, etc.
}

interface BookingContextType {
  selectedTime: string | undefined;
  setSelectedTime: (time: string | undefined) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  sessionsPerWeek: 2 | 3;
  setSessionsPerWeek: (sessions: 2 | 3) => void;
  weeklySchedule: SessionDate[];
  customTimings: DayTimings;
  setCustomTimings: (timings: DayTimings) => void;
  useCustomTimings: boolean;
  setUseCustomTimings: (use: boolean) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessionsPerWeek, setSessionsPerWeek] = useState<2 | 3>(3);
  const [customTimings, setCustomTimings] = useState<DayTimings>({});
  const [useCustomTimings, setUseCustomTimings] = useState(false);

  const weeklySchedule = useMemo(() => {
    if (!selectedTime) return [];
    
    const startDate = new Date(selectedTime);
    const sessions: SessionDate[] = [];
    
    // Calculate total sessions based on frequency: 2 sessions/week = 8 total, 3 sessions/week = 12 total
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
    const firstPatternDay = weeklyPattern[0];
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
      
      // Determine the time for this session
      let sessionTime: string;
      if (useCustomTimings && customTimings[dayOfWeek]) {
        sessionTime = customTimings[dayOfWeek];
      } else {
        sessionTime = new Date(selectedTime).toTimeString().substring(0, 5);
      }
      
      sessions.push({
        date: sessionDate,
        sessionNumber: sessionCount + 1,
        time: sessionTime
      });
      
      sessionCount++;
      currentPatternIndex = (currentPatternIndex + 1) % weeklyPattern.length;
      
      // If we've completed a full pattern cycle, move to the next week
      if (currentPatternIndex === 0) {
        currentWeekStart = addDays(currentWeekStart, 7);
      }
    }
    
    return sessions;
  }, [selectedTime, sessionsPerWeek, customTimings, useCustomTimings]);

  return (
    <BookingContext.Provider value={{ 
      selectedTime, 
      setSelectedTime, 
      selectedDate, 
      setSelectedDate, 
      sessionsPerWeek,
      setSessionsPerWeek,
      weeklySchedule,
      customTimings,
      setCustomTimings,
      useCustomTimings,
      setUseCustomTimings
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
