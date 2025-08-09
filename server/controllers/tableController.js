const Table = require('../models/Table');
const Order = require('../models/Order');
const QRCode = require('qrcode');

function resolveFrontendUrl() {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1) Explicit primary env var always wins
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;

  // 2) Try to infer from ALLOWED_ORIGINS with sensible filtering
  if (process.env.ALLOWED_ORIGINS) {
    const candidates = process.env.ALLOWED_ORIGINS
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Helper predicates
    const isLocal = (u) => /localhost|127\.0\.0\.1/i.test(u);
    const isHttp = (u) => /^http:\/\//i.test(u);

    if (isProduction) {
      // Prefer first non-local, preferably https
      const httpsNonLocal = candidates.find((u) => !isLocal(u) && !isHttp(u));
      if (httpsNonLocal) return httpsNonLocal;
      const anyNonLocal = candidates.find((u) => !isLocal(u));
      if (anyNonLocal) return anyNonLocal;
    } else {
      // Development: prefer localhost if present
      const local = candidates.find((u) => isLocal(u));
      if (local) return local;
    }

    // Fallback to first candidate if nothing matched
    if (candidates.length > 0) return candidates[0];
  }

  // 3) Sensible defaults
  if (!isProduction) {
    return process.env.FRONTEND_URL_DEV || 'http://localhost:3000';
  }

  // Fallback: known deployed frontend (replace with your production domain if available)
  return 'https://production-web-kappa.vercel.app';
}

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.restaurantId })
      .populate('currentOrder')
      .sort({ tableNumber: 1 });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    // Use frontend URL instead of server URL for QR codes
    const frontendUrl = resolveFrontendUrl();
    const qrUrl = `${frontendUrl}/r/${req.restaurantId}/menu/${tableNumber}`;
    const table = await Table.create({ 
      restaurantId: req.restaurantId, 
      restaurantSlug: req.restaurantSlug, 
      tableNumber, 
      qrUrl 
    });
    // Optionally generate QR code image data
    const qrImage = await QRCode.toDataURL(qrUrl);
    res.status(201).json({ ...table.toObject(), qrImage });
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

exports.deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const table = await Table.findOneAndDelete({ _id: id, restaurantId: req.restaurantId });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    next(err);
  }
};

exports.updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, customerName, customerMobile, gstEnabled, gstPercentage } = req.body;
    
    const updateData = { status, lastActivity: new Date() };
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerMobile !== undefined) updateData.customerMobile = customerMobile;
    if (gstEnabled !== undefined) updateData.gstEnabled = gstEnabled;
    if (gstPercentage !== undefined) updateData.gstPercentage = gstPercentage;
    
    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId },
      updateData,
      { new: true }
    ).populate('currentOrder');
    
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTableQR = async (req, res) => {
  try {
    const { id } = req.params;
    const table = await Table.findOne({ _id: id, restaurantId: req.restaurantId });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    
    // Use frontend URL instead of server URL for QR codes
    const frontendUrl = resolveFrontendUrl();
    
    // Update QR URL if it's using an old or local format
    let updatedQrUrl = table.qrUrl;
    if (
      table.qrUrl.includes('/r/admin/menu/') ||
      table.qrUrl.includes('/r/undefined/menu/') ||
      table.qrUrl.includes('localhost:5000') ||
      table.qrUrl.includes('localhost:3000') ||
      table.qrUrl.includes('http://localhost:') ||
      table.qrUrl.includes('onrender.com')
    ) {
      updatedQrUrl = `${frontendUrl}/r/${req.restaurantId}/menu/${table.tableNumber}`;
      await Table.findByIdAndUpdate(table._id, { qrUrl: updatedQrUrl });
    }
    
    const qrImage = await QRCode.toDataURL(updatedQrUrl, { width: 300 });
    res.json({ qrImage, qrUrl: updatedQrUrl });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createOrderForTable = async (req, res) => {
  try {
    const { items, customerName, customerMobile, totalAmount, subtotal, gstAmount, gstPercentage } = req.body;
    const { tableId } = req.params;
    
    // Get the next token and bill number
    const lastOrder = await Order.findOne({ restaurantId: req.restaurantId }).sort({ token: -1 });
    const nextToken = (lastOrder?.token || 0) + 1;
    const nextBillNumber = (lastOrder?.billNumber || 0) + 1;
    
    const order = await Order.create({
      restaurantId: req.restaurantId,
      tableId,
      token: nextToken,
      billNumber: nextBillNumber,
      items,
      totalAmount, subtotal, gstAmount, gstPercentage, customerName, customerMobile, status: 'pending'
    });
    
    // Update inventory - deduct quantities
    const MenuItem = require('../models/MenuItem');
    for (const item of items) {
      await MenuItem.findByIdAndUpdate(
        item.menuItem,
        { $inc: { quantity: -item.quantity } }
      );
    }
    
    // Update table status
    await Table.findByIdAndUpdate(tableId, {
      status: 'running',
      currentOrder: order._id,
      customerName: customerName || 'Walk-in Customer',
      customerMobile: customerMobile || '',
      lastActivity: new Date()
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order for table:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.getTableOrder = async (req, res) => {
  try {
    const { tableId } = req.params;
    const order = await Order.findOne({ 
      tableId, 
      restaurantId: req.restaurantId,
      status: { $in: ['pending', 'preparing', 'served'] }
    }).populate('items.menuItem');
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update all tables' QR URLs to use the correct format
exports.updateAllTableQRs = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.restaurantId });
    let updatedCount = 0;
    
    // Use frontend URL instead of server URL for QR codes
    const frontendUrl = resolveFrontendUrl();
    
    for (const table of tables) {
      if (
        table.qrUrl.includes('/r/admin/menu/') ||
        table.qrUrl.includes('/r/undefined/menu/') ||
        table.qrUrl.includes('localhost:5000') ||
        table.qrUrl.includes('localhost:3000') ||
        table.qrUrl.includes('http://localhost:') ||
        table.qrUrl.includes('onrender.com')
      ) {
        const newQrUrl = `${frontendUrl}/r/${req.restaurantId}/menu/${table.tableNumber}`;
        await Table.findByIdAndUpdate(table._id, { qrUrl: newQrUrl });
        updatedCount++;
      }
    }
    
    res.json({ message: `Updated ${updatedCount} table QR URLs` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}; 