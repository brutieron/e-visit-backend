const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// === PUBLIC ROUTE ===
// For the form on the public "Collaborate" page
router.post('/', collaborationController.submitCollaboration);

// === ADMIN ROUTES ===
router.get('/all', protect, authorizeRoles('admin'), collaborationController.getAllCollaborations);
router.put('/status/:id', protect, authorizeRoles('admin'), collaborationController.updateCollaborationStatus);
router.delete('/:id', protect, authorizeRoles('admin'), collaborationController.deleteCollaboration);

module.exports = router;