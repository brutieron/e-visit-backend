// routes/webhookRoutes.js

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// The route path is '/' because the prefix '/api/webhook' is handled in server.js.
// There is NO body parser here because it's already handled in server.js.
router.post('/', webhookController.handleStripeEvents);

module.exports = router;