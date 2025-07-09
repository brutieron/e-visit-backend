// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { handleAskRequest } = require('../controllers/aiController');

// @route   POST /api/ai/ask
// @desc    Get a response from the AI
// @access  Public
router.post('/ask', handleAskRequest);

module.exports = router;