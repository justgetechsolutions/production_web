const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema); 