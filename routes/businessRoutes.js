// routes/businessRoutes.js

const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// =======================================
//          PUBLIC ROUTES (NO AUTH)
// =======================================

// This route gets all publicly visible businesses, with optional filters
router.get('/public', businessController.getPublicBusinesses);

// --- ✅ NEW ROUTE ADDED HERE ---
// This route gets a specific list of businesses based on an array of IDs sent in the body.
// It's used for the "My Favorites" page.
router.post('/by-ids', businessController.getBusinessesByIds);


// =======================================
//      BUSINESS-OWNER ROUTES (AUTH)
// =======================================
router.post('/create', protect, authorizeRoles('business'), businessController.createBusiness);
router.get('/my', protect, authorizeRoles('business'), businessController.getMyBusiness);
router.put('/edit/:id', protect, authorizeRoles('business'), businessController.editBusiness);
router.delete('/my/delete', protect, authorizeRoles('business'), businessController.deleteMyBusiness);


// =======================================
//          ADMIN ROUTES (ADMIN AUTH)
// =======================================
router.get('/all', protect, authorizeRoles('admin'), businessController.getAllBusinesses);
router.post('/admin-create', protect, authorizeRoles('admin'), businessController.createBusinessAsAdmin);
router.put('/admin-edit/:id', protect, authorizeRoles('admin'), businessController.editBusinessAsAdmin);
router.delete('/delete/:id', protect, authorizeRoles('admin'), businessController.deleteBusiness);

module.exports = router;