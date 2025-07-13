// routes/offerRoutes.js - FINAL CORRECTED VERSION

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// All routes are protected and require admin role
router.post('/', protect, authorizeRoles('admin'), offerController.createOffer);
router.get('/', protect, authorizeRoles('admin'), offerController.getAllOffers);
router.get('/:id', protect, authorizeRoles('admin'), offerController.getOfferById);
router.put('/:id', protect, authorizeRoles('admin'), offerController.updateOffer);
router.delete('/:id', protect, authorizeRoles('admin'), offerController.deleteOffer);
router.post('/:id/send', protect, authorizeRoles('admin'), offerController.sendOfferByEmail);
// Corrected typo here from your original file
router.get('/:id/download', protect, authorizeRoles('admin'), offerController.downloadOfferPDF);

module.exports = router;