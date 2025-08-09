const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const attachRestaurant = require('../middleware/attachRestaurant');

router.get('/', attachRestaurant, staffController.getStaff);
router.post('/', attachRestaurant, staffController.createStaff);
router.put('/:id', attachRestaurant, staffController.updateStaff);
router.delete('/:id', attachRestaurant, staffController.deleteStaff);
router.post('/:id/reset-password', attachRestaurant, staffController.resetStaffPassword);

module.exports = router; 