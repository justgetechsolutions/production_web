import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../AuthContext.tsx';
import { Printer, Download, RefreshCw, Filter, Users, Calendar, ChevronDown } from 'lucide-react';
import apiClient from '../../utils/apiClient.ts';
import BillReceipt from '../table/BillReceipt.tsx';
import dayjs from 'dayjs';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import NewOrderNotification from '../NewOrderNotification.tsx';

interface Order {
  _id?: string;
  tableId: string;
  tableNumber?: string;
  token?: number;
  billNumber?: number;
  items: { menuItem: { name: string, _id?: string }, quantity: number, price: number }[];
  status: string;
  timestamp: string;
  totalAmount: number;
  subtotal?: number;
  gstAmount?: number;
  gstPercentage?: number;
  customerName?: string;
  customerMobile?: string;
  description?: string;
}

interface TableStats {
  tableNumber: string;
  totalItems: number;
  totalRevenue: number;
  orderCount: number;
  status: string;
}

interface DateRange {
  label: string;
  startDate: string;
  endDate: string;
}

function OrderList() {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevOrderCount, setPrevOrderCount] = useState<number>(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showBillReceipt, setShowBillReceipt] = useState(false);
  const [filterTable, setFilterTable] = useState<string>('all');
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    label: 'All Time',
    startDate: '',
    endDate: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showNewOrderNotification, setShowNewOrderNotification] = useState(false);
  const [newOrderData, setNewOrderData] = useState<any>(null);
  const [enableSound, setEnableSound] = useState(true);

  // Predefined date ranges
  const dateRanges: DateRange[] = [
    { label: 'All Time', startDate: '', endDate: '' },
    { label: 'Today', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'Yesterday', startDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), endDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
    { label: 'Last 7 Days', startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'Last 30 Days', startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') },
    { label: 'This Month', startDate: dayjs().startOf('month').format('YYYY-MM-DD'), endDate: dayjs().endOf('month').format('YYYY-MM-DD') },
    { label: 'Last Month', startDate: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), endDate: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') },
    { label: 'This Year', startDate: dayjs().startOf('year').format('YYYY-MM-DD'), endDate: dayjs().endOf('year').format('YYYY-MM-DD') },
  ];

  const fetchTables = async () => {
    if (!restaurantId) return;
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const fetchOrders = async (playSound = false, showLoading = false) => {
    if (!restaurantId) return;
    if (showLoading) setLoading(true);
    try {
      let url = `/api/restaurants/${restaurantId}/orders`;
      const params = new URLSearchParams();
      
      // Add date range parameters
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await apiClient.get(url);
      // Only play sound if a new order is ADDED (not just any update)
      if (playSound && response.data.length > orders.length) {
        const audio = new Audio(import.meta.env.BASE_URL + '/VOICE.mp3');
        audio.play();
      }
      setPrevOrderCount(orders.length);
      setOrders(response.data);
      
      // Calculate table statistics
      calculateTableStats(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const calculateTableStats = (orderData: Order[]) => {
    const stats: { [key: string]: TableStats } = {};
    
    // Initialize all tables with zero stats
    tables.forEach(table => {
      stats[table.tableNumber] = {
        tableNumber: table.tableNumber,
        totalItems: 0,
        totalRevenue: 0,
        orderCount: 0,
        status: table.status
      };
    });
    
    // Calculate stats from orders
    orderData.forEach(order => {
      if (order.tableNumber) {
        if (!stats[order.tableNumber]) {
          stats[order.tableNumber] = {
            tableNumber: order.tableNumber,
            totalItems: 0,
            totalRevenue: 0,
            orderCount: 0,
            status: 'blank'
          };
        }
        
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        stats[order.tableNumber].totalItems += itemCount;
        stats[order.tableNumber].totalRevenue += order.totalAmount;
        stats[order.tableNumber].orderCount += 1;
      }
    });
    
    setTableStats(Object.values(stats));
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!restaurantId) return;
    try {
      await apiClient.put(`/api/restaurants/${restaurantId}/orders/${orderId}`, { status });
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status } : order
        )
      );
      
      // If order is completed, reset table status
      if (status === 'completed') {
        const order = orders.find(o => o._id === orderId);
        if (order && order.tableId) {
          await resetTableStatus(order.tableId);
          // Refresh orders to reflect the change
          fetchOrders();
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const resetTableStatus = async (tableId: string) => {
    try {
      await apiClient.put(`/api/restaurants/${restaurantId}/tables/${tableId}/status`, {
        status: 'blank',
        customerName: '',
        customerMobile: ''
      });
    } catch (error) {
      console.error('Failed to reset table status:', error);
    }
  };

  const handlePrintBill = (order: Order) => {
    setSelectedOrder(order);
    setShowBillReceipt(true);
  };

  const handleDownloadBill = async (order: Order) => {
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      
      // Format date and time
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-GB').split('/').join('/');
      };

      const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      };

      let yPosition = 20;
      const lineHeight = 7;
      
      // Add restaurant header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kismat Kathiyawadi', 105, yPosition, { align: 'center' });
      yPosition += lineHeight;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Shukan Mall Char Rasta, Science City, Sola', 105, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;
      
      // Add bill details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Bill #${order.billNumber || order.token}`, 20, yPosition);
      yPosition += lineHeight;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Table: ${order.tableNumber}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Date: ${formatDate(order.timestamp)}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Time: ${formatTime(order.timestamp)}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Customer: ${order.customerName || 'Walk-in Customer'}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Cashier: admin`, 20, yPosition);
      yPosition += lineHeight * 2;
      
      // Add items
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items:', 20, yPosition);
      yPosition += lineHeight;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      order.items.forEach((item: any) => {
        const itemText = `${item.menuItem.name} x${item.quantity} = ₹${item.price * item.quantity}`;
        pdf.text(itemText, 25, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += lineHeight;
      
      // Add totals
      const subtotal = order.subtotal || order.totalAmount;
      const gstAmount = order.gstAmount || 0;
      const grandTotal = order.totalAmount;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 20, yPosition);
      yPosition += lineHeight;
      
      if (gstAmount > 0) {
        pdf.text(`GST: ₹${gstAmount.toFixed(2)}`, 20, yPosition);
        yPosition += lineHeight;
      }
      
      pdf.setFontSize(12);
      pdf.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 20, yPosition);
      yPosition += lineHeight * 2;
      
      // Add footer
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Thank You & Visit Again', 105, yPosition, { align: 'center' });
      
      // Save the PDF
      pdf.save(`Bill-${order.billNumber || order.token}-Table-${order.tableNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download bill. Please try again.');
    }
  };

  const handleTableClick = (tableNumber: string) => {
    setFilterTable(tableNumber === filterTable ? 'all' : tableNumber);
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

  const filteredOrders = filterTable === 'all' 
    ? orders 
    : orders.filter(order => order.tableNumber === filterTable);

  const uniqueTables = Array.from(new Set(orders.map(order => order.tableNumber).filter(Boolean)));

  // Real-time order updates
  const { isConnected, initializeAudio } = useRealTimeOrders({
    restaurantId: restaurantId || '',
    enableSound: enableSound,
    onNewOrder: (orderData) => {
      console.log('New order received:', orderData);
      // Show notification
      setNewOrderData(orderData);
      setShowNewOrderNotification(true);
      // Add new order to the list
      const newOrder: Order = {
        _id: orderData.orderId,
        tableId: orderData.tableId,
        tableNumber: orderData.tableNumber,
        token: orderData.billNumber,
        billNumber: orderData.billNumber,
        items: orderData.items || [],
        status: orderData.status,
        timestamp: orderData.timestamp,
        totalAmount: orderData.totalAmount
      };
      
      setOrders(prev => [newOrder, ...prev]);
      
      // Highlight the new order
      highlightNewOrder(orderData.orderId);
      
      // Refresh to get complete order data
      fetchOrders(false, false);
    },
    onOrderStatusUpdate: (orderData) => {
      console.log('Order status updated:', orderData);
      setOrders(prev => {
        const updated = prev.map(o => o._id === orderData.orderId ? { ...o, status: orderData.status } : o);
        // keep table stats in sync without full refetch
        calculateTableStats(updated);
        return updated;
      });
    }
  });

  // Highlight new order with visual effect
  const highlightNewOrder = (orderId: string) => {
    const orderElement = document.getElementById(`order-${orderId}`);
    if (orderElement) {
      orderElement.classList.add('bg-yellow-100', 'border-yellow-400');
      setTimeout(() => {
        orderElement.classList.remove('bg-yellow-100', 'border-yellow-400');
      }, 5000); // Remove highlight after 5 seconds
    }
  };

  useEffect(() => {
    fetchTables();
    fetchOrders(false, true);
    const interval = setInterval(() => fetchOrders(), 10000);

    return () => {
      clearInterval(interval);
    };
  }, [restaurantId, dateRange]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  const pendingCount = orders.filter(order => order.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
            {showNewOrderNotification && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                New Order!
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
            </div>
            <span className="inline-block bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-lg text-lg">
              Pending Orders: {pendingCount}
            </span>
                         <button
               onClick={() => setEnableSound(!enableSound)}
               className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                 enableSound 
                   ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
               }`}
               title={enableSound ? 'Disable sound notifications' : 'Enable sound notifications'}
             >
               <div className={`w-2 h-2 rounded-full ${enableSound ? 'bg-green-500' : 'bg-gray-400'}`}></div>
               {enableSound ? 'Sound ON' : 'Sound OFF'}
             </button>
                           <button
                onClick={initializeAudio}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                title="Test notification sound (unlocks audio)"
              >
                🔊 Test Sound
              </button>
          </div>
        </div>

        {/* Dynamic Table Slider */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Table Overview
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {/* All Tables Button */}
            <button
              onClick={() => handleTableClick('all')}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                filterTable === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className="font-bold text-lg">All Tables</div>
                <div className="text-sm opacity-80">{orders.length} Orders</div>
              </div>
            </button>

            {/* Individual Table Buttons */}
            {tableStats.map((stat) => (
              <button
                key={stat.tableNumber}
                onClick={() => handleTableClick(stat.tableNumber)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  filterTable === stat.tableNumber
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : `${getStatusColor(stat.status)} text-gray-700 hover:border-blue-400 hover:shadow-md`
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg">Table {stat.tableNumber}</div>
                  <div className="text-sm opacity-80">
                    {stat.orderCount} Orders • ₹{stat.totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-xs opacity-70">
                    {stat.totalItems} Items
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {/* Table Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tables</option>
              {uniqueTables.map(tableNumber => (
                <option key={tableNumber} value={tableNumber}>
                  Table {tableNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 relative date-picker-container">
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
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[280px]">
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

          {/* Date Range Summary */}
          {dateRange.startDate && dateRange.endDate && (
            <div className="text-sm text-gray-600">
              Showing orders from {dayjs(dateRange.startDate).format('MMM DD, YYYY')} to {dayjs(dateRange.endDate).format('MMM DD, YYYY')}
            </div>
          )}
        </div>

        {/* Date Range Summary Stats */}
        {dateRange.startDate && dateRange.endDate && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Summary for Selected Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredOrders.length}</div>
                <div className="text-sm text-blue-700">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredOrders.filter(order => order.status === 'completed').length}
                </div>
                <div className="text-sm text-purple-700">Completed Orders</div>
              </div>
            </div>
          </div>
        )}

        {/* Table Statistics Slider */}
        {/* {tableStats.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Table Revenue Overview</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {tableStats.map((stat) => (
                <div
                  key={stat.tableNumber}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-w-[200px] flex-shrink-0"
                >
                  <div className="text-center">
                    <h4 className="font-bold text-blue-900 text-lg">Table {stat.tableNumber}</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Items:</span> {stat.totalItems}
                      </p>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Revenue:</span> ₹{stat.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Orders:</span> {stat.orderCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token/Bill
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Table
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map(order => (
              <tr 
                key={order._id} 
                id={`order-${order._id}`}
                className="hover:bg-gray-50 transition-all duration-300"
              >
                <td className="px-6 py-4">
                  <div className="text-center">
                    <div className="font-bold text-2xl text-red-600">#{order.token || 'N/A'}</div>
                    {order.billNumber && (
                      <div className="text-sm text-gray-500">Bill #{order.billNumber}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-blue-700 text-lg">
                    {order.tableNumber ? `Table ${order.tableNumber}` : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {order.customerName || 'Walk-in Customer'}
                    </div>
                    {order.customerMobile && (
                      <div className="text-sm text-gray-500">{order.customerMobile}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {order.items.map(i => 
                      i.menuItem && i.menuItem.name 
                        ? `${i.menuItem.name} x${i.quantity}` 
                        : 'Unknown item'
                    ).join(', ')}
                  </div>
                  {order.description && (
                    <div className="text-xs text-gray-500 mt-1">{order.description}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={order.status}
                    onChange={e => updateOrderStatus(order._id!, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 focus:outline-none transition-colors duration-200
                      ${order.status === 'completed' 
                        ? 'bg-green-200 text-green-900 border-green-500' 
                        : order.status === 'paid'
                        ? 'bg-orange-200 text-orange-900 border-orange-500'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-400'
                      }`}
                    style={{ minWidth: 110, cursor: order.status === 'completed' ? 'not-allowed' : 'pointer' }}
                    disabled={order.status === 'completed'}
                  >
                    <option value="pending" className="bg-yellow-100 text-yellow-800">Pending</option>
                    <option value="preparing" className="bg-blue-100 text-blue-800">Preparing</option>
                    <option value="ready" className="bg-green-100 text-green-800">Ready</option>
                    <option value="served" className="bg-purple-100 text-purple-800">Served</option>
                    <option value="paid" className="bg-orange-100 text-orange-800">Paid</option>
                    <option value="completed" className="bg-green-200 text-green-900">Completed</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(order.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-lg text-gray-900">
                    ₹{order.totalAmount.toFixed(2)}
                  </div>
                  {order.gstAmount && order.gstAmount > 0 && (
                    <div className="text-xs text-gray-500">
                      GST: ₹{order.gstAmount.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintBill(order)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Print Bill"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {/* Removed download button as requested */}
                    {order.status === 'completed' && (
                      <button
                        onClick={() => resetTableStatus(order.tableId)}
                        className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        title="Reset Table"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No orders found</div>
          {filterTable !== 'all' && (
            <button
              onClick={() => setFilterTable('all')}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              View all orders
            </button>
          )}
        </div>
      )}

      {/* Bill Receipt Modal */}
      {showBillReceipt && selectedOrder && (
        <BillReceipt
          order={selectedOrder}
          table={{
            _id: selectedOrder.tableId,
            tableNumber: selectedOrder.tableNumber || '',
            status: selectedOrder.status,
            gstEnabled: (function(){
              const desc = selectedOrder?.description || '';
              const m = desc.match(/GST\((\d+(?:\.\d+)?)%\)/i);
              const perc = m ? parseFloat(m[1]) : (selectedOrder.gstPercentage || 0);
              return perc > 0;
            })(),
            gstPercentage: (function(){
              const desc = selectedOrder?.description || '';
              const m = desc.match(/GST\((\d+(?:\.\d+)?)%\)/i);
              return m ? parseFloat(m[1]) : (selectedOrder.gstPercentage || 0);
            })()
          }}
          gstEnabled={(function(){
            const desc = selectedOrder?.description || '';
            const m = desc.match(/GST\((\d+(?:\.\d+)?)%\)/i);
            const perc = m ? parseFloat(m[1]) : (selectedOrder.gstPercentage || 0);
            return perc > 0;
          })()}
          gstPercentage={(function(){
            const desc = selectedOrder?.description || '';
            const m = desc.match(/GST\((\d+(?:\.\d+)?)%\)/i);
            return m ? parseFloat(m[1]) : (selectedOrder.gstPercentage || 0);
          })()}
          discount={(function(){
            const desc = selectedOrder?.description || '';
            const m = desc.match(/Discount:\s*₹?\s*([0-9]+(?:\.[0-9]+)?)/i);
            return m ? parseFloat(m[1]) : 0;
          })()}
          onClose={() => {
            setShowBillReceipt(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* New Order Notification */}
      <NewOrderNotification
        isVisible={showNewOrderNotification}
        onClose={() => setShowNewOrderNotification(false)}
        orderData={newOrderData}
      />
    </div>
  );
}

export default OrderList; 