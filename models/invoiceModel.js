// models/invoiceModel.js - FINAL ROBUST VERSION

const db = require('../config/db');
const { format } = require('date-fns');

/**
 * Atomically gets the next available sequence number for a document type.
 * This is a shared helper function that prevents duplicate number errors.
 * @param {object} connection - The database connection object from the transaction.
 * @param {string} sequenceName - The name of the sequence (e.g., 'offer', 'invoice').
 * @returns {Promise<number>} The next sequence number.
 */
async function getNextSequenceValue(connection, sequenceName) {
    // Lock the row for update to prevent race conditions
    const [rows] = await connection.query('SELECT current_value FROM document_sequences WHERE name = ? FOR UPDATE', [sequenceName]);
    
    if (rows.length === 0) {
        throw new Error(`Sequence named '${sequenceName}' not found in the document_sequences table. Please run the setup SQL command.`);
    }

    const nextValue = rows[0].current_value;

    // Increment the value for the next request
    await connection.query('UPDATE document_sequences SET current_value = current_value + 1 WHERE name = ?', [sequenceName]);
    
    return nextValue;
}

class Invoice {
    /**
     * Creates a new invoice using an atomic sequence for the invoice number.
     */
    static async create(invoiceData) {
        const { recipientName, recipientEmail, lineItems, tax, dueDate, notes, createdBy } = invoiceData;
        const formattedDueDate = dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : null;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // === THIS IS THE CRITICAL FIX ===
            // Get the next unique number from our sequence table
            const nextNumber = await getNextSequenceValue(connection, 'invoice');
            
            const currentYear = new Date().getFullYear();
            const paddedNumber = String(nextNumber).padStart(4, '0');
            const invoiceNumber = `INV-${currentYear}-${paddedNumber}`;

            // Use 'unitPrice' from frontend, matching your previous model
            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (parseFloat(tax) || 0);

            const invoiceSql = `
                INSERT INTO invoices (invoice_number, recipient_name, recipient_email, subtotal, tax, total_amount, due_date, notes, created_by, issue_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
            `;
            const [result] = await connection.query(invoiceSql, [
                invoiceNumber, recipientName, recipientEmail, subtotal, (parseFloat(tax) || 0), totalAmount, formattedDueDate, notes, createdBy
            ]);
            const invoiceId = result.insertId;

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price) VALUES ?";
                // Map 'unitPrice' from frontend to 'unit_price' in DB
                const lineItemValues = lineItems.map(item => [invoiceId, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return this.findById(invoiceId);
        } catch (error) { // Corrected catch syntax
            await connection.rollback();
            console.error("Error creating invoice (transaction rolled back):", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Failed to create invoice due to a duplicate number conflict. Please try again.');
            }
            throw new Error('Database error during invoice creation.');
        } finally {
            connection.release();
        }
    }

    /**
     * Updates an existing invoice.
     */
    static async update(id, invoiceData) {
        const { recipientName, recipientEmail, lineItems, tax, dueDate, notes } = invoiceData;
        const formattedDueDate = dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : null;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (parseFloat(tax) || 0);

            const invoiceSql = `
                UPDATE invoices SET recipient_name = ?, recipient_email = ?, subtotal = ?, tax = ?, total_amount = ?, due_date = ?, notes = ?
                WHERE id = ?
            `;
            await connection.query(invoiceSql, [
                recipientName, recipientEmail, subtotal, (parseFloat(tax) || 0), totalAmount, formattedDueDate, notes, id
            ]);
            
            await connection.query("DELETE FROM invoice_line_items WHERE invoice_id = ?", [id]);

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [id, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return this.findById(id);
        } catch (error) {
            await connection.rollback();
            console.error("Error updating invoice (transaction rolled back):", error);
            throw new Error('Database error during invoice update.');
        } finally {
            connection.release();
        }
    }

    /**
     * Finds a single invoice by its ID.
     */
    static async findById(id) {
        const [invoiceRows] = await db.query("SELECT * FROM invoices WHERE id = ?", [id]);
        if (invoiceRows.length === 0) return null;
        
        const invoice = invoiceRows[0];
        const [lineItemRows] = await db.query("SELECT * FROM invoice_line_items WHERE invoice_id = ?", [id]);
        invoice.lineItems = lineItemRows;
        return invoice;
    }

    /**
     * Retrieves all invoices.
     */
    static async findAll() {
        const [rows] = await db.query("SELECT id, invoice_number, recipient_name, total_amount, due_date, status FROM invoices ORDER BY issue_date DESC");
        return rows;
    }
    
    /**
     * Deletes an invoice and its line items within a transaction.
     */
    static async delete(id) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.query('DELETE FROM invoice_line_items WHERE invoice_id = ?', [id]);
            await connection.query('DELETE FROM invoices WHERE id = ?', [id]);
            await connection.commit();
            return { message: 'Invoice deleted successfully.' };
        } catch(error) {
            await connection.rollback();
            console.error("Error deleting invoice:", error);
            throw new Error('Database error during invoice deletion.');
        } finally {
            connection.release();
        }
    }

    /**
     * Updates the status of an invoice.
     */
    static async updateStatus(id, status) {
        const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
        if (!validStatuses.includes(status)) throw new Error('Invalid status provided.');
        const sql = "UPDATE invoices SET status = ? WHERE id = ?";
        const [result] = await db.query(sql, [status, id]);
        return result;
    }
}

module.exports = Invoice;