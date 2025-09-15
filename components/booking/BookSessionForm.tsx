"use client";
import { useState } from 'react';
import { format } from 'date-fns';
import { useBooking } from './BookingContext';

interface BookSessionFormProps {
  selectedPath?: string | null;
}

export function BookSessionForm({ selectedPath }: BookSessionFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+90 ');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { selectedTime, weeklySchedule, sessionsPerWeek, useCustomTimings, customTimings } = useBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTime || !name || !email || !phone) {
      alert('Please fill in all required fields and select a time slot.');
      return;
    }

    // Validate custom timings if enabled
    if (useCustomTimings) {
      const scheduledDays = new Set(weeklySchedule.map(session => session.date.getDay()));
      const hasAllCustomTimes = Array.from(scheduledDays).every(day => customTimings[day]);
      
      if (!hasAllCustomTimes) {
        alert('Please set custom times for all scheduled days.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // First check for booking conflicts
      const startDate = new Date(selectedTime);
      const timeSlot = format(startDate, 'HH:mm');
      
      const conflictResponse = await fetch('/api/check-booking-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkConflicts',
          startDate: startDate.toISOString(),
          timeSlot: timeSlot,
          sessionsPerWeek: sessionsPerWeek
        })
      });

      if (conflictResponse.ok) {
        const conflictData = await conflictResponse.json();
        if (conflictData.hasConflicts) {
          alert('Sorry, this time slot is no longer available. Please select a different time.');
          return;
        }
      }

      // If no conflicts, proceed with booking
      const response = await fetch('/api/book-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                       body: JSON.stringify({
                 name,
                 email,
                 phone,
                 notes,
                 datetime: selectedTime,
                 weeklySchedule: weeklySchedule,
                 sessionsPerWeek: sessionsPerWeek,
                 selectedPath: selectedPath,
                 useCustomTimings: useCustomTimings,
                 customTimings: customTimings,
               }),
      });

      if (response.ok) {
        setSubmitted(true);
        setName('');
        setEmail('');
        setPhone('+90 ');
        setNotes('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 text-lg font-semibold">✓ Booking Request Sent!</div>
        <p className="text-gray-600">We'll contact you soon to confirm your session details.</p>
        <button 
          onClick={() => setSubmitted(false)} 
          className="btn btn-secondary"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Student Name *</label>
        <input 
          required
          className="w-full border border-gray-300 rounded-xl px-3 py-2" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Jane Doe" 
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Email *</label>
        <input 
          required
          type="email" 
          className="w-full border border-gray-300 rounded-xl px-3 py-2" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="you@example.com" 
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Phone Number *</label>
        <input 
          required
          type="tel" 
          className="w-full border border-gray-300 rounded-xl px-3 py-2" 
          value={phone} 
          onChange={(e) => {
            // Ensure the +90 prefix is always maintained
            let value = e.target.value;
            if (!value.startsWith('+90 ')) {
              if (value.startsWith('+90')) {
                value = '+90 ' + value.slice(3);
              } else if (value.startsWith('90 ')) {
                value = '+' + value;
              } else if (value.startsWith('5')) {
                value = '+90 ' + value;
              } else {
                value = '+90 ';
              }
            }
            setPhone(value);
          }} 
          placeholder="+90 5** *** ** **" 
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Notes (optional)</label>
        <textarea 
          className="w-full border border-gray-300 rounded-xl px-3 py-2" 
          rows={4} 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Topics, exam date, goals..." 
        />
      </div>
      
      <button 
        type="submit" 
        disabled={!selectedTime || !name || !email || !phone || isSubmitting}
        className="btn btn-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Booking Request'}
      </button>
      
      <p className="text-xs text-gray-500">We'll contact you to confirm your session details.</p>
    </form>
  );
}


