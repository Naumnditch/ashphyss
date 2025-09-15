"use client";
import { useMemo, useState, useEffect } from 'react';
import { format, setHours, setMinutes, startOfDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useBooking } from './BookingContext';
import { WeeklySchedulePreview } from './WeeklySchedulePreview';

const END_HOUR = 22;   // 10 PM

export function BookingCalendar({ readOnly = false }: { readOnly?: boolean }) {
  const { selectedDate, setSelectedDate, selectedTime, setSelectedTime } = useBooking();
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Check for occupied time slots when date changes
  useEffect(() => {
    if (!selectedDate || readOnly) return;

    const checkOccupiedSlots = async () => {
      setIsCheckingConflicts(true);
      try {
        const response = await fetch('/api/check-booking-conflicts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getOccupiedSlots',
            targetDate: selectedDate.toISOString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          setOccupiedSlots(data.occupiedSlots || []);
        }
      } catch (error) {
        console.error('Error checking occupied slots:', error);
        setOccupiedSlots([]);
      } finally {
        setIsCheckingConflicts(false);
      }
    };

    checkOccupiedSlots();
  }, [selectedDate, readOnly]);

  const timeslots = useMemo(() => {
    if (!selectedDate) return [] as Date[];
    const base = startOfDay(selectedDate);
    const slots: Date[] = [];
  
    // Saturday is day 6, start at 3 PM (15). Other days start at 6 PM (18)
    const startHour = selectedDate.getDay() === 6 ? 15 : 18;
    
    for (let hour = startHour; hour <= END_HOUR; hour++) {
      const d = setMinutes(setHours(base, hour), 0);
      slots.push(d);
    }
    
    return slots; // <-- THIS LINE WAS MISSING
  }, [selectedDate]); // <-- This must come AFTER the closing brace of the function

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <h3 className="font-medium text-lg mb-4">Select Date</h3>
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={readOnly ? undefined : setSelectedDate}
            disabled={{ 
              before: new Date(), // This already disables past dates including today before current time
              dayOfWeek: [0] // Disable Sundays (0 = Sunday)
            }}
            weekStartsOn={1}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-lg font-semibold",
              caption_label: "text-lg font-semibold",
              nav: "space-x-1 flex items-center",
              nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-gray-500 rounded-md w-10 h-10 font-normal text-sm flex items-center justify-center",
              row: "flex w-full mt-2",
              cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
              day_range_end: "day-range-end",
              day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
              day_today: "bg-gray-100 text-gray-900 font-semibold",
              day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-400 aria-selected:opacity-30",
              day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
              day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900",
              day_hidden: "invisible",
            }}
          />
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <h3 className="font-medium text-lg mb-4">Available Times</h3>
        <div className="grid grid-cols-2 gap-3">
          {isCheckingConflicts && (
            <div className="col-span-2 text-center text-sm text-gray-500 py-4">
              Checking availability...
            </div>
          )}
          {timeslots.map((slot) => {
            const label = format(slot, 'h:00 a');
            const value = slot.toISOString();
            const timeSlot = format(slot, 'HH:mm');
            const active = selectedTime === value;
            const isOccupied = occupiedSlots.includes(timeSlot);
            
            return (
              <button
                key={value}
                className={`btn py-3 ${
                  isOccupied 
                    ? 'bg-red-100 text-red-600 border-red-200 cursor-not-allowed' 
                    : active 
                      ? 'btn-primary' 
                      : 'btn-secondary'
                }`}
                disabled={readOnly || isOccupied}
                onClick={() => !isOccupied && setSelectedTime(value)}
                title={isOccupied ? 'This time slot is already booked' : ''}
              >
                {label}
                {isOccupied && (
                  <span className="ml-1 text-xs">✕</span>
                )}
              </button>
            );
          })}
        </div>
        {!readOnly && selectedTime && (
          <div className="pt-4 space-y-3">
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
              <strong>Selected:</strong> {format(new Date(selectedTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        )}
      </div>
      {!readOnly && selectedTime && (
        <div className="lg:col-span-2">
          <WeeklySchedulePreview selectedDateTime={selectedTime} />
        </div>
      )}
    </div>
  );
}


