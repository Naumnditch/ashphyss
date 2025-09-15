"use client";
import { useState, useEffect, useMemo } from 'react';
import { format, setHours, setMinutes, startOfDay } from 'date-fns';
import { useBooking } from './BookingContext';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

const END_HOUR = 22; // 10 PM

export function CustomTimingSelector() {
  const { 
    weeklySchedule, 
    customTimings, 
    setCustomTimings, 
    useCustomTimings, 
    setUseCustomTimings,
    selectedTime 
  } = useBooking();

  // Get unique days that appear in the schedule
  const scheduledDays = useMemo(() => {
    const uniqueDays = new Set<number>();
    weeklySchedule.forEach(session => {
      uniqueDays.add(session.date.getDay());
    });
    return Array.from(uniqueDays).sort();
  }, [weeklySchedule]);

  // Generate available time slots
  const generateTimeSlots = (dayOfWeek: number) => {
    const base = startOfDay(new Date());
    const slots: string[] = [];
    
    // Saturday is day 6, start at 3 PM (15). Other days start at 6 PM (18)
    const startHour = dayOfWeek === 6 ? 15 : 18;
    
    for (let hour = startHour; hour <= END_HOUR; hour++) {
      const timeSlot = setMinutes(setHours(base, hour), 0);
      slots.push(format(timeSlot, 'HH:mm'));
    }
    return slots;
  };

  // Initialize custom timings with default time when switching to custom mode
  useEffect(() => {
    if (useCustomTimings && selectedTime && Object.keys(customTimings).length === 0) {
      const defaultTime = new Date(selectedTime).toTimeString().substring(0, 5);
      const initialTimings: { [key: number]: string } = {};
      scheduledDays.forEach(day => {
        initialTimings[day] = defaultTime;
      });
      setCustomTimings(initialTimings);
    }
  }, [useCustomTimings, selectedTime, scheduledDays, customTimings, setCustomTimings]);

  const handleTimeChange = (dayOfWeek: number, time: string) => {
    setCustomTimings({
      ...customTimings,
      [dayOfWeek]: time
    });
  };

  const toggleCustomTimings = () => {
    setUseCustomTimings(!useCustomTimings);
    if (useCustomTimings) {
      // Clear custom timings when switching back to uniform timing
      setCustomTimings({});
    }
  };

  if (weeklySchedule.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Timing Options</h3>
        <button
          onClick={toggleCustomTimings}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            useCustomTimings
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {useCustomTimings ? 'Use Same Time' : 'Customize Times'}
        </button>
      </div>

      {useCustomTimings && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Set different times for different days of the week. All sessions on the same day will use the same time.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledDays.map(dayOfWeek => {
              const dayInfo = DAYS_OF_WEEK.find(d => d.id === dayOfWeek);
              if (!dayInfo) return null;

              const availableSlots = generateTimeSlots(dayOfWeek);
              const currentTime = customTimings[dayOfWeek] || '';

              return (
                <div key={dayOfWeek} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900">{dayInfo.name}</h4>
                    <p className="text-xs text-gray-500">
                      {dayOfWeek === 6 ? '3:00 PM - 10:00 PM' : '6:00 PM - 10:00 PM'}
                    </p>
                  </div>
                  
                  <select
                    value={currentTime}
                    onChange={(e) => handleTimeChange(dayOfWeek, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select time...</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>
                        {format(new Date(`2000-01-01T${slot}`), 'h:mm a')}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {scheduledDays.some(day => !customTimings[day]) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                ⚠️ Please select a time for all scheduled days to continue.
              </p>
            </div>
          )}
        </div>
      )}

      {!useCustomTimings && selectedTime && (
        <div className="text-sm text-gray-600">
          All sessions will be at the same time: <strong>{format(new Date(selectedTime), 'h:mm a')}</strong>
        </div>
      )}
    </div>
  );
}
