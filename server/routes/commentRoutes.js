const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Create a comment (public or authenticated)
router.post('/', commentController.createComment);

// Get comment count for a menu item
router.get('/count/:menuItemId', commentController.getCommentCount);

// Get comment eligibility for a menu item
router.get('/eligibility/:menuItemId', commentController.checkEligibility);

// Get comments for a menu item (with optional sorting)
router.get('/:menuItemId', commentController.getCommentsForMenuItem);

module.exports = router; 