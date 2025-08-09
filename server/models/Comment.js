const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  text: { type: String, required: true },
  nickname: { type: String },
  helpfulCount: { type: Number, default: 0 },
  rating: { type: Number, min: 1, max: 5, required: true },
  createdAt: { type: Date, default: Date.now },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: false },
}, { timestamps: true });

commentSchema.index({ menuItemId: 1, createdAt: -1 });
commentSchema.index({ menuItemId: 1, helpfulCount: -1 });

module.exports = mongoose.model('Comment', commentSchema); 