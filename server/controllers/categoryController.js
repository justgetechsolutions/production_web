const Category = require('../models/Category');

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ restaurantId: req.restaurantId });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await Category.create({ name, restaurantId: req.restaurantId });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await Category.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { name }, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndDelete({ _id: id, restaurantId: req.restaurantId });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// Public GET for QR code users (no auth)
exports.listCategoriesPublic = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' });
    const categories = await Category.find({ restaurantId });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}; 