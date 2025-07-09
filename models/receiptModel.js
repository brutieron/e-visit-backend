// models/receiptModel.js

const db = require('../config/db');

class Receipt {
    /**
     * Creates a new receipt record in the database.
     * It automatically generates a unique, sequential receipt number for the current year.
     * @param {object} receiptData - The data for the new receipt.
     * @param {number} receiptData.userId - The ID of the user.
     * @param {string} receiptData.stripePaymentIntentId - The ID from the Stripe payment.
     * @param {string} receiptData.itemDescription - A description of the purchased item.
     * @param {number} receiptData.amount - The total amount paid, in cents.
     * @returns {Promise<object>} The newly created receipt object, including the generated receipt_number.
     */
    static async create(receiptData) {
        const { userId, stripePaymentIntentId, itemDescription, amount } = receiptData;

        // --- Generate a unique receipt number like INV-2024-0001 ---
        const currentYear = new Date().getFullYear();
        
        // Find the count of receipts already issued this year to determine the next number.
        const countSql = "SELECT COUNT(*) as count FROM receipts WHERE YEAR(issue_date) = ?";
        const [countRows] = await db.query(countSql, [currentYear]);
        const nextNumber = countRows[0].count + 1;

        // Format the number with leading zeros (e.g., 1 -> 0001)
        const paddedNumber = String(nextNumber).padStart(4, '0');
        const receiptNumber = `INV-${currentYear}-${paddedNumber}`;

        // --- Insert the new receipt record into the database ---
        const insertSql = `
            INSERT INTO receipts (receipt_number, user_id, stripe_payment_intent_id, item_description, amount)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(insertSql, [
            receiptNumber,
            userId,
            stripePaymentIntentId,
            itemDescription,
            amount,
        ]);

        // --- Return the full receipt object we just created ---
        const newReceipt = {
            id: result.insertId,
            receipt_number: receiptNumber,
            user_id: userId,
            stripe_payment_intent_id: stripePaymentIntentId,
            item_description: itemDescription,
            amount: amount,
            issue_date: new Date() // Set current date
        };
        
        return newReceipt;
    }

    /**
     * Finds a receipt by its unique receipt number.
     * @param {string} receiptNumber - The receipt number (e.g., "INV-2024-0001").
     * @returns {Promise<object|null>} The receipt object or null if not found.
     */
    static async findByNumber(receiptNumber) {
        const [rows] = await db.query("SELECT * FROM receipts WHERE receipt_number = ?", [receiptNumber]);
        return rows[0] || null;
    }
}

module.exports = Receipt;