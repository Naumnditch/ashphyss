# Monthly Booking System

## Overview
The booking system has been updated to support monthly courses with comprehensive conflict detection.

## Key Features

### 1. **Monthly Course Structure**
- **12 sessions per month** (3 sessions per week for 4 weeks)
- Sessions follow the pattern: Session → Day Off → Session (Sundays excluded)
- Weekend adjustments: Friday sessions automatically skip to Monday

### 2. **Date Restrictions**
- **Past dates are disabled** - only future dates can be selected
- **Sundays are always disabled** - no tutoring on Sundays
- **Saturday hours**: 3:00 PM - 10:00 PM
- **Weekday hours**: 6:00 PM - 10:00 PM

### 3. **Conflict Prevention**
- **Time slot conflicts detected** - occupied slots shown with ✕ and red styling
- **Real-time availability checking** - slots update when date changes
- **Booking validation** - double-checks conflicts before final submission
- **Visual feedback** - loading states and clear error messages

## Database Schema

### Booking Model
```prisma
model Booking {
  id           String         @id @default(cuid())
  studentName  String
  studentEmail String
  studentPhone String
  notes        String?
  startDate    DateTime       // First session date
  timeSlot     String         // e.g., "18:00" for 6 PM
  sessions     BookingSession[]
  
  @@unique([startDate, timeSlot]) // Prevent overlapping bookings
}

model BookingSession {
  id        String   @id @default(cuid())
  booking   Booking  @relation(fields: [bookingId], references: [id])
  date      DateTime
  sessionNumber Int   // 1-12 for monthly course
  completed Boolean  @default(false)
}
```

## API Endpoints

### `/api/check-booking-conflicts` (POST)
Check for booking conflicts and get occupied time slots.

**Actions:**
- `checkConflicts`: Validate a proposed booking
- `getOccupiedSlots`: Get all occupied slots for a specific date

### `/api/book-session` (POST)
Create a new booking with email notification.

## Example Booking Flow

1. **Alex books Aug 31, 2024 at 6:00 PM**
   - System generates 12 session dates starting Aug 31
   - All these dates/times become unavailable for others

2. **John tries to book Sept 2, 2024 at 6:00 PM**
   - If Sept 2 conflicts with Alex's schedule → slot shows as occupied
   - John must choose a different time or date

3. **Brad books Aug 31, 2024 at 7:00 PM**
   - Different time slot → no conflict with Alex
   - System generates Brad's 12 sessions starting Aug 31 at 7:00 PM

## Testing the System

### Manual Testing
1. Open the booking page
2. Select a date and time
3. Fill out the form and submit
4. Try to book the same time slot again → should be blocked

### Adding Test Data
To test conflicts, add example bookings to the `mockExistingBookings` array in:
`app/api/check-booking-conflicts/route.ts`

```javascript
const mockExistingBookings = [
  {
    startDate: new Date('2024-08-31T18:00:00'),
    timeSlot: '18:00',
    studentName: 'Alex'
  }
];
```

## Production Setup

1. **Database Migration**
   ```bash
   npx prisma migrate dev --name monthly-booking-system
   ```

2. **Replace Mock Data**
   - Update conflict checking to use real database queries
   - Remove `mockExistingBookings` and implement `getExistingBookingsFromDB()`

3. **Email Configuration**
   - Set up environment variables for email service
   - Test email delivery for booking confirmations

## User Experience

- **Clear Visual Feedback**: Occupied slots are clearly marked
- **Real-time Updates**: Availability updates when changing dates
- **Comprehensive Preview**: All 12 sessions shown in schedule preview
- **Conflict Prevention**: Multiple layers of validation prevent double bookings
- **Professional Interface**: Clean, intuitive booking flow
