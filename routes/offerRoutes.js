// Located at: /routes/offerRoutes.js

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// --- All routes below are protected and require an admin user ---

// POST /api/offers -> Create a new offer
router.post('/', protect, authorizeRoles('admin'), offerController.createOffer);

// POST /api/offers/:id/send -> Send an existing offer
router.post('/:id/send', protect, authorizeRoles('admin'), offerController.sendOfferByEmail);

// GET /api/offers/:id/download -> Download an offer as a PDF
router.get('/:id/download', protect, authorizeRoles('admin'), offerController.downloadOfferPDF);

// GET /api/offers -> Get all offers
router.get('/', protect, authorizeRoles('admin'), offerController.getAllOffers);

// GET /api/offers/:id -> Get a single offer by its ID
router.get('/:id', protect, authorizeRoles('admin'), offerController.getOfferById);

// PUT /api/offers/:id -> Update an offer
router.put('/:id', protect, authorizeRoles('admin'), offerController.updateOffer);

// DELETE /api/offers/:id -> Delete an offer
router.delete('/:id', protect, authorizeRoles('admin'), offerController.deleteOffer);

module.exports = router;