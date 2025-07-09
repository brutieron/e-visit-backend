const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const bodyParser = require('body-parser');

// The route path is '/' because the prefix '/api/webhook' is handled in server.js
// It uses bodyParser.raw because Stripe needs the raw request body for signature verification.
router.post(
    '/',
    bodyParser.raw({ type: 'application/json' }),
    webhookController.handleStripeEvents
);

module.exports = router;