// routes/boostRoutes.js

const express = require('express');
const router = express.Router();
const boostController = require('../controllers/boostController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Route to INITIATE or EXTEND a boost
router.post('/', protect, authorizeRoles('business'), boostController.boostBusiness);

// NEW Route to CANCEL an active boost
router.post('/cancel', protect, authorizeRoles('business'), boostController.cancelBoost);

module.exports = router;