const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const attachRestaurant = require('../middleware/attachRestaurant');

router.get('/', attachRestaurant, tableController.getTables);
router.post('/', attachRestaurant, tableController.createTable);
router.delete('/:id', attachRestaurant, tableController.deleteTable);
router.put('/:id/status', attachRestaurant, tableController.updateTableStatus);
router.get('/:id/qr', attachRestaurant, tableController.getTableQR);
router.post('/:tableId/order', attachRestaurant, tableController.createOrderForTable);
router.get('/:tableId/order', attachRestaurant, tableController.getTableOrder);
router.post('/update-qr-urls', attachRestaurant, tableController.updateAllTableQRs);

module.exports = router; 