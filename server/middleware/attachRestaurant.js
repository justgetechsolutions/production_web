const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set. Set it in your environment for production.');
}

module.exports = async function attachRestaurant(req, res, next) {
  try {
    // Prefer httpOnly cookie in production; support Authorization header as fallback
    let token = req.cookies && req.cookies.token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.restaurantId = decoded.restaurantId;
    req.restaurantSlug = decoded.restaurantSlug;

    // Get restaurantId from params (for all routes using :restaurantId)
    const paramRestaurantId = req.params.restaurantId;
    if (paramRestaurantId && String(paramRestaurantId) !== String(req.restaurantId)) {
      // Only allow access if the authenticated user belongs to this restaurant
      return res.status(403).json({ error: 'Forbidden: You do not have access to this restaurant.' });
    }
    // Optionally, attach the restaurant document for downstream use
    if (paramRestaurantId) {
      const restaurant = await Restaurant.findById(paramRestaurantId);
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
      req.restaurant = restaurant;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}; 