const MenuItem = require('../models/MenuItem');

exports.listMenuItems = async (req, res, next) => {
  try {
    // Sort by quantity (lowest first) to show low stock items at top
    const items = await MenuItem.find({ restaurantId: req.restaurantId })
      .sort({ quantity: 1, name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    console.log('CreateMenuItem:', req.restaurantId, req.restaurantSlug, req.body);
    const { name, price, imageUrl, category, quantity, lowStockThreshold } = req.body;
    const item = await MenuItem.create({
      restaurantId: req.restaurantId,
      restaurantSlug: req.restaurantSlug,
      name,
      price,
      imageUrl,
      category,
      quantity: quantity || 100,
      lowStockThreshold: lowStockThreshold || 50
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, categoryId, quantity, lowStockThreshold } = req.body;
    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId },
      { name, description, price, imageUrl, categoryId, quantity, lowStockThreshold },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findOneAndDelete({ _id: id, restaurantId: req.restaurantId });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
};

// Update inventory quantity when order is placed
exports.updateInventory = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { menuItemId, quantity }
    
    for (const item of items) {
      await MenuItem.findOneAndUpdate(
        { _id: item.menuItemId, restaurantId: req.restaurantId },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }
    
    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    next(err);
  }
};

// Get low stock items
exports.getLowStockItems = async (req, res, next) => {
  try {
    const items = await MenuItem.find({ 
      restaurantId: req.restaurantId,
      quantity: { $lte: '$lowStockThreshold' }
    }).sort({ quantity: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// Public menu list for QR code users (no auth)
exports.listMenuItemsPublic = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' });
    const items = await MenuItem.find({ restaurantId }).sort({ quantity: 1, name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
}; 