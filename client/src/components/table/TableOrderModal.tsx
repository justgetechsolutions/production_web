import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Printer, Download, QrCode, User, Phone, Settings, MessageCircle, ShoppingCart, CheckCircle } from 'lucide-react';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';
import BillReceipt from './BillReceipt.tsx';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  quantity: number;
  lowStockThreshold: number;
}

interface OrderItem {
  menuItem: string;
  name: string;
  price: number;
  quantity: number;
}

interface Table {
  _id: string;
  tableNumber: string;
  status: string;
  gstEnabled: boolean;
  gstPercentage: number;
}

interface TableOrderModalProps {
  table: Table;
  onClose: () => void;
  onOrderPlaced: () => void;
}

const TableOrderModal: React.FC<TableOrderModalProps> = ({ table, onClose, onOrderPlaced }) => {
  const { restaurantId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showBillReceipt, setShowBillReceipt] = useState(false);
  const [showGstSettings, setShowGstSettings] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(table.gstEnabled);
  const [gstPercentage, setGstPercentage] = useState(table.gstPercentage);
  const [error, setError] = useState('');
  const [existingOrder, setExistingOrder] = useState<any>(null);

  useEffect(() => {
    fetchMenuItems();
    if (table.status === 'running') {
      fetchExistingOrder();
    }

    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    // Restore body scrolling when modal closes
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Failed to load menu items');
    }
  };

  const fetchExistingOrder = async () => {
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables/${table._id}/order`);
      if (response.data) {
        setExistingOrder(response.data);
        setCustomerName(response.data.customerName || '');
        setCustomerMobile(response.data.customerMobile || '');
        
        // Convert existing order items to the format we need
        const existingItems = response.data.items.map((item: any) => ({
          menuItem: item.menuItem._id || item.menuItem,
          name: item.menuItem.name || item.name,
          price: item.price,
          quantity: item.quantity
        }));
        setOrderItems(existingItems);
      }
    } catch (error) {
      console.error('Error fetching existing order:', error);
    }
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))];

  // Filter menu items by selected category
  const filteredMenuItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addItemToOrder = (item: MenuItem) => {
    // Check if item is out of stock
    if (item.quantity === 0) {
      alert('This item is out of stock!');
      return;
    }
    
    setOrderItems(prev => {
      const existingItem = prev.find(orderItem => orderItem.menuItem === item._id);
      if (existingItem) {
        // Check if adding one more would exceed available stock
        if (existingItem.quantity >= item.quantity) {
          alert(`Cannot add more. Only ${item.quantity} available in stock.`);
          return prev;
        }
        return prev.map(orderItem =>
          orderItem.menuItem === item._id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        );
      } else {
        return [...prev, {
          menuItem: item._id,
          name: item.name,
          price: item.price,
          quantity: 1
        }];
      }
    });
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.menuItem !== itemId));
    } else {
      // Find the menu item to check available stock
      const menuItem = menuItems.find(item => item._id === itemId);
      if (menuItem && newQuantity > menuItem.quantity) {
        alert(`Cannot add more than ${menuItem.quantity} items. Only ${menuItem.quantity} available in stock.`);
        return;
      }
      
      setOrderItems(prev => prev.map(item =>
        item.menuItem === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateGST = () => {
    if (!gstEnabled) return 0;
    return (calculateSubtotal() * gstPercentage) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const isFormValid = () => {
    return orderItems.length > 0;
  };

  const handlePlaceOrder = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    try {
      const orderData = {
        items: orderItems,
        customerName: customerName || 'Walk-in Customer',
        customerMobile: customerMobile || '',
        totalAmount: calculateTotal(),
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        gstPercentage: gstEnabled ? gstPercentage : 0
      };

      if (existingOrder) {
        // Update existing order
        await apiClient.put(`/api/restaurants/${restaurantId}/orders/${existingOrder._id}`, orderData);
      } else {
        // Create new order
        await apiClient.post(`/api/restaurants/${restaurantId}/tables/${table._id}/order`, orderData);
        
        // Update table status to running
        await apiClient.put(`/api/restaurants/${restaurantId}/tables/${table._id}/status`, {
          status: 'running',
          customerName: customerName || 'Walk-in Customer',
          customerMobile: customerMobile || ''
        });
      }

      onOrderPlaced();
    } catch (error: any) {
      console.error('Error placing order:', error);
      setError(error.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!existingOrder) return;

    setLoading(true);
    try {
      // Update order status to completed
      await apiClient.put(`/api/restaurants/${restaurantId}/orders/${existingOrder._id}`, {
        status: 'completed'
      });

      // Reset table status to blank
      await apiClient.put(`/api/restaurants/${restaurantId}/tables/${table._id}/status`, {
        status: 'blank',
        customerName: '',
        customerMobile: ''
      });

      onOrderPlaced();
    } catch (error: any) {
      console.error('Error completing order:', error);
      setError(error.response?.data?.error || 'Failed to complete order');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = async () => {
    if (orderItems.length === 0) return;
    
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      
      // Format date and time
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB').split('/').join('/');
      };

      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-GB', { 
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
      const billNumber = existingOrder?.billNumber || Math.floor(Math.random() * 10000) + 1;
      const currentDate = existingOrder?.createdAt ? new Date(existingOrder.createdAt) : new Date();
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Bill #${billNumber}`, 20, yPosition);
      yPosition += lineHeight;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Table: ${table.tableNumber}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Date: ${formatDate(currentDate)}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Time: ${formatTime(currentDate)}`, 20, yPosition);
      yPosition += lineHeight;
      pdf.text(`Customer: ${customerName || 'Walk-in Customer'}`, 20, yPosition);
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
      
      orderItems.forEach((item) => {
        const itemText = `${item.name} x${item.quantity} = ₹${item.price * item.quantity}`;
        pdf.text(itemText, 25, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += lineHeight;
      
      // Add totals
      const subtotal = calculateSubtotal();
      const gstAmount = calculateGST();
      const grandTotal = calculateTotal();
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 20, yPosition);
      yPosition += lineHeight;
      
      if (gstEnabled && gstAmount > 0) {
        pdf.text(`GST (${gstPercentage}%): ₹${gstAmount.toFixed(2)}`, 20, yPosition);
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
      pdf.save(`Bill-${billNumber}-Table-${table.tableNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to showing the modal
      const order = {
        _id: existingOrder?._id || 'temp-order',
        billNumber: existingOrder?.billNumber || Math.floor(Math.random() * 10000) + 1,
        items: orderItems,
        totalAmount: calculateTotal(),
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        gstPercentage: gstEnabled ? gstPercentage : 0,
        customerName: customerName || 'Walk-in Customer',
        customerMobile: customerMobile || '',
        createdAt: existingOrder?.createdAt || new Date(),
        status: existingOrder?.status || 'pending'
      };

      setShowBillReceipt(true);
    }
  };

  const handleDownloadQR = async () => {
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables/${table._id}/qr`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `table-${table.tableNumber}-qr.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading QR:', error);
      setError('Failed to download QR code');
    }
  };

  const handleGstSettingsSave = async () => {
    try {
      await apiClient.put(`/api/restaurants/${restaurantId}/tables/${table._id}/status`, {
        gstEnabled,
        gstPercentage
      });
      setShowGstSettings(false);
    } catch (error) {
      console.error('Error updating GST settings:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blank': return 'bg-gray-200 text-gray-700';
      case 'running': return 'bg-blue-200 text-blue-700';
      case 'printed': return 'bg-green-200 text-green-700';
      case 'paid': return 'bg-orange-200 text-orange-700';
      case 'kot_running': return 'bg-yellow-200 text-yellow-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
        <div className="mx-auto mt-10 bg-white rounded-lg shadow-lg max-h-[90vh] w-[90%] max-w-6xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${
                  table.status === 'running' ? 'bg-blue-500' : 
                  table.status === 'printed' ? 'bg-green-500' : 
                  table.status === 'paid' ? 'bg-orange-500' : 'bg-gray-400'
                }`}></div>
                <h2 className="text-xl font-bold text-gray-900">
                  Table {table.tableNumber} - {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                </h2>
                {existingOrder && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Existing Order #{existingOrder.billNumber}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGstSettings(true)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="GST Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="flex h-full">
              {/* Left Panel - Menu Items */}
              <div className="w-2/3 border-r border-gray-200 flex flex-col pr-4">
                {/* Category Tabs */}
                <div className="mb-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === category
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Items' : category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-2 gap-4 overflow-y-auto">
                  {filteredMenuItems.map((item) => {
                    const isOutOfStock = item.quantity === 0;
                    const isLowStock = item.quantity <= item.lowStockThreshold && item.quantity > 0;
                    
                    return (
                      <div
                        key={item._id}
                        onClick={() => !isOutOfStock && addItemToOrder(item)}
                        className={`bg-white border rounded-lg p-4 transition-all duration-200 ${
                          isOutOfStock 
                            ? 'border-red-200 bg-red-50 cursor-not-allowed' 
                            : isLowStock 
                            ? 'border-yellow-200 bg-yellow-50 cursor-pointer hover:shadow-md hover:border-yellow-300'
                            : 'border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <span className="text-lg font-bold text-green-600">₹{item.price}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              isOutOfStock ? 'text-red-600' : 
                              isLowStock ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              Qty: {item.quantity}
                            </span>
                            {isOutOfStock && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Out of Stock
                              </span>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            Threshold: {item.lowStockThreshold}
                          </span>
                          <div className="flex items-center gap-2">
                            {!isOutOfStock ? (
                              <>
                                <span className="text-sm text-blue-600 font-medium">Click to add</span>
                                <Plus className="w-4 h-4 text-blue-600" />
                              </>
                            ) : (
                              <span className="text-sm text-red-600 font-medium">Unavailable</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel - Order Summary */}
              <div className="w-1/3 pl-4 flex flex-col p-4 overflow-y-auto">
                {/* Customer Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No items added yet</p>
                      <p className="text-sm text-gray-400">Click on menu items to add them</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {orderItems.map((item) => (
                        <div
                          key={item.menuItem}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              ₹{item.price} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              ₹{item.price * item.quantity}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  updateItemQuantity(item.menuItem, item.quantity - 1)
                                }
                                className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() =>
                                  updateItemQuantity(item.menuItem, item.quantity + 1)
                                }
                                className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bill Summary */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {gstEnabled && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST ({gstPercentage}%):</span>
                      <span className="font-medium">₹{calculateGST().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  {existingOrder ? (
                    <>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={!isFormValid() || loading}
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Updating...' : 'Update Order'}
                      </button>
                      <button
                        onClick={handleCompleteOrder}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Order
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handlePlaceOrder}
                      disabled={!isFormValid() || loading}
                      className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Placing Order...' : 'Place Order'}
                    </button>
                  )}

                  <button
                    onClick={handlePrintBill}
                    disabled={orderItems.length === 0}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Bill
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GST Settings Modal */}
      {showGstSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">GST Settings</h3>
              <button
                onClick={() => setShowGstSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="gstEnabled"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="gstEnabled" className="text-lg font-medium text-gray-900">
                  Enable GST
                </label>
              </div>
              {gstEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Modal */}
      {showBillReceipt && (
        <BillReceipt
          order={{
            _id: existingOrder?._id || 'temp-order',
            billNumber: existingOrder?.billNumber || Math.floor(Math.random() * 10000) + 1,
            items: orderItems,
            totalAmount: calculateTotal(),
            subtotal: calculateSubtotal(),
            gstAmount: calculateGST(),
            gstPercentage: gstEnabled ? gstPercentage : 0,
            customerName: customerName || 'Walk-in Customer',
            customerMobile: customerMobile || '',
            createdAt: existingOrder?.createdAt || new Date(),
            status: existingOrder?.status || 'pending'
          }}
          table={table}
          gstEnabled={gstEnabled}
          gstPercentage={gstPercentage}
          onClose={() => setShowBillReceipt(false)}
        />
      )}
    </>
  );
};

export default TableOrderModal; 