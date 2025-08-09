import React, { useEffect, useState } from 'react';
import AnalyticsCard from '../components/AnalyticsCard.tsx';
// Charts removed
import { useAuth } from '../AuthContext.tsx';
import { Calendar, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import CalendarView from './CalendarView.tsx';

// Charts removed

const periodOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'all', label: 'All Time' },
];

const Dashboard = () => {
  const { restaurantId, token } = useAuth();
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'calendar'
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    completionRate: 0,
    topItems: [] as { name: string; qty: number }[],
    activeCustomers: 0,
    revenueTrend: [],
    labels: [],
  });
  const [tableCount, setTableCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [inventoryPie, setInventoryPie] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  const fetchAnalytics = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [analyticsRes, tables, items, staff] = await Promise.all([
      fetch(import.meta.env.VITE_API_BASE_URL +`/api/restaurants/${restaurantId}/orders/analytics?period=${period}`, { credentials: 'include' }).then(res => res.json()),
      fetch(import.meta.env.VITE_API_BASE_URL +`/api/restaurants/${restaurantId}/tables`, { credentials: 'include' }).then(res => res.json()),
      fetch(import.meta.env.VITE_API_BASE_URL +`/api/restaurants/${restaurantId}/menu`, { credentials: 'include' }).then(res => res.json()),
      fetch(import.meta.env.VITE_API_BASE_URL +`/api/staff/`, { credentials: 'include' }).then(res => res.json()),
    ]);
    // For demo, fake revenue trend data
    const trend = Array(10).fill(0).map((_, i) => Math.round(Math.random() * analyticsRes.totalRevenue / 10));
    const labels = trend.map((_, i) => `${period.charAt(0).toUpperCase() + period.slice(1)} ${i + 1}`);
    // Inventory pie: by category
    const catMap = {};
    items.forEach(i => { catMap[i.category || 'Other'] = (catMap[i.category || 'Other'] || 0) + 1; });
    setInventoryPie({ labels: Object.keys(catMap), data: Object.values(catMap) });
    setAnalytics({ ...analyticsRes, revenueTrend: trend, labels });
    setTableCount(tables.length);
    setItemCount(items.length);
    setStaffCount(staff.length);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, restaurantId]);

  const renderOverview = () => (
    <>
      {/* Analytics Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <AnalyticsCard 
          title="Total Revenue" 
          value={`₹${analytics.totalRevenue.toLocaleString('en-IN')}`}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="bg-green-500"
        />
        <AnalyticsCard 
          title="Total Orders" 
          value={analytics.totalOrders}
          icon={<Package className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="bg-blue-500"
        />
        <AnalyticsCard 
          title="Active Tables" 
          value={tableCount}
          icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="bg-purple-500"
        />
        <AnalyticsCard 
          title="Total Items" 
          value={itemCount}
          icon={<Package className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="bg-orange-500"
        />
      </div>
      
      {/* Charts removed */}
      
      {/* Bottom Stats Section - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Top Selling Items</h3>
          </div>
          <ul className="space-y-3">
            {analytics.topItems && analytics.topItems.length > 0 ? (
              analytics.topItems.map((item, idx) => (
                <li key={item.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold text-sm flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="flex-1 font-medium text-gray-800 truncate">{item.name}</span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0">
                    {item.qty} sold
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 text-center py-8">No data available</li>
            )}
          </ul>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg text-center">
              <span className="text-2xl font-bold text-blue-700">{analytics.completionRate}%</span>
              <span className="text-sm text-gray-600 mt-1">Completion Rate</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg text-center">
              <span className="text-2xl font-bold text-green-700">{analytics.activeCustomers}</span>
              <span className="text-sm text-gray-600 mt-1">Active Customers</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg text-center">
              <span className="text-2xl font-bold text-purple-700">{staffCount}</span>
              <span className="text-sm text-gray-600 mt-1">Total Staff</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderCalendar = () => (
    <CalendarView />
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your restaurant's performance</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'overview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'calendar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'overview' ? renderOverview() : renderCalendar()}
    </div>
  );
};

export default Dashboard; 