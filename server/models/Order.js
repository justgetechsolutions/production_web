const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  restaurantSlug: { type: String, index: true }, // Made optional
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  token: { type: Number, required: true, index: true }, // Sequential token number
  billNumber: { type: Number, required: true, index: true }, // Sequential bill number
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Price at time of order
    name: { type: String, required: true }, // Item name at time of order
  }],
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'paid'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
  description: { type: String },
  feedback: { type: String, default: "" },
  customerName: { type: String, default: '' },
  customerMobile: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'split'], default: 'cash' },
  paymentDetails: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
  },
  cashier: { type: String, default: 'admin' },
}, { timestamps: true });

orderSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, token: 1 }); // Index for token lookup
orderSchema.index({ restaurantId: 1, billNumber: 1 }); // Index for bill number lookup

module.exports = mongoose.model('Order', orderSchema); 