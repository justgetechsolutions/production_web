const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const attachRestaurant = require('../middleware/attachRestaurant');

router.post('/send-bill', attachRestaurant, whatsappController.sendBill);

module.exports = router; 