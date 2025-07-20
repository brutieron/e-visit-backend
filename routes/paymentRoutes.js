// routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

// === Defines the routes for handling payments ===


// --- NEW SUBSCRIPTION AND COIN PURCHASE ROUTES ---

// Route for creating a new recurring subscription.
router.post('/create-subscription', protect, paymentController.createSubscription);

// Route for the custom on-site checkout form for coins.
router.post('/create-coin-payment-intent', protect, paymentController.createCoinPaymentIntent);

// Route for a Stripe-hosted checkout page for coins.
router.post('/create-coin-checkout-session', protect, paymentController.createCoinCheckoutSession);


// --- NEW SUBSCRIPTION MANAGEMENT ROUTES ---

// Route for creating a Stripe Customer Portal session to manage billing.
router.post('/create-portal-session', protect, paymentController.createPortalSession);

// Route for cancelling an active subscription.
router.post('/cancel-subscription', protect, paymentController.cancelSubscription);


module.exports = router;