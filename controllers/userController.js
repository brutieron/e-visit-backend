// controllers/userController.js

const User = require('../models/User'); // Your existing User model
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Assuming you use this for direct updates

// @desc    Get the logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    // We already have the user's basic info from the `protect` middleware
    // Our updated User.findById now automatically includes the favorite businesses list.
    const user = await User.findById(req.user.id);

    if (user) {
        res.json({ user });
    } else {
        res.status(404).json({ error: 'User not found.' });
    }
};

// @desc    Update the logged-in user's profile information
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    user.name = req.body.name || user.name;
    user.surname = req.body.surname || user.surname;

    try {
        await db.query(
            'UPDATE users SET name = ?, surname = ? WHERE id = ?',
            [user.name, user.surname, req.user.id]
        );
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};

// @desc    Change the logged-in user's password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Please provide both current and new passwords.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    const user = await User.findByIdWithPassword(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password.' });
    }
    try {
        await User.updatePassword(user.email, newPassword);
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
};

// @desc    Delete the logged-in user's account
// @route   DELETE /api/users/profile
// @access  Private
exports.deleteAccount = async (req, res) => {
    try {
        const success = await User.delete(req.user.id);
        if (success) {
            res.json({ message: 'Your account has been successfully deleted.' });
        } else {
            res.status(404).json({ error: 'User not found or could not be deleted.' });
        }
    } catch (err) {
        console.error('Delete Account Error:', err);
        res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
    }
};


// ==========================================================
//  NEW FAVORITES CONTROLLER FUNCTION
// ==========================================================
/**
 * @desc    Toggle a business in the logged-in user's favorites list.
 * @route   POST /api/users/favorites/toggle/:businessId
 * @access  Private
 */
exports.toggleFavoriteBusiness = async (req, res) => {
    const { businessId } = req.params;
    const userId = req.user.id; // Comes from the 'protect' middleware

    // Validate input
    if (!businessId || isNaN(parseInt(businessId, 10))) {
        return res.status(400).json({ error: 'A valid business ID is required.' });
    }

    try {
        // 1. Check if the business is already favorited using our new model function
        const isFavorited = await User.isFavorited(userId, businessId);
        let message = '';

        // 2. Add or remove it from the favorites table
        if (isFavorited) {
            await User.removeFavorite(userId, businessId);
            message = 'Business removed from favorites.';
        } else {
            await User.addFavorite(userId, businessId);
            message = 'Business added to favorites.';
        }

        // 3. Get the new, complete list of favorite IDs to send back to the frontend
        const updatedFavoriteIds = await User.getFavoriteIds(userId);

        // 4. Send the successful response
        res.status(200).json({
            message: message,
            favoriteBusinesses: updatedFavoriteIds, // The frontend will use this to update its state
        });

    } catch (err) {
        // This could happen if the businessId doesn't exist, causing a foreign key constraint error.
        console.error('Toggle Favorite Error:', err);
        res.status(500).json({ error: 'Failed to update favorites. The business may not exist.' });
    }
};