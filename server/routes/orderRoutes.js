const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const attachRestaurant = require('../middleware/attachRestaurant');

router.get('/', attachRestaurant, orderController.getOrders);
router.post('/', attachRestaurant, orderController.createOrder);
router.get('/analytics', attachRestaurant, orderController.getAnalytics);
// Public POST for QR code users (no auth)
router.post('/public', orderController.createOrderPublic);
router.post('/public/:restaurantId', orderController.createOrderPublicWithId);

// Add feedback to an order
router.post('/:orderId/feedback', orderController.addFeedback);

// These routes should come after the more specific routes
router.put('/:id', attachRestaurant, orderController.updateOrderStatus);
router.get('/:id', orderController.getOrderById);

// Place order (POS dashboard)
router.post('/place/:restaurantId', orderController.placeOrder);

// Get revenue by month (calendar view)
router.get('/revenue', orderController.getRevenueByMonth);

module.exports = router;