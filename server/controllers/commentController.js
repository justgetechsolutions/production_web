const Comment = require('../models/Comment');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Utility to extract user from JWT (cookie or header)
function getUserFromRequest(req) {
  let token = req.cookies?.token || req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) token = token.slice(7);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// POST /comments
exports.createComment = async (req, res) => {
  try {
    // Allow anonymous comments for public menu
    const user = getUserFromRequest(req);
    const { menuItemId, text, nickname, restaurantId, rating } = req.body;
    if (!menuItemId || !text || !text.trim()) {
      return res.status(400).json({ error: 'menuItemId and text are required.' });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating (1-5) is required.' });
    }
    let menuItemObjectId;
    try {
      menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);
    } catch {
      menuItemObjectId = menuItemId;
    }
    // Optionally associate with order/user if available
    let order = null;
    if (user) {
      order = await Order.findOne({ 'items.menuItem': menuItemObjectId, userId: user.userId });
    }
    const comment = await Comment.create({
      userId: user ? user.userId : undefined,
      menuItemId: menuItemObjectId,
      orderId: order ? order._id : undefined,
      text,
      nickname,
      restaurantId: restaurantId ? new mongoose.Types.ObjectId(restaurantId) : undefined,
      rating,
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /comments/:menuItemId?sort=newest|oldest|helpful
exports.getCommentsForMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    let menuItemObjectId;
    try {
      menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);
    } catch {
      // fallback: allow string id for non-ObjectId menu items
      menuItemObjectId = menuItemId;
    }
    let sort = { createdAt: -1 };
    if (req.query.sort === 'helpful') sort = { helpfulCount: -1, createdAt: -1 };
    if (req.query.sort === 'oldest') sort = { createdAt: 1 };
    const comments = await Comment.find({ menuItemId: menuItemObjectId }).sort(sort).populate('userId', 'email');
    // Always return an array, even if empty
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /comments/count/:menuItemId
exports.getCommentCount = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    let menuItemObjectId;
    try {
      menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);
    } catch {
      menuItemObjectId = menuItemId;
    }
    const count = await Comment.countDocuments({ menuItemId: menuItemObjectId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /comments/eligibility/:menuItemId
exports.checkEligibility = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ eligible: false });
    const { menuItemId } = req.params;
    let menuItemObjectId;
    try {
      menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);
    } catch {
      menuItemObjectId = menuItemId;
    }
    const order = await Order.findOne({
      'items.menuItem': menuItemObjectId,
      userId: user.userId,
    });
    res.json({ eligible: !!order });
  } catch (err) {
    res.status(500).json({ eligible: false });
  }
}; 