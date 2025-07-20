// models/License.js

const db = require('../config/db');

const License = {
    /**
     * <<<<<<<<<<<<<<<<<<<<<<<< THE FINAL FIX IS HERE >>>>>>>>>>>>>>>>>>>>
     * This 'create' function has been corrected to handle the 'current_period_end' date.
     */
    create: async (licenseData) => {
        // Step 1: Correctly destructure ALL the required fields, including the date.
        const { userId, plan_type, subscriptionStatus, stripeSessionId, stripeSubscriptionId, current_period_end } = licenseData;
        
        // Step 2: Add the `current_period_end` column to the INSERT statement.
        const [result] = await db.query(
            `INSERT INTO licenses (user_id, plan_type, subscription_status, stripe_session_id, stripe_subscription_id, current_period_end)
             VALUES (?, ?, ?, ?, ?, ?)`, // Step 3: Add the corresponding '?' placeholder.
            [userId, plan_type, subscriptionStatus, stripeSessionId, stripeSubscriptionId, current_period_end] // Step 4: Add the date variable to the values array.
        );
        return result.insertId;
    },

    // This function is now correct because it selects from a row that will have the correct date.
    findByUserId: async (userId) => {
        const [rows] = await db.query(
            "SELECT * FROM licenses WHERE user_id = ? AND subscription_status = 'active' ORDER BY created_at DESC LIMIT 1",
            [userId]
        );
        return rows[0];
    },

    // This findOne function is correct.
    findOne: async (criteria) => {
        const field = Object.keys(criteria)[0];
        const value = Object.values(criteria)[0];

        const validColumns = ['id', 'user_id', 'stripeSubscriptionId', 'stripeSessionId'];
        if (!validColumns.includes(field)) {
            throw new Error(`Invalid field name in findOne query: ${field}`);
        }
        
        const columnMap = {
            stripeSubscriptionId: 'stripe_subscription_id',
            stripeSessionId: 'stripe_session_id',
            userId: 'user_id',
            id: 'id'
        };
        const dbColumn = columnMap[field] || field;

        const [rows] = await db.query(`SELECT * FROM licenses WHERE ?? = ? LIMIT 1`, [dbColumn, value]);
        return rows[0];
    },

    // This updateOne function is correct.
    updateOne: async (criteria, updates) => {
        const findField = Object.keys(criteria)[0];
        const findValue = Object.values(criteria)[0];
        
        const columnMap = { stripeSubscriptionId: 'stripe_subscription_id' };
        const dbColumn = columnMap[findField] || findField;

        const [result] = await db.query('UPDATE licenses SET ? WHERE ?? = ?', [updates, dbColumn, findValue]);
        return result.affectedRows > 0;
    }
};

module.exports = License;