const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  restaurantSlug: { type: String, required: true },
}, { timestamps: true });

userSchema.index({ restaurantId: 1, email: 1 });

module.exports = mongoose.model('User', userSchema); 