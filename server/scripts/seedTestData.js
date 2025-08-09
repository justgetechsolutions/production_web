const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Restaurant = require('../models/Restaurant');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/qr_ordering';

async function seed() {
  await mongoose.connect(MONGO_URI);
  await MenuItem.deleteMany({});
  await Table.deleteMany({});
  await User.deleteMany({});

  // Seed two restaurants
  const restaurants = [
    { slug: 'blue-orchid', name: 'Blue Orchid', email: 'admin@blueorchid.com', password: 'password' },
    { slug: 'red-lotus', name: 'Red Lotus', email: 'admin@redlotus.com', password: 'password' },
  ];

  for (const r of restaurants) {
    // Create restaurant
    const restaurant = await Restaurant.create({ name: r.name, slug: r.slug });
    // Create user
    await User.create({ email: r.email, password: r.password, restaurantSlug: r.slug, restaurantId: restaurant._id });
    // Create table
    await Table.create({ restaurantSlug: r.slug, restaurantId: restaurant._id, tableNumber: '5', qrUrl: `https://yourapp.com/r/${restaurant._id}/menu/5` });
    // Create menu items
    await MenuItem.create({ restaurantSlug: r.slug, restaurantId: restaurant._id, name: 'Idli', price: 50 });
    await MenuItem.create({ restaurantSlug: r.slug, restaurantId: restaurant._id, name: 'Dosa', price: 70 });
    // Optionally, create staff
    if (Staff) await Staff.create({ restaurantId: restaurant._id, name: 'Manager', email: `manager@${r.slug}.com`, phone: '1234567890', role: 'manager' });
  }
  console.log('Seeded test data for multi-tenant QR ordering.');
  await mongoose.disconnect();
}

seed(); 