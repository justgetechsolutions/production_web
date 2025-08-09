const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { verifyStaffToken, requireRole } = require('../controllers/staffAuthController');

// Apply authentication middleware to all kitchen routes
router.use(verifyStaffToken);
router.use(requireRole(['kitchen', 'admin']));

// Kitchen dashboard routes
router.get('/orders', kitchenController.getKitchenOrders);
router.get('/orders/:orderId', kitchenController.getOrderDetails);
router.put('/orders/:orderId/status', kitchenController.updateOrderStatus);
router.put('/orders/:orderId/ready', kitchenController.markOrderReady);
router.get('/stats', kitchenController.getKitchenStats);

module.exports = router; 