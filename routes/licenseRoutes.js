// routes/licenseRoutes.js

const express = require('express');
const router = express.Router();
const { getMyLicenseStatus } = require('../controllers/licenseController');
const { protect } = require('../middlewares/authMiddleware'); // Your security middleware

// This sets up the GET /api/license/status route
router.get('/status', protect, getMyLicenseStatus);

module.exports = router;