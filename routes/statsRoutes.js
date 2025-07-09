const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// This route is protected and only accessible by admins
router.get('/admin', protect, authorizeRoles('admin'), statsController.getAdminDashboardStats);

module.exports = router;