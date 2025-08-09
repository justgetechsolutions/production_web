import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  RefreshCw,
  Bell,
  ChevronDown
} from 'react-feather';
import { io, Socket } from 'socket.io-client';

interface OrderItem {
  menuItem: {
    _id: string;
    name: string;
    description?: string;
  };
  quantity: number;
  price: number;
  name: string;
}

interface Order {
  _id: string;
  token: number;
  billNumber: number;
  tableId: {
    tableNumber: string;
  };
  customerName: string;
  customerMobile: string;
  items: OrderItem[];
  totalAmount: number;
  gstAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed';
  timestamp: string;
  description?: string;
}

interface KitchenStats {
  pending: number;
  preparing: number;
  ready: number;
  served: number;
  completed: number;
  todayOrders: number;
}

const KitchenDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<KitchenStats>({ pending: 0, preparing: 0, ready: 0, served: 0, completed: 0, todayOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newOrderNotification, setNewOrderNotification] = useState(false);
  const [statusDropdowns, setStatusDropdowns] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.status-dropdown')) {
        setStatusDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Check if staff is logged in
    const staffData = document.cookie.includes('kitchenStaff') ? decodeURIComponent((document.cookie.split('; ').find(row => row.startsWith('kitchenStaff=')) || '').split('=')[1] || '') : '';
    if (!staffData) {
      navigate('/kitchen-login');
      return;
    }

    setStaffInfo(JSON.parse(staffData));
    fetchOrders();
    fetchStats();
    setupSocket();
  }, [navigate]);

  const setupSocket = () => {
    const raw = document.cookie.includes('kitchenStaff') ? decodeURIComponent((document.cookie.split('; ').find(row => row.startsWith('kitchenStaff=')) || '').split('=')[1] || '{}') : '{}';
    const staffData = JSON.parse(raw || '{}');
    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Connected to kitchen socket');
      if (staffData.restaurantId) {
        newSocket.emit('joinKitchen', staffData.restaurantId);
        console.log('Joined kitchen room for restaurant:', staffData.restaurantId);
      }
    });

    newSocket.on('newOrderReceived', (data) => {
      console.log('New order received:', data);
      setNewOrderNotification(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      // Clear notification after 5 seconds
      setTimeout(() => setNewOrderNotification(false), 5000);
      fetchOrders(); // Refresh orders
      fetchStats(); // Refresh stats
    });

    newSocket.on('orderStatusUpdated', (data) => {
      console.log('Order status updated:', data);
      fetchOrders(); // Refresh orders
      fetchStats(); // Refresh stats
    });

    newSocket.on('disconnect', () => {
      console.log('Kitchen socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Kitchen socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/kitchen/orders`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/kitchen/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`Order marked as ${status}`);
        fetchOrders();
        fetchStats();
        // Close dropdown
        setStatusDropdowns(prev => ({ ...prev, [orderId]: false }));
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Network error');
    }
  };

  const handleLogout = () => {
    document.cookie = 'kitchenStaff=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    if (socket) {
      socket.disconnect();
    }
    navigate('/kitchen-login');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'served': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'served': return 'Served';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const toggleStatusDropdown = (orderId: string) => {
    setStatusDropdowns(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getCustomerDisplay = (order: Order) => {
    if (order.customerName && order.customerMobile) {
      return `${order.customerName} (${order.customerMobile})`;
    } else if (order.customerName) {
      return order.customerName;
    } else {
      return 'Walk-in Customer';
    }
  };

  const getItemsDisplay = (items: OrderItem[]) => {
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading kitchen dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Audio for notifications */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kitchen Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {staffInfo?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchOrders}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh orders"
              >
                <RefreshCw size={20} />
              </button>
              
              {newOrderNotification && (
                <div className="relative">
                  <Bell size={20} className="text-orange-500 animate-pulse" />
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

              {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Pending</p>
                  <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <AlertCircle size={20} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Preparing</p>
                  <p className="text-lg font-bold text-gray-900">{stats.preparing}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Ready</p>
                  <p className="text-lg font-bold text-gray-900">{stats.ready}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Served</p>
                  <p className="text-lg font-bold text-gray-900">{stats.served}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <CheckCircle size={20} className="text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Completed</p>
                  <p className="text-lg font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
          </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto relative z-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TOKEN/BILL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TABLE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CUSTOMER
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ITEMS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TIME
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-red-600">#{order.token}</div>
                          {order.billNumber && (
                            <div className="text-xs text-gray-500">Bill #{order.billNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Table <span className="font-bold text-blue-600">{order.tableId.tableNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getCustomerDisplay(order)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {getItemsDisplay(order.items)}
                        </div>
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative status-dropdown">
                           <button
                             onClick={() => toggleStatusDropdown(order._id)}
                             className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)} hover:opacity-80 transition-opacity`}
                           >
                             {getStatusText(order.status)}
                             <ChevronDown size={14} className="ml-1" />
                           </button>
                           
                            {statusDropdowns[order._id] && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                               <div className="py-1">
                                 {['pending', 'preparing', 'ready', 'served', 'completed'].map((status) => (
                                   <button
                                     key={status}
                                     onClick={() => updateOrderStatus(order._id, status)}
                                     className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                       order.status === status ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                     }`}
                                   >
                                     {getStatusText(status)}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(order.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ₹{order.totalAmount.toFixed(2)}
                        </div>
                        {order.gstAmount && order.gstAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            GST: ₹{order.gstAmount.toFixed(2)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KitchenDashboard; 