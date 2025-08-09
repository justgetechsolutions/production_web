const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Chat with MenuBot
router.post('/chat', chatbotController.chat);

// Get chat history
router.get('/history', chatbotController.getChatHistory);

// Add item to cart via chatbot
router.post('/add-to-cart', chatbotController.addToCart);

module.exports = router; 