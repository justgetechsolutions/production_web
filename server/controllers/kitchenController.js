const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');

// Get all orders for kitchen staff (filtered by restaurant)
exports.getKitchenOrders = async (req, res) => {
  try {
    console.log('Fetching kitchen orders for restaurant:', req.restaurantId);
    
    const orders = await Order.find({ 
      restaurantId: req.restaurantId
    })
    .populate('items.menuItem', 'name description')
    .populate('tableId', 'tableNumber')
    .sort({ timestamp: -1 });

    console.log(`Found ${orders.length} orders for kitchen`);
    
    res.json(orders);
  } catch (err) {
    console.error('Get kitchen orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update order status (kitchen staff can update to preparing/ready)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    console.log('Kitchen updating order status:', { orderId, status, restaurantId: req.restaurantId });

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, restaurantId: req.restaurantId },
      { 
        status,
        description: notes
      },
      { new: true }
    )
    .populate('items.menuItem', 'name description')
    .populate('tableId', 'tableNumber');

    if (!order) {
      console.log('Order not found:', { orderId, restaurantId: req.restaurantId });
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('Order status updated successfully:', { orderId: order._id, status: order.status });

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.to(`restaurant_${req.restaurantId}`).emit('orderStatusUpdated', {
        orderId: order._id,
        status: order.status,
        updatedBy: req.staffId,
        timestamp: new Date()
      });
      req.io.to(`kitchen_${req.restaurantId}`).emit('orderStatusUpdated', {
        orderId: order._id,
        status: order.status,
        updatedBy: req.staffId,
        timestamp: new Date()
      });
      console.log('Socket events emitted for order status update');
    }

    res.json(order);
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order details for kitchen
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ 
      _id: orderId, 
      restaurantId: req.restaurantId 
    })
    .populate('items.menuItem', 'name description category')
    .populate('tableId', 'tableNumber');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Get order details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get kitchen dashboard stats
exports.getKitchenStats = async (req, res) => {
  try {
    const pendingCount = await Order.countDocuments({ 
      restaurantId: req.restaurantId, 
      status: 'pending' 
    });
    
    const preparingCount = await Order.countDocuments({ 
      restaurantId: req.restaurantId, 
      status: 'preparing' 
    });

    const readyCount = await Order.countDocuments({ 
      restaurantId: req.restaurantId, 
      status: 'ready' 
    });

    const servedCount = await Order.countDocuments({ 
      restaurantId: req.restaurantId, 
      status: 'served' 
    });

    const completedCount = await Order.countDocuments({ 
      restaurantId: req.restaurantId, 
      status: 'completed' 
    });

    const todayOrders = await Order.countDocuments({
      restaurantId: req.restaurantId,
      createdAt: { 
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    res.json({
      pending: pendingCount,
      preparing: preparingCount,
      ready: readyCount,
      served: servedCount,
      completed: completedCount,
      todayOrders
    });
  } catch (err) {
    console.error('Get kitchen stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark order as ready
exports.markOrderReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOneAndUpdate(
      { _id: orderId, restaurantId: req.restaurantId },
      { 
        status: 'ready'
      },
      { new: true }
    )
    .populate('items.menuItem', 'name description')
    .populate('tableId', 'tableNumber');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Emit socket event
    if (req.io) {
      req.io.to(`restaurant_${req.restaurantId}`).emit('orderReady', {
        orderId: order._id,
        tableNumber: order.tableId?.tableNumber,
        readyAt: order.readyAt
      });
    }

    res.json(order);
  } catch (err) {
    console.error('Mark order ready error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}; 