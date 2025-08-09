const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const attachRestaurant = require('../middleware/attachRestaurant');

// POST /api/feedback
// Restrict feedback to current restaurant context
router.post('/', attachRestaurant, feedbackController.createFeedback);
// GET /api/feedback (scoped by restaurant)
router.get('/', attachRestaurant, feedbackController.getFeedback);

module.exports = router; 