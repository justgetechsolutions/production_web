import React from 'react';
import CalendarView from './CalendarView.tsx';

const Calendar: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Revenue Calendar</h1>
        <p className="text-gray-600">View your daily revenue data in a calendar format</p>
      </div>
      <CalendarView />
    </div>
  );
};

export default Calendar; 