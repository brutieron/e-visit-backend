// controllers/licenseController.js

const License = require('../models/License'); // Assuming you have this model

// @desc    Get the logged-in user's license status
// @route   GET /api/license/status
// @access  Private
exports.getMyLicenseStatus = async (req, res) => {
    try {
        // FindByUserId should check for a valid license (not expired)
        const license = await License.findByUserId(req.user.id);
        
        if (license) {
            // User has a valid, active license
            res.json({ hasActiveLicense: true, license });
        } else {
            // No active license found
            res.json({ hasActiveLicense: false, license: null });
        }
    } catch (err) {
        console.error("Get License Status Error:", err);
        res.status(500).json({ error: 'Failed to fetch license status.' });
    }
};