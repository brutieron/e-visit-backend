// models/offerModel.js - FINAL CORRECTED VERSION (Syntax Fix)

const db = require('../config/db');
const { format } = require('date-fns');

async function getNextSequenceValue(connection, sequenceName) {
    const [rows] = await connection.query('SELECT current_value FROM document_sequences WHERE name = ? FOR UPDATE', [sequenceName]);
    if (rows.length === 0) {
        throw new Error(`Sequence named '${sequenceName}' not found in document_sequences table.`);
    }
    const nextValue = rows[0].current_value;
    await connection.query('UPDATE document_sequences SET current_value = current_value + 1 WHERE name = ?', [sequenceName]);
    return nextValue;
}

class Offer {
    static async create(offerData) {
        const { recipientName, recipientEmail, lineItems, tax, validUntil, notes, createdBy } = offerData;
        const formattedValidUntil = validUntil ? format(new Date(validUntil), 'yyyy-MM-dd') : null;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const nextNumber = await getNextSequenceValue(connection, 'offer');
            
            const currentYear = new Date().getFullYear();
            const paddedNumber = String(nextNumber).padStart(4, '0');
            const offerNumber = `OFFER-${currentYear}-${paddedNumber}`;

            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (parseFloat(tax) || 0);

            const offerSql = `
                INSERT INTO offers (offer_number, recipient_name, recipient_email, subtotal, tax, total_amount, valid_until, notes, created_by, issue_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
            `;
            const [result] = await connection.query(offerSql, [
                offerNumber, recipientName, recipientEmail, subtotal, (parseFloat(tax) || 0), totalAmount, formattedValidUntil, notes, createdBy
            ]);
            const offerId = result.insertId;

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO offer_line_items (offer_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [offerId, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return this.findById(offerId);
        } catch (error) { // <-- THIS IS THE CORRECTED LINE (REMOVED '=>')
            await connection.rollback();
            console.error("Error creating offer (transaction rolled back):", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Failed to create offer due to a duplicate number conflict. Please try again.');
            }
            throw new Error('Database error during offer creation.');
        } finally {
            connection.release();
        }
    }

    // --- The rest of the functions are unchanged ---
    
    static async update(id, offerData) {
        const { recipientName, recipientEmail, lineItems, tax, validUntil, notes } = offerData;
        const formattedValidUntil = validUntil ? format(new Date(validUntil), 'yyyy-MM-dd') : null;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (parseFloat(tax) || 0);

            const offerSql = `
                UPDATE offers SET recipient_name = ?, recipient_email = ?, subtotal = ?, tax = ?, total_amount = ?, valid_until = ?, notes = ?
                WHERE id = ?
            `;
            await connection.query(offerSql, [
                recipientName, recipientEmail, subtotal, (parseFloat(tax) || 0), totalAmount, formattedValidUntil, notes, id
            ]);
            
            await connection.query("DELETE FROM offer_line_items WHERE offer_id = ?", [id]);

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO offer_line_items (offer_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [id, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return this.findById(id);
        } catch (error) {
            await connection.rollback();
            console.error("Error updating offer (transaction rolled back):", error);
            throw new Error('Database error during offer update.');
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        const [offerRows] = await db.query("SELECT * FROM offers WHERE id = ?", [id]);
        if (offerRows.length === 0) return null;
        
        const offer = offerRows[0];
        const [lineItemRows] = await db.query("SELECT * FROM offer_line_items WHERE offer_id = ?", [id]);
        offer.lineItems = lineItemRows;
        return offer;
    }

    static async findAll() {
        const [rows] = await db.query("SELECT id, offer_number, recipient_name, total_amount, valid_until, status FROM offers ORDER BY issue_date DESC");
        return rows;
    }
    
    static async delete(id) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.query('DELETE FROM offer_line_items WHERE offer_id = ?', [id]);
            await connection.query('DELETE FROM offers WHERE id = ?', [id]);
            await connection.commit();
            return { message: 'Offer deleted successfully.' };
        } catch(error) {
            await connection.rollback();
            console.error("Error deleting offer:", error);
            throw new Error('Database error during offer deletion.');
        } finally {
            connection.release();
        }
    }

    static async updateStatus(id, status) {
        const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'declined'];
        if (!validStatuses.includes(status)) throw new Error('Invalid status provided.');
        const sql = "UPDATE offers SET status = ? WHERE id = ?";
        const [result] = await db.query(sql, [status, id]);
        return result;
    }
}

module.exports = Offer;