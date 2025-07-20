// controllers/licenseController.js

const License = require('../models/License');

// @desc    Get the logged-in user's license status
// @route   GET /api/license/status
// @access  Private
exports.getMyLicenseStatus = async (req, res) => {
    try {
        // Calls the corrected model function.
        const license = await License.findByUserId(req.user.id);
        
        // This logic remains correct. If a license is found, it's active.
        if (license) {
            res.json({ hasActiveLicense: true, license });
        } else {
            res.json({ hasActiveLicense: false, license: null });
        }
    } catch (err) {
        console.error("Get License Status Error:", err);
        res.status(500).json({ error: 'Failed to fetch license status.' });
    }
};