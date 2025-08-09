const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['tech', 'food'], required: true },
  tableNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', feedbackSchema); 