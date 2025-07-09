const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// =======================================
//      PUBLIC & USER AUTH ROUTES
// =======================================
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);


// =======================================
//          ADMIN USER MGT ROUTES
// =======================================

// GET all users for the dashboard
router.get('/all-users', protect, authorizeRoles('admin'), authController.getAllUsers);

// POST to create a new user from the admin panel
router.post('/admin-create', protect, authorizeRoles('admin'), authController.createUserAsAdmin);

// PUT to update a user's details by their ID
router.put('/admin-update/:id', protect, authorizeRoles('admin'), authController.updateUserAsAdmin);

// DELETE a user by their ID
router.delete('/admin-delete/:id', protect, authorizeRoles('admin'), authController.deleteUserAsAdmin);


module.exports = router;