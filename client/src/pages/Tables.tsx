import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.tsx';
import { Plus, QrCode, Users, Printer, Download, Edit, Trash2, Settings, DollarSign, CheckCircle, Calendar, ChevronDown } from 'lucide-react';
import apiClient from '../utils/apiClient.ts';
import TableOrderModal from '../components/table/TableOrderModal.tsx';
import TableQRModal from '../components/table/TableQRModal.tsx';
import AddTableModal from '../components/table/AddTableModal.tsx';
import GSTSettingsModal from '../components/table/GSTSettingsModal.tsx';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

interface Table {
  _id: string;
  tableNumber: string;
  status: string;
  qrUrl: string;
  currentOrder?: {
    _id: string;
    billNumber: number;
    totalAmount: number;
  };
  customerName: string;
  customerMobile: string;
  lastActivity: string;
  gstEnabled: boolean;
  gstPercentage: number;
  dailyRevenue?: number;
}

interface TableRevenue {
  tableNumber: string;
  revenue: number;
}

interface DateRange {
  label: string;
  startDate: string;
  endDate: string;
}

const Tables: React.FC = () => {
  const { restaurantId } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGSTSettings, setShowGSTSettings] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    label: 'Today',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Predefined date ranges
  const dateRanges: DateRange[] = [
    { label: 'Today', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'Yesterday', startDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), endDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
    { label: 'Last 7 Days', startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'Last 30 Days', startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'This Month', startDate: dayjs().startOf('month').format('YYYY-MM-DD'), endDate: dayjs().endOf('month').format('YYYY-MM-DD') },
    { label: 'Last Month', startDate: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') },
  ];

  const fetchTables = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      const tablesData = response.data;
      
      // Fetch revenue for each table based on date range
      const tablesWithRevenue = await Promise.all(
        tablesData.map(async (table: Table) => {
          try {
            let url = `/api/restaurants/${restaurantId}/orders?tableNumber=${table.tableNumber}`;
            if (dateRange.startDate && dateRange.endDate) {
              url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            }
            
            const revenueResponse = await apiClient.get(url);
            const periodRevenue = revenueResponse.data.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
            return { ...table, dailyRevenue: periodRevenue };
          } catch (error) {
            console.error(`Error fetching revenue for table ${table.tableNumber}:`, error);
            return { ...table, dailyRevenue: 0 };
          }
        })
      );
      
      setTables(tablesWithRevenue);
      setError('');
    } catch (error: any) {
      setError('Failed to load tables.');
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setShowDatePicker(false);
  };

  const handleCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange({
        label: `${dayjs(customStartDate).format('MMM DD')} - ${dayjs(customEndDate).format('MMM DD, YYYY')}`,
        startDate: customStartDate,
        endDate: customEndDate
      });
      setShowDatePicker(false);
    }
  };

  useEffect(() => {
    fetchTables();
    
    // Reset daily revenue at midnight (only for today's view)
    if (dateRange.label === 'Today') {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      const midnightReset = setTimeout(() => {
        fetchTables(); // Refresh tables to reset revenue
      }, timeUntilMidnight);
      
      return () => clearTimeout(midnightReset);
    }
  }, [restaurantId, dateRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blank': return 'bg-gray-200 border-gray-300';
      case 'running': return 'bg-blue-200 border-blue-400';
      case 'printed': return 'bg-green-200 border-green-400';
      case 'paid': return 'bg-orange-200 border-orange-400';
      case 'kot_running': return 'bg-yellow-200 border-yellow-400';
      default: return 'bg-gray-200 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'blank': return 'Blank Table';
      case 'running': return 'Running Table';
      case 'printed': return 'Printed Table';
      case 'paid': return 'Paid Table';
      case 'kot_running': return 'Running KOT';
      default: return 'Unknown';
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setShowOrderModal(true);
  };

  const handleQRClick = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    setSelectedTable(table);
    setShowQRModal(true);
  };

  const handleCompleteOrder = async (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    
    try {
      // Get the current order for this table
      const orderResponse = await apiClient.get(`/api/restaurants/${restaurantId}/tables/${table._id}/order`);
      if (orderResponse.data) {
        // Update order status to completed
        await apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderResponse.data._id}`, {
          status: 'completed'
        });
      }

      // Reset table status to blank
      await apiClient.put(`/api/restaurants/${restaurantId}/tables/${table._id}/status`, {
        status: 'blank',
        customerName: '',
        customerMobile: ''
      });

      // Refresh tables
      fetchTables();
    } catch (error) {
      console.error('Error completing order:', error);
      setError('Failed to complete order');
    }
  };

  const handleAddTable = () => {
    setShowAddModal(true);
  };

  const handleTableAdded = () => {
    setShowAddModal(false);
    fetchTables();
  };

  const handleOrderPlaced = () => {
    setShowOrderModal(false);
    fetchTables(); // Refresh to update revenue
  };

  const handleGSTSettingsUpdated = () => {
    setShowGSTSettings(false);
    fetchTables();
  };

  const handleUpdateQRUrls = async () => {
    try {
      const response = await apiClient.post(`/api/restaurants/${restaurantId}/tables/update-qr-urls`);
      toast.success(response.data.message);
      fetchTables(); // Refresh tables to get updated QR URLs
    } catch (error) {
      console.error('Error updating QR URLs:', error);
      toast.error('Failed to update QR URLs');
    }
  };

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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Table Management</h1>
        <p className="text-gray-600">Manage restaurant tables and orders</p>
      </div>

      {/* Status Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Table Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
            <span className="text-sm">Blank Table</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
            <span className="text-sm">Running Table</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
            <span className="text-sm">Printed Table</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
            <span className="text-sm">Paid Table</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
            <span className="text-sm">Running KOT Table</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div className="flex gap-3">
          <button
            onClick={handleAddTable}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
          <button
            onClick={() => setShowGSTSettings(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            GST Settings
          </button>
          <button
            onClick={handleUpdateQRUrls}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Update QR URLs
          </button>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 relative">
            <Calendar className="w-5 h-5 text-gray-600" />
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
            >
              <span className="text-sm font-medium">{dateRange.label}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Date Range Dropdown */}
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[280px]">
                <div className="p-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Quick Select</h4>
                  <div className="space-y-1">
                    {dateRanges.map((range) => (
                      <button
                        key={range.label}
                        onClick={() => handleDateRangeChange(range)}
                        className="w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 transition-colors"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-3">
                  <h4 className="font-semibold text-gray-900 mb-2">Custom Range</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleCustomDateRange}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full bg-blue-600 text-white py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply Custom Range
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            Total Tables: {tables.length}
          </div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.map((table) => (
            <div
              key={table._id}
              onClick={() => handleTableClick(table)}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${getStatusColor(table.status)}
                ${table.currentOrder ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              {/* Table Number */}
              <div className="text-center mb-2">
                <div className="text-2xl font-bold text-gray-800">Table {table.tableNumber}</div>
                <div className="text-xs text-gray-600 mt-1">{getStatusText(table.status)}</div>
              </div>

              {/* Period Revenue */}
              {table.dailyRevenue && table.dailyRevenue > 0 && (
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-1 text-sm font-semibold text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>₹{table.dailyRevenue.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{dateRange.label}</div>
                </div>
              )}

              {/* Customer Info */}
              {table.customerName && (
                <div className="text-center mb-2">
                  <div className="text-sm font-medium text-gray-700">{table.customerName}</div>
                  {table.customerMobile && (
                    <div className="text-xs text-gray-600">{table.customerMobile}</div>
                  )}
                </div>
              )}

              {/* Order Info */}
              {table.currentOrder && (
                <div className="text-center mb-2">
                  <div className="text-sm font-semibold text-blue-700">
                    Bill #{table.currentOrder.billNumber}
                  </div>
                  <div className="text-xs text-gray-600">
                    ₹{table.currentOrder.totalAmount?.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* GST Info */}
              {table.gstEnabled && (
                <div className="text-center mb-2">
                  <div className="text-xs text-purple-600 font-medium">
                    GST {table.gstPercentage}%
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {/* QR Code Button */}
                <button
                  onClick={(e) => handleQRClick(e, table)}
                  className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                  title="Download QR Code"
                >
                  <QrCode className="w-3 h-3 text-gray-600" />
                </button>

                {/* Complete Order Button (only for running tables) */}
                {table.status === 'running' && (
                  <button
                    onClick={(e) => handleCompleteOrder(e, table)}
                    className="p-1 bg-green-500 rounded-full shadow-sm hover:bg-green-600 transition-colors"
                    title="Complete Order"
                  >
                    <CheckCircle className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>

              {/* Status Indicator */}
              <div className="absolute bottom-2 left-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(table.status).replace('bg-', 'bg-').replace('border-', '')}`}></div>
              </div>
            </div>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first table</p>
            <button
              onClick={handleAddTable}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add Table
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Modals */}
      {showOrderModal && selectedTable && (
        <TableOrderModal
          table={selectedTable}
          onClose={() => setShowOrderModal(false)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {showQRModal && selectedTable && (
        <TableQRModal
          table={selectedTable}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onTableAdded={handleTableAdded}
        />
      )}

      {showGSTSettings && (
        <GSTSettingsModal
          onClose={() => setShowGSTSettings(false)}
          onGSTUpdated={handleGSTSettingsUpdated}
        />
      )}
    </div>
  );
};

export default Tables; 