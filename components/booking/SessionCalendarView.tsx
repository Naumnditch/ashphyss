import { format, isSameMonth } from 'date-fns';
import { useBooking } from './BookingContext';

interface SessionCalendarViewProps {
  selectedDateTime: string;
}

export function SessionCalendarView({ selectedDateTime }: SessionCalendarViewProps) {
  const { weeklySchedule, sessionsPerWeek, useCustomTimings } = useBooking();
  
  if (!selectedDateTime || weeklySchedule.length === 0) {
    return null;
  }

  const selectedTime = format(new Date(selectedDateTime), 'h:mm a');
  const totalSessions = sessionsPerWeek === 2 ? 8 : 12;

  // Group sessions by month for better organization
  const sessionsByMonth = weeklySchedule.reduce((groups, session) => {
    const monthKey = format(session.date, 'MMMM yyyy');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(session);
    return groups;
  }, {} as Record<string, typeof weeklySchedule>);

  return (
    <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900 mb-4 text-center">
        Your Complete Course Schedule ({totalSessions} Sessions)
      </h3>
      
      <div className="space-y-6">
        {Object.entries(sessionsByMonth).map(([month, sessions]) => (
          <div key={month}>
            <h4 className="text-md font-medium text-blue-800 mb-3 text-center bg-blue-100 py-2 rounded-md">
              {month}
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sessions.map((session) => {
                const dayOfWeek = format(session.date, 'EEEE');
                const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
                
                return (
                  <div
                    key={session.sessionNumber}
                    className={`bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 p-3 min-h-[120px] flex flex-col justify-center items-center ${
                      isWeekend 
                        ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' 
                        : 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50'
                    }`}
                  >
                    <div className="text-center space-y-1 flex flex-col justify-center items-center h-full">
                      <div className={`text-xs font-semibold uppercase tracking-wide ${
                        isWeekend ? 'text-purple-600' : 'text-blue-600'
                      }`}>
                        Session {session.sessionNumber}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {format(session.date, 'EEE')}
                      </div>
                      <div className={`text-xl font-bold ${
                        isWeekend ? 'text-purple-800' : 'text-blue-800'
                      }`}>
                        {format(session.date, 'd')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {format(session.date, 'MMM')}
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded ${
                        isWeekend 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {session.time ? format(new Date(`2000-01-01T${session.time}`), 'h:mm a') : selectedTime}
                      </div>
                      {isWeekend && (
                        <div className="text-xs text-purple-600">
                          Weekend
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
        <div className="text-center text-sm text-blue-800">
          <div className="font-semibold mb-2 text-blue-900">Course Summary</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white bg-opacity-50 py-2 px-3 rounded">
              <div className="font-medium text-blue-900">{totalSessions}</div>
              <div className="text-blue-700">Total Sessions</div>
            </div>
            <div className="bg-white bg-opacity-50 py-2 px-3 rounded">
              <div className="font-medium text-blue-900">{sessionsPerWeek}/week</div>
              <div className="text-blue-700">Frequency</div>
            </div>
            <div className="bg-white bg-opacity-50 py-2 px-3 rounded">
              <div className="font-medium text-blue-900">
                {useCustomTimings ? 'Custom' : selectedTime}
              </div>
              <div className="text-blue-700">
                {useCustomTimings ? 'Times' : 'Every Session'}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-700">
            <span className="inline-flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
              Weekdays
            </span>
            <span className="inline-flex items-center ml-4">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
              Weekends
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
