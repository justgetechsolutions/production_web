const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const attachRestaurant = require('../middleware/attachRestaurant');

router.get('/:restaurantId', attachRestaurant, categoryController.listCategories);
router.post('/:restaurantId', attachRestaurant, categoryController.createCategory);
router.put('/:restaurantId/:id', attachRestaurant, categoryController.updateCategory);
router.delete('/:restaurantId/:id', attachRestaurant, categoryController.deleteCategory);
// Public GET for QR code users (no auth)
router.get('/public/:restaurantId', categoryController.listCategoriesPublic);

module.exports = router; 