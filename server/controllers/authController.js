const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

// Ensure env is loaded; read secret once
const isProd = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && !isProd) {
  JWT_SECRET = 'dev-secret';
  console.warn('[auth] JWT_SECRET missing; using development fallback secret');
}

exports.register = async (req, res) => {
  try {
    const { email, password, restaurantSlug, restaurantName } = req.body;
    if (!email || !password || !restaurantSlug) {
      return res.status(400).json({ error: 'Email, password, and restaurantSlug are required.' });
    }
    let restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) {
      restaurant = await Restaurant.create({ name: restaurantName || restaurantSlug, slug: restaurantSlug });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, restaurantSlug, restaurantId: restaurant._id });
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!User.db?.readyState || User.db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected. Please try again shortly.' });
    }

    const user = await User.findOne({ email }).lean();
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const tokenPayload = {
      userId: user._id,
      email: user.email,
      restaurantSlug: user.restaurantSlug,
      restaurantId: user.restaurantId,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ restaurantSlug: user.restaurantSlug, restaurantId: user.restaurantId });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};