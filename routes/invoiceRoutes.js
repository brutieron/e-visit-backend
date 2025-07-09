const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// --- All routes below are now protected and require an admin user ---

// POST /api/invoices -> Create a new invoice
router.post(
    '/',
    protect,
    authorizeRoles('admin'),
    invoiceController.createInvoice
);

// POST /api/invoices/:id/send -> Send an existing invoice to the recipient's email
router.post(
    '/:id/send',
    protect,
    authorizeRoles('admin'),
    invoiceController.sendInvoiceByEmail
);

// GET /api/invoices -> Get all invoices
router.get(
    '/',
    protect,
    authorizeRoles('admin'),
    invoiceController.getAllInvoices
);

// GET /api/invoices/:id -> Get a single invoice by its ID
router.get(
    '/:id',
    protect,
    authorizeRoles('admin'),
    invoiceController.getInvoiceById
);

// ✅ --- ADD THIS ROUTE --- ✅
// GET /api/invoices/:id/download -> Download an invoice as a PDF
router.get(
    '/:id/download',
    protect,
    authorizeRoles('admin'),
    invoiceController.downloadInvoicePDF
);

// PUT /api/invoices/:id -> Update an invoice
router.put(
    '/:id',
    protect,
    authorizeRoles('admin'),
    invoiceController.updateInvoice
);

// DELETE /api/invoices/:id -> Delete an invoice
router.delete(
    '/:id',
    protect,
    authorizeRoles('admin'),
    invoiceController.deleteInvoice
);

module.exports = router;