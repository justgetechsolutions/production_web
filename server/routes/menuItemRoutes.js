const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');
const uploadController = require('../controllers/uploadController');
const multer = require('multer');
const path = require('path');
const attachRestaurant = require('../middleware/attachRestaurant');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.get('/', attachRestaurant, menuItemController.listMenuItems);// Public GET (no auth)
// router.get('/', menuItemController.listMenuItems);
// Auth required for the rest
router.post('/', attachRestaurant, menuItemController.createMenuItem);
router.put('/:id', attachRestaurant, menuItemController.updateMenuItem);
router.delete('/:id', attachRestaurant, menuItemController.deleteMenuItem);

// Inventory management routes
router.post('/inventory/update', attachRestaurant, menuItemController.updateInventory);
router.get('/inventory/low-stock', attachRestaurant, menuItemController.getLowStockItems);

// Image upload
router.post('/upload', attachRestaurant, upload.single('image'), uploadController.uploadImage);

// Public GET for QR code users (no auth)
router.get('/public/:restaurantId', menuItemController.listMenuItemsPublic);

module.exports = router; 