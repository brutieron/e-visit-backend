// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    changePassword,
    deleteAccount,
    toggleFavoriteBusiness // <-- Import the new controller function
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware'); // Your existing security middleware

// All routes in this file are for the currently logged-in user.
// The `protect` middleware ensures we have `req.user` available.

// Route for getting and updating the user's main profile info
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, deleteAccount);

// A dedicated route for the sensitive password change action
router.put('/change-password', protect, changePassword);

// --- NEW ROUTE FOR FAVORITES ---
// This route will handle adding or removing a business from the user's favorites.
// It's a POST request because it modifies data on the server.
router.post('/favorites/toggle/:businessId', protect, toggleFavoriteBusiness);


module.exports = router;