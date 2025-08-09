const Feedback = require('../models/Feedback');

// POST /api/feedback
exports.createFeedback = async (req, res) => {
  try {
    const { message, tableNumber, category } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Feedback message is required.' });
    }
    if (!category || !['tech', 'food'].includes(category)) {
      return res.status(400).json({ error: 'Feedback category is required and must be tech or food.' });
    }
    const restaurantId = req.restaurantId || req.params.restaurantId || req.body.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const feedback = await Feedback.create({ message, tableNumber, category, restaurantId });
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/feedback
exports.getFeedback = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || req.params.restaurantId || req.query.restaurantId;
    const filter = restaurantId ? { restaurantId } : {};
    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 