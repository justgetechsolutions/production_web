const MenuItem = require('../models/MenuItem');

exports.getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const { name, price, category, imageUrl } = req.body;
    const item = await MenuItem.create({ name, price, category, imageUrl });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, imageUrl } = req.body;
    const item = await MenuItem.findByIdAndUpdate(id, { name, price, category, imageUrl }, { new: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}; 