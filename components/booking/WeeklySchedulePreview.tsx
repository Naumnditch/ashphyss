import { SessionCalendarView } from './SessionCalendarView';

interface WeeklySchedulePreviewProps {
  selectedDateTime: string;
}

export function WeeklySchedulePreview({ selectedDateTime }: WeeklySchedulePreviewProps) {
  return (
    <div className="space-y-4">
      {/* Visual Calendar View - gets data from BookingContext */}
      <SessionCalendarView selectedDateTime={selectedDateTime} />
    </div>
  );
}
