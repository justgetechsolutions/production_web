const express = require('express');
const router = express.Router();
const staffAuthController = require('../controllers/staffAuthController');

// Staff authentication routes
router.post('/login', staffAuthController.staffLogin);
router.post('/logout', staffAuthController.staffLogout);
router.get('/profile', staffAuthController.verifyStaffToken, staffAuthController.getStaffProfile);

module.exports = router; 