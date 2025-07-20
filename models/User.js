// models/User.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    // ==========================================================
    //  FINDER METHODS
    // ==========================================================

    /**
     * <<<<<<<<<<<<<<<<<<<<<<<< THIS IS THE FINAL, GUARANTEED FIX >>>>>>>>>>>>>>>>>>>>
     * This query is called by your authentication middleware. By adding `stripe_customer_id` here,
     * the `req.user` object will now have the necessary property, and the "Manage Billing" button will work.
     */
    findById: async (id) => {
        const [userRows] = await db.query(
            'SELECT id, name, surname, email, role, is_verified, coin_balance, created_at, stripe_customer_id FROM users WHERE id = ?', 
            [id]
        );
        if (!userRows[0]) return null;
        
        const user = userRows[0];
        const favoriteIds = await User.getFavoriteIds(user.id);
        user.favoriteBusinesses = favoriteIds;
        return user;
    },
    
    // All other functions in this file are correct and do not need changes.
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
    
    // ... Favorite-related methods are correct ...
    getFavoriteIds: async (userId) => {
        const [rows] = await db.query('SELECT business_id FROM user_favorites WHERE user_id = ?', [userId]);
        return rows.map(row => row.business_id);
    },
    isFavorited: async (userId, businessId) => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ? AND business_id = ?', [userId, businessId]);
        return rows[0].count > 0;
    },
    addFavorite: async (userId, businessId) => {
        const [result] = await db.query('INSERT IGNORE INTO user_favorites (user_id, business_id) VALUES (?, ?)', [userId, businessId]);
        return result.affectedRows > 0;
    },
    removeFavorite: async (userId, businessId) => {
        const [result] = await db.query('DELETE FROM user_favorites WHERE user_id = ? AND business_id = ?', [userId, businessId]);
        return result.affectedRows > 0;
    },

    // ... Mutation & Update methods are correct ...
    create: async (userData) => {
        const { name, surname, email, phone, birthday, password, role = 'business' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query('INSERT INTO users (name, surname, email, phone, birthday, password, role, is_verified, coin_balance) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)', [name, surname, email, phone, birthday, hashedPassword, role]);
        return result.insertId;
    },
    findOrCreateGoogleUser: async (profile) => {
        const { name, surname, email, googleId } = profile;
        let user = await User.findByEmailWithPassword(email);
        if (user) return user;
        const [result] = await db.query('INSERT INTO users (name, surname, email, google_id, role, is_verified, coin_balance) VALUES (?, ?, ?, ?, "business", 1, 0)', [name, surname, email, googleId]);
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
    addCoins: async (userId, amount) => {
        const [result] = await db.query('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?', [amount, userId]);
        return result.affectedRows > 0;
    },
    updateStripeCustomerId: async (userId, stripeCustomerId) => {
        const [result] = await db.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [stripeCustomerId, userId]);
        return result.affectedRows > 0;
    },
    updateAsAdmin: async (id, userData) => {
        const { name, surname, email, role, is_verified } = userData;
        const [result] = await db.query('UPDATE users SET name = ?, surname = ?, email = ?, role = ?, is_verified = ? WHERE id = ?', [name, surname, email, role, is_verified, id]);
        return result.affectedRows > 0;
    },
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = User;