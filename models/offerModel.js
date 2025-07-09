// Located at: /models/offerModel.js

const db = require('../config/db'); // Your database connection

class Offer {
    /**
     * Creates a new offer and its associated line items in the database.
     * @param {object} offerData - The data for the new offer.
     * @returns {Promise<object>} The newly created offer object.
     */
    static async create(offerData) {
        // Renamed dueDate to validUntil for clarity
        const { recipientName, recipientEmail, lineItems, tax, validUntil, notes, createdBy } = offerData;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Generate a unique offer number like OFFER-2023-0001
            const currentYear = new Date().getFullYear();
            const [countRows] = await connection.query("SELECT COUNT(*) as count FROM offers WHERE YEAR(issue_date) = ?", [currentYear]);
            const nextNumber = countRows[0].count + 1;
            const paddedNumber = String(nextNumber).padStart(4, '0');
            const offerNumber = `OFFER-${currentYear}-${paddedNumber}`;

            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (tax || 0);

            const offerSql = `
                INSERT INTO offers (offer_number, recipient_name, recipient_email, subtotal, tax, total_amount, valid_until, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await connection.query(offerSql, [
                offerNumber, recipientName, recipientEmail, subtotal, tax || 0, totalAmount, validUntil, notes, createdBy
            ]);
            const offerId = result.insertId;

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO offer_line_items (offer_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [offerId, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return { id: offerId, offer_number: offerNumber, ...offerData, subtotal, totalAmount, status: 'draft', issue_date: new Date() };
        } catch (error) {
            await connection.rollback();
            console.error("Error creating offer (transaction rolled back):", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Updates an existing offer and its line items.
     * @param {number} id - The ID of the offer to update.
     * @param {object} offerData - The new data for the offer.
     * @returns {Promise<object>} The updated offer object.
     */
    static async update(id, offerData) {
        const { recipientName, recipientEmail, lineItems, tax, validUntil, notes } = offerData;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (tax || 0);

            const offerSql = `
                UPDATE offers SET recipient_name = ?, recipient_email = ?, subtotal = ?, tax = ?, total_amount = ?, valid_until = ?, notes = ?
                WHERE id = ?
            `;
            await connection.query(offerSql, [
                recipientName, recipientEmail, subtotal, tax || 0, totalAmount, validUntil, notes, id
            ]);

            await connection.query("DELETE FROM offer_line_items WHERE offer_id = ?", [id]);

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO offer_line_items (offer_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [id, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return { id, ...offerData, subtotal, totalAmount };
        } catch (error) {
            await connection.rollback();
            console.error("Error updating offer (transaction rolled back):", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Finds a single offer and its line items by its primary key ID.
     * @param {number} id - The ID of the offer.
     * @returns {Promise<object|null>} The complete offer object or null if not found.
     */
    static async findById(id) {
        const [offerRows] = await db.query("SELECT * FROM offers WHERE id = ?", [id]);
        const offer = offerRows[0];
        if (!offer) return null;

        const [lineItemRows] = await db.query("SELECT * FROM offer_line_items WHERE offer_id = ?", [id]);
        offer.lineItems = lineItemRows;
        return offer;
    }

    /**
     * Retrieves all offers from the database, sorted by most recent.
     * @returns {Promise<Array>} An array of offer objects.
     */
    static async findAll() {
        const [rows] = await db.query("SELECT * FROM offers ORDER BY created_at DESC");
        return rows;
    }

    /**
     * Updates the status of a specific offer.
     * @param {number} id - The ID of the offer to update.
     * @param {string} status - The new status (e.g., 'sent', 'accepted', 'declined').
     * @returns {Promise<object>} The result object from the database query.
     */
    static async updateStatus(id, status) {
        const validStatuses = ['draft', 'sent', 'accepted', 'declined'];
        if (!validStatuses.includes(status)) throw new Error('Invalid status provided.');
        const sql = "UPDATE offers SET status = ? WHERE id = ?";
        const [result] = await db.query(sql, [status, id]);
        return result;
    }

    /**
     * Deletes an offer and its associated line items from the database.
     * @param {number} id - The ID of the offer to delete.
     * @returns {Promise<object>} The result object from the database query.
     */
    static async delete(id) {
        // The database is set up with ON DELETE CASCADE,
        // so deleting from the 'offers' table will automatically delete associated line items.
        const [result] = await db.query("DELETE FROM offers WHERE id = ?", [id]);
        return result;
    }
}

module.exports = Offer;