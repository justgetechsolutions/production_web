import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { useAuth } from '../AuthContext.tsx';

const DAYS_IN_WEEK = 7;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const CalendarView: React.FC = () => {
  const { restaurantId } = useAuth();
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(today.month());
  const [currentYear, setCurrentYear] = useState(today.year());
  const [revenueData, setRevenueData] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [totalMonthRevenue, setTotalMonthRevenue] = useState(0);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  useEffect(() => {
    const fetchRevenue = async () => {
      if (!restaurantId) return;
      
      setLoading(true);
      const monthStr = dayjs(new Date(currentYear, currentMonth)).format('YYYY-MM');
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/restaurants/${restaurantId}/orders/analytics?period=monthly&month=${monthStr}`, { 
          withCredentials: true 
        });
        
        const dailyRevenue = res.data || {};
        setRevenueData(dailyRevenue);
        
        // Calculate total month revenue
        const total = Object.values(dailyRevenue).reduce((sum: number, revenue: any) => sum + revenue, 0);
        setTotalMonthRevenue(total);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        setRevenueData({});
        setTotalMonthRevenue(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRevenue();
  }, [currentMonth, currentYear, restaurantId, daysInMonth]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const firstDayOfMonth = dayjs(new Date(currentYear, currentMonth, 1)).day();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const getRevenueColor = (revenue: number) => {
    if (revenue >= 4000) return 'bg-green-100 border-green-300 text-green-800';
    if (revenue >= 2500) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (revenue >= 1500) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Revenue Calendar</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
            {/* <DollarSign className="w-5 h-5 text-green-600" /> */}
            <span className="text-green-800 font-semibold">
              ₹{totalMonthRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-green-600 text-sm">This Month</span>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => handleMonthChange('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-xl font-semibold text-gray-900">
          {dayjs().month(currentMonth).format('MMMM')} {currentYear}
        </div>
        
        <button
          onClick={() => handleMonthChange('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-[11px] sm:text-sm">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="p-1 sm:p-3 text-center font-semibold text-gray-600">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((day, idx) => (
          day ? (
            <div
              key={day}
              className={`min-h-[72px] sm:min-h-[100px] p-1.5 sm:p-3 border rounded-lg flex flex-col ${
                today.date() === day && today.month() === currentMonth && today.year() === currentYear
                  ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              } ${getRevenueColor(revenueData[day] || 0)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-xs sm:text-sm">{day}</span>
                {today.date() === day && today.month() === currentMonth && today.year() === currentYear && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-[11px] sm:text-lg font-bold leading-tight">
                    ₹{(revenueData[day] || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="hidden sm:block text-xs opacity-75">{revenueData[day] ? 'Revenue' : 'No data'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div key={idx} className="min-h-[72px] sm:min-h-[100px] p-2 sm:p-3" />
          )
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm">
          <span className="font-medium text-gray-700">Revenue Legend:</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>High (₹4,000+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Medium (₹2,500-3,999)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Low (₹1,500-2,499)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>No Data</span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
