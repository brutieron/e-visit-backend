// models/User.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    // ==========================================================
    //  FINDER METHODS (For retrieving user data)
    // ==========================================================

    // Finds a user by ID, and now INCLUDES their favorite business IDs.
    findById: async (id) => {
        const [userRows] = await db.query('SELECT id, name, surname, email, role, is_verified, coin_balance, created_at FROM users WHERE id = ?', [id]);
        if (!userRows[0]) {
            return null; // Return null if no user is found
        }
        
        const user = userRows[0];

        // Fetch the user's favorite business IDs and attach them to the user object
        const favoriteIds = await User.getFavoriteIds(user.id);
        user.favoriteBusinesses = favoriteIds; // The frontend will use this array

        return user;
    },

    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT id, name, surname, email, role, is_verified, coin_balance, created_at FROM users WHERE email = ?', [email]);
        return rows[0];
    },
    findByEmailWithPassword: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },
    findByIdWithPassword: async (id) => {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    },
    findAll: async () => {
        const [rows] = await db.query('SELECT id, name, surname, email, role, is_verified, coin_balance, created_at FROM users ORDER BY created_at DESC');
        return rows;
    },
    
    // ==========================================================
    //  NEW FAVORITE-RELATED METHODS
    // ==========================================================

    /**
     * Gets an array of all business IDs favorited by a user.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<number[]>} - A promise that resolves to an array of numbers, e.g., [1, 5, 12].
     */
    getFavoriteIds: async (userId) => {
        const [rows] = await db.query(
            'SELECT business_id FROM user_favorites WHERE user_id = ?',
            [userId]
        );
        // We map the result from an array of objects to a simple array of IDs.
        return rows.map(row => row.business_id);
    },

    /**
     * Checks if a specific business is already in a user's favorites.
     * @param {number} userId - The ID of the user.
     * @param {number} businessId - The ID of the business.
     * @returns {Promise<boolean>} - True if it is favorited, false otherwise.
     */
    isFavorited: async (userId, businessId) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ? AND business_id = ?',
            [userId, businessId]
        );
        return rows[0].count > 0;
    },

    /**
     * Adds a business to a user's favorites list.
     * @param {number} userId - The ID of the user.
     * @param {number} businessId - The ID of the business to add.
     * @returns {Promise<boolean>} - True if the row was successfully inserted.
     */
    addFavorite: async (userId, businessId) => {
        const [result] = await db.query(
            'INSERT IGNORE INTO user_favorites (user_id, business_id) VALUES (?, ?)',
            [userId, businessId]
        );
        return result.affectedRows > 0;
    },

    /**
     * Removes a business from a user's favorites list.
     * @param {number} userId - The ID of the user.
     * @param {number} businessId - The ID of the business to remove.
     * @returns {Promise<boolean>} - True if the row was successfully deleted.
     */
    removeFavorite: async (userId, businessId) => {
        const [result] = await db.query(
            'DELETE FROM user_favorites WHERE user_id = ? AND business_id = ?',
            [userId, businessId]
        );
        return result.affectedRows > 0;
    },


    // ==========================================================
    //  EXISTING MUTATION METHODS
    // ==========================================================
    create: async (userData) => {
        const { name, surname, email, phone, birthday, password, role = 'business' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (name, surname, email, phone, birthday, password, role, is_verified, coin_balance) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)',
            [name, surname, email, phone, birthday, hashedPassword, role]
        );
        return result.insertId;
    },
    findOrCreateGoogleUser: async (profile) => {
        const { name, surname, email, googleId } = profile;
        let user = await User.findByEmailWithPassword(email);
        if (user) return user;
        const [result] = await db.query(
            'INSERT INTO users (name, surname, email, google_id, role, is_verified, coin_balance) VALUES (?, ?, ?, ?, "business", 1, 0)',
            [name, surname, email, googleId]
        );
        user = await User.findById(result.insertId);
        return user;
    },
    setVerified: async (email) => {
        const [result] = await db.query('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
        return result.affectedRows > 0;
    },
    updatePassword: async (email, newPassword) => {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        return result.affectedRows > 0;
    },

    // --- THIS IS THE CRITICAL FIX ---
    // This method correctly updates the coin balance in a MySQL database.
    // Your webhookController now calls this method, solving the error.
    addCoins: async (userId, amount) => {
        const [result] = await db.query(
            'UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?',
            [amount, userId]
        );
        return result.affectedRows > 0;
    },
    
    updateAsAdmin: async (id, userData) => {
        const { name, surname, email, role, is_verified } = userData;
        const [result] = await db.query(
            'UPDATE users SET name = ?, surname = ?, email = ?, role = ?, is_verified = ? WHERE id = ?',
            [name, surname, email, role, is_verified, id]
        );
        return result.affectedRows > 0;
    },
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = User;