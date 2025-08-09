const request = require('supertest');
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const app = require('../index'); // You may need to export the app from index.js

describe('Menu Isolation by restaurantSlug', () => {
  beforeAll(async () => {
    // Connect to test DB if needed
    // await mongoose.connect('mongodb://localhost:27017/qr_ordering_test');
    // Seed test data
    await MenuItem.create([
      { restaurantSlug: 'blue-orchid', name: 'Idli', price: 50 },
      { restaurantSlug: 'blue-orchid', name: 'Dosa', price: 70 },
      { restaurantSlug: 'red-lotus', name: 'Pizza', price: 200 },
    ]);
  });
  afterAll(async () => {
    await MenuItem.deleteMany({});
    // await mongoose.disconnect();
  });
  it('should return only menu items for the given restaurantSlug', async () => {
    const res = await request(app).get('/api/blue-orchid/menu');
    expect(res.statusCode).toBe(200);
    expect(res.body.every(item => item.restaurantSlug === 'blue-orchid')).toBe(true);
    expect(res.body.length).toBe(2);
  });
  it('should not leak menu items from other restaurants', async () => {
    const res = await request(app).get('/api/red-lotus/menu');
    expect(res.statusCode).toBe(200);
    expect(res.body.every(item => item.restaurantSlug === 'red-lotus')).toBe(true);
    expect(res.body.length).toBe(1);
  });
}); 