// models/License.js

const db = require('../config/db');

const License = {
    // Creates a new license for a user
    create: async (licenseData) => {
        const { userId, stripeSessionId } = licenseData;
        
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // License valid for 1 year
        
        const [result] = await db.query(
            `INSERT INTO licenses (user_id, status, expires_at, stripe_session_id)
             VALUES (?, 'active', ?, ?)`,
            [userId, expiresAt, stripeSessionId]
        );
        return result.insertId;
    },

    // --- THIS IS THE NEW FUNCTION THAT WAS MISSING ---
    // Finds a user's license, but ONLY if it is currently active (not expired).
    findByUserId: async (userId) => {
        const [rows] = await db.query(
            'SELECT * FROM licenses WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        // This will return the license object if found, or 'undefined' if not, which works perfectly.
        return rows[0];
    }
};

module.exports = License;