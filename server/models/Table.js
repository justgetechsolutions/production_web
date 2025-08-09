const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  restaurantSlug: { type: String, required: true, index: true },
  tableNumber: { type: String, required: true },
  qrUrl: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['blank', 'running', 'printed', 'paid', 'kot_running'], 
    default: 'blank' 
  },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerName: { type: String, default: '' },
  customerMobile: { type: String, default: '' },
  lastActivity: { type: Date, default: Date.now },
  gstEnabled: { type: Boolean, default: true },
  gstPercentage: { type: Number, default: 5, min: 0, max: 100 }, // Default 5% GST
}, { timestamps: true });

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });
tableSchema.index({ restaurantId: 1, status: 1 });

module.exports = mongoose.model('Table', tableSchema); 