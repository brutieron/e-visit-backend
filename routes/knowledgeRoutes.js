// routes/knowledgeRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllEntries,
    addEntry,
    deleteEntry
} = require('../controllers/knowledgeController');
// Note: Add update/PUT functionality here if needed in the future

// @route   GET /api/ai-knowledge
router.get('/', getAllEntries);

// @route   POST /api/ai-knowledge
router.post('/', addEntry);

// @route   DELETE /api/ai-knowledge/:id
router.delete('/:id', deleteEntry);

module.exports = router;