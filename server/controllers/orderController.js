const Order = require('../models/Order');
const mongoose = require('mongoose');
const Table = require('../models/Table');
const { generateOrderToken } = require('../utils/db');

exports.getOrders = async (req, res) => {
  try {
    const { tableId, tableNumber, date, startDate, endDate } = req.query;
    const filter = { restaurantId: req.restaurantId };
    
    // Filter by tableId (ObjectId)
    if (tableId) filter.tableId = tableId;
    
    // Filter by tableNumber (string)
    if (tableNumber) {
      const table = await Table.findOne({ tableNumber, restaurantId: req.restaurantId });
      if (table) {
        filter.tableId = table._id;
      }
    }
    
    // Filter by specific date (YYYY-MM-DD format)
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.timestamp = { $gte: startDate, $lt: endDate };
    }
    
    // Filter by date range (YYYY-MM-DD format)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the end date
      filter.timestamp = { $gte: start, $lt: end };
    }
    
    const orders = await Order.find(filter)
      .populate('items.menuItem')
      .populate({ path: 'tableId', select: 'tableNumber' })
      .sort({ timestamp: -1 });
      
    // Map tableId to tableNumber in the response
    const ordersWithTableNumber = orders.map(order => {
      const o = order.toObject();
      o.tableNumber = o.tableId?.tableNumber || o.tableId;
      return o;
    });
    
    res.json(ordersWithTableNumber);
  } catch (err) {
    console.error('Error in getOrders:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    let { tableId, items, totalAmount } = req.body;
    // If tableId is not a valid ObjectId, treat it as tableNumber and look up the Table
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      const table = await Table.findOne({ tableNumber: tableId, restaurantId: req.restaurantId });
      if (!table) {
        return res.status(400).json({ error: 'Invalid table number' });
      }
      tableId = table._id;
    }
    
    // Generate sequential token for this order
    const token = await generateOrderToken(req.restaurantId);
    
    const order = await Order.create({ 
      restaurantId: req.restaurantId, 
      tableId, 
      token,
      items, 
      totalAmount, 
      status: 'pending', 
      timestamp: new Date() 
    });
    // Emit socket.io event for real-time updates
    if (req.io) {
      req.io.to(`restaurant_${req.restaurantId}`).emit('newOrderReceived', {
        orderId: order._id,
        restaurantId: req.restaurantId,
        tableId: order.tableId,
        status: order.status,
        timestamp: order.timestamp
      });
      req.io.to(`kitchen_${req.restaurantId}`).emit('newOrderReceived', {
        orderId: order._id,
        restaurantId: req.restaurantId,
        tableId: order.tableId,
        status: order.status,
        timestamp: order.timestamp
      });
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Emit socket.io event for real-time updates
    if (req.io) {
      req.io.to(`restaurant_${req.restaurantId}`).emit('orderStatusUpdated', {
        orderId: order._id,
        restaurantId: req.restaurantId,
        status: order.status,
        timestamp: new Date()
      });
      req.io.to(`kitchen_${req.restaurantId}`).emit('orderStatusUpdated', {
        orderId: order._id,
        restaurantId: req.restaurantId,
        status: order.status,
        timestamp: new Date()
      });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'all', month } = req.query;
    const now = new Date();
    let start;
    
    if (month) {
      // For calendar view - specific month
      const [year, monthNum] = month.split('-').map(Number);
      start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 0);
      const match = { 
        restaurantId: req.restaurantId, 
        timestamp: { $gte: start, $lte: end } 
      };
      const orders = await Order.find(match);
      
      // Group by day
      const dailyRevenue = {};
      orders.forEach(order => {
        const day = new Date(order.timestamp).getDate();
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (order.totalAmount || 0);
      });
      
      return res.json(dailyRevenue);
    }
    
    if (period === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
    }
    const match = start ? { restaurantId: req.restaurantId, timestamp: { $gte: start } } : { restaurantId: req.restaurantId };
    const orders = await Order.find(match).populate('items.menuItem');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const completionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;
    // Top-selling items
    const itemMap = {};
    orders.forEach(order => {
      order.items.forEach(i => {
        const name = i.menuItem?.name || 'Unknown';
        itemMap[name] = (itemMap[name] || 0) + i.quantity;
      });
    });
    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
    // Active customers (unique tableId count)
    const activeCustomers = new Set(orders.map(o => o.tableId?.toString())).size;
    res.json({ totalRevenue, totalOrders, completionRate, topItems, activeCustomers });
  } catch (err) {
    res.status(500).json({ error: 'Analytics error' });
  }
};

// Public order creation for QR code users (no auth)
exports.createOrderPublic = async (req, res) => {
  try {
    let { tableId, items, totalAmount, description } = req.body;
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' });
    // If tableId is not a valid ObjectId, treat it as tableNumber and look up the Table
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      const table = await Table.findOne({ tableNumber: tableId, restaurantId });
      if (!table) {
        return res.status(400).json({ error: 'Invalid table number' });
      }
      tableId = table._id;
    }
    
    // Generate sequential token and bill number for this order
    const token = await generateOrderToken(restaurantId);
    const lastOrder = await Order.findOne({ restaurantId }).sort({ billNumber: -1 });
    const billNumber = (lastOrder?.billNumber || 0) + 1;
    
    const order = await Order.create({ 
      restaurantId, 
      tableId, 
      token,
      billNumber,
      items, 
      totalAmount, 
      description, 
      status: 'pending', 
      timestamp: new Date() 
    });
    // Emit socket.io event to restaurantId room
    const io = req.app.get('io');
    if (io) io.to(String(restaurantId)).emit('orderCreated', order);
    console.log('Order created with _id:', order._id);
    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Public order creation for QR code users (no auth) with explicit restaurantId in URL
exports.createOrderPublicWithId = async (req, res) => {
  try {
    console.log('Creating order with params:', req.params);
    console.log('Request body:', req.body);
    
    let { tableId, items, totalAmount, description } = req.body;
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' });

    // Fetch restaurant to get slug
    const restaurant = await require('../models/Restaurant').findById(restaurantId);
    if (!restaurant) return res.status(400).json({ error: 'Invalid restaurantId' });

    // If tableId is not a valid ObjectId, treat it as tableNumber and look up the Table
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      const table = await Table.findOne({ tableNumber: tableId, restaurantId });
      if (!table) {
        return res.status(400).json({ error: 'Invalid table number' });
      }
      tableId = table._id;
    }
    
    console.log('Generating token for restaurantId:', restaurantId);
    // Generate sequential token and bill number for this order
    const token = await generateOrderToken(restaurantId);
    const lastOrder = await Order.findOne({ restaurantId }).sort({ billNumber: -1 });
    const billNumber = (lastOrder?.billNumber || 0) + 1;
    console.log('Generated token:', token, 'billNumber:', billNumber);
    
    const orderData = {
      restaurantId,
      restaurantSlug: restaurant.slug,
      tableId,
      token,
      billNumber,
      items,
      totalAmount,
      description,
      status: 'pending',
      timestamp: new Date()
    };
    
    console.log('Creating order with data:', orderData);
    const order = await Order.create(orderData);
    console.log('Order created with _id:', order._id);
    
    // Emit socket.io event to restaurantId room
    const io = req.app.get('io');
    if (io) io.to(String(restaurantId)).emit('orderCreated', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('Error in createOrderPublicWithId:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Add feedback to an order
exports.addFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
    const { orderId } = req.params;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { feedback },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 

// Get a single order by ID (for order status page)
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching order by id:', id);
    const order = await Order.findById(id).populate('items.menuItem').populate({ path: 'tableId', select: 'tableNumber' });
    console.log('Order found:', order);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Attach tableNumber for convenience
    const o = order.toObject();
    o.tableNumber = o.tableId?.tableNumber || o.tableId;
    res.json(o);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Place order for POS dashboard
exports.placeOrder = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { items, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }
    const MenuItem = require('../models/MenuItem');
    const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.id) } });
    const orderItems = items.map(i => {
      const menuItem = menuItems.find(m => m._id.toString() === i.id);
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        qty: i.qty,
        amount: menuItem.price * i.qty
      };
    });
    const total = orderItems.reduce((sum, i) => sum + i.amount, 0);
    const order = new Order({
      restaurantId,
      items: orderItems,
      totalAmount: total,
      paymentMethod,
      createdAt: new Date()
    });
    await order.save();
    
    // Update inventory - deduct quantities
    for (const item of orderItems) {
      await MenuItem.findByIdAndUpdate(
        item.menuItem,
        { $inc: { quantity: -item.qty } }
      );
    }
    
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Revenue by month for calendar view
exports.getRevenueByMonth = async (req, res) => {
  try {
    const { month } = req.query; // format YYYY-MM
    const start = new Date(month + '-01');
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const orders = await Order.find({ createdAt: { $gte: start, $lt: end } });
    const revenue = {};
    orders.forEach(order => {
      const day = order.createdAt.getDate();
      revenue[day] = (revenue[day] || 0) + (order.totalAmount || order.total);
    });
    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};