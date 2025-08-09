const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  restaurantSlug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  imageUrl: { type: String },
  quantity: { type: Number, default: 100, min: 0 }, // Inventory quantity
  lowStockThreshold: { type: Number, default: 50, min: 0 }, // Threshold for low stock warning
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, name: 1 });
menuItemSchema.index({ restaurantSlug: 1, name: 1 });
menuItemSchema.index({ restaurantId: 1, quantity: 1 }); // Index for sorting by quantity

module.exports = mongoose.model('MenuItem', menuItemSchema); 