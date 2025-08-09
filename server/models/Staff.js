const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true }, // For kitchen staff authentication
  role: { 
    type: String, 
    enum: ['admin', 'kitchen', 'waiter', 'cashier'], 
    default: 'kitchen' 
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

staffSchema.index({ restaurantId: 1, email: 1 });
staffSchema.index({ restaurantId: 1, role: 1 });

// Hash password before saving
staffSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
staffSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema); 