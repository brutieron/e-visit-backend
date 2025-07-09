// routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

// === Defines the routes for handling payments ===


// --- LICENSE PAYMENT ROUTES ---

// Route for the custom on-site checkout form for licenses.
// Creates a Payment Intent. Used by the `/checkout/license` page.
router.post('/create-payment-intent', protect, paymentController.createPaymentIntent);

// Route for a Stripe-hosted checkout page for licenses (legacy or fallback).
router.post('/create-checkout-session', protect, paymentController.createLicenseCheckoutSession);


// --- COIN PURCHASE ROUTES ---

// NEW: Route for the custom on-site checkout form for coins.
// Creates a Payment Intent. Will be used by the new `/checkout/coins` page.
router.post('/create-coin-payment-intent', protect, paymentController.createCoinPaymentIntent);

// Route for a Stripe-hosted checkout page for coins.
// Used by the "Purchase Now" buttons on your `/dashboard/billing` page.
router.post('/create-coin-checkout-session', protect, paymentController.createCoinCheckoutSession);


module.exports = router;