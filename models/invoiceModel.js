const db = require('../config/db'); // Your database connection

class Invoice {
    /**
     * Creates a new invoice and its associated line items in the database.
     * @param {object} invoiceData - The data for the new invoice.
     * @returns {Promise<object>} The newly created invoice object.
     */
    static async create(invoiceData) {
        const { recipientName, recipientEmail, lineItems, tax, dueDate, notes, createdBy } = invoiceData;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const currentYear = new Date().getFullYear();
            const [countRows] = await connection.query("SELECT COUNT(*) as count FROM invoices WHERE YEAR(issue_date) = ?", [currentYear]);
            const nextNumber = countRows[0].count + 1;
            const paddedNumber = String(nextNumber).padStart(4, '0');
            const invoiceNumber = `INV-${currentYear}-${paddedNumber}`;

            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (tax || 0);

            const invoiceSql = `
                INSERT INTO invoices (invoice_number, recipient_name, recipient_email, subtotal, tax, total_amount, due_date, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await connection.query(invoiceSql, [
                invoiceNumber, recipientName, recipientEmail, subtotal, tax || 0, totalAmount, dueDate, notes, createdBy
            ]);
            const invoiceId = result.insertId;

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [invoiceId, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return { id: invoiceId, invoice_number: invoiceNumber, ...invoiceData, subtotal, totalAmount, status: 'draft', issue_date: new Date() };
        } catch (error) {
            await connection.rollback();
            console.error("Error creating invoice (transaction rolled back):", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Updates an existing invoice and its line items.
     * @param {number} id - The ID of the invoice to update.
     * @param {object} invoiceData - The new data for the invoice.
     * @returns {Promise<object>} The updated invoice object.
     */
    static async update(id, invoiceData) {
        const { recipientName, recipientEmail, lineItems, tax, dueDate, notes } = invoiceData;
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
            const totalAmount = subtotal + (tax || 0);

            const invoiceSql = `
                UPDATE invoices SET recipient_name = ?, recipient_email = ?, subtotal = ?, tax = ?, total_amount = ?, due_date = ?, notes = ?
                WHERE id = ?
            `;
            await connection.query(invoiceSql, [
                recipientName, recipientEmail, subtotal, tax || 0, totalAmount, dueDate, notes, id
            ]);

            await connection.query("DELETE FROM invoice_line_items WHERE invoice_id = ?", [id]);

            if (lineItems && lineItems.length > 0) {
                const lineItemSql = "INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price) VALUES ?";
                const lineItemValues = lineItems.map(item => [id, item.description, item.quantity, item.unitPrice]);
                await connection.query(lineItemSql, [lineItemValues]);
            }

            await connection.commit();
            return { id, ...invoiceData, subtotal, totalAmount };
        } catch (error) {
            await connection.rollback();
            console.error("Error updating invoice (transaction rolled back):", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Finds a single invoice and its line items by its primary key ID.
     * @param {number} id - The ID of the invoice.
     * @returns {Promise<object|null>} The complete invoice object or null if not found.
     */
    static async findById(id) {
        const [invoiceRows] = await db.query("SELECT * FROM invoices WHERE id = ?", [id]);
        const invoice = invoiceRows[0];
        if (!invoice) return null;

        const [lineItemRows] = await db.query("SELECT * FROM invoice_line_items WHERE invoice_id = ?", [id]);
        invoice.lineItems = lineItemRows;
        return invoice;
    }

    /**
     * Retrieves all invoices from the database, sorted by most recent.
     * @returns {Promise<Array>} An array of invoice objects.
     */
    static async findAll() {
        const [rows] = await db.query("SELECT * FROM invoices ORDER BY created_at DESC");
        return rows;
    }

    /**
     * Updates the status of a specific invoice.
     * @param {number} id - The ID of the invoice to update.
     * @param {string} status - The new status (e.g., 'sent', 'paid', 'cancelled').
     * @returns {Promise<object>} The result object from the database query.
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