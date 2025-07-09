// controllers/businessController.js

const Business = require('../models/Business');
const User = require('../models/User'); 
const { sendBusinessWelcomeEmail } = require('../utils/nodemailer');

// ===============================================
//               USER-ONLY FUNCTIONS
// ===============================================

// 🚀 User: Create Business
exports.createBusiness = async (req, res) => {
    try {
        const userId = req.user.id;
        const existingBusiness = await Business.checkOwnership(userId);
        if (existingBusiness) {
            return res.status(409).json({ error: 'You have already created a business listing for this account.' });
        }
        
        // --- THE DEFINITIVE FIX ---

        // Step 1: Create the business. We no longer care what this function returns.
        await Business.create(req.body, userId);
        
        // Step 2: Immediately after creation, fetch the business we just created.
        // We can reliably do this by finding the business associated with the current user's ID.
        // This guarantees we get the full object with all necessary details.
        const newBusinessWithDetails = await Business.findByUserId(userId);
        
        if (!newBusinessWithDetails) {
            // This would only happen if the creation failed silently, which is a deeper issue,
            // but we have a safeguard for it.
            throw new Error("Could not find the newly created business for this user.");
        }
        
        // Step 3: Fetch user info for the email.
        const user = await User.findById(userId);

        // Step 4: Send the welcome email with the complete, correct data.
        if (user && newBusinessWithDetails) {
            sendBusinessWelcomeEmail(user.email, user.name, newBusinessWithDetails);
        }

        // Step 5: Respond to the client with success.
        res.status(201).json({ message: 'Business created successfully!', business: newBusinessWithDetails });
    } catch (err) {
        console.error("Create Business Error:", err);
        res.status(500).json({ error: 'Failed to create business.' });
    }
};

// 🙋 User: Get their own business
exports.getMyBusiness = async (req, res) => {
    try {
        const business = await Business.findByUserId(req.user.id);
        if (!business) {
            return res.status(404).json({ error: 'No business found for this account.' });
        }
        res.json({ business });
    } catch (err) {
        console.error("Get My Business Error:", err);
        res.status(500).json({ error: 'Failed to fetch your business.' });
    }
};

// ✏️ User: Edit own business
exports.editBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const business = await Business.findById(id);
        if (!business) return res.status(404).json({ error: 'Business not found.' });
        if (business.user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized.' });
        
        await Business.update(id, req.body);
        res.json({ message: 'Business updated successfully.' });
    } catch (err) {
        console.error("Edit Business Error:", err);
        res.status(500).json({ error: 'Failed to update business.' });
    }
};

// 🗑️ User: Delete their own business
exports.deleteMyBusiness = async (req, res) => {
    try {
        const business = await Business.findByUserId(req.user.id);
        if (!business) {
            return res.status(404).json({ error: 'No business found for this account to delete.' });
        }
        const success = await Business.delete(business.id);
        if (!success) {
            return res.status(404).json({ error: 'Business not found.' });
        }
        res.json({ message: 'Your business has been successfully deleted.' });
    } catch (err) {
        console.error("Delete My Business Error:", err);
        res.status(500).json({ error: 'An error occurred while deleting your business.' });
    }
};


// ===============================================
//               ADMIN-ONLY FUNCTIONS
// ===============================================

// 🧠 Admin: Create a new business
exports.createBusinessAsAdmin = async (req, res) => {
    try {
        const adminUserId = req.user.id;
        // Assuming Business.create returns the insertId or a similar result object
        const result = await Business.create(req.body, adminUserId);
        res.status(201).json({ message: 'Business created by admin', businessId: result.insertId });
    } catch (err) {
        console.error("Admin Create Business Error:", err);
        res.status(500).json({ error: 'Failed to create business as admin.' });
    }
};

// 🧠 Admin: Edit any business
exports.editBusinessAsAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Business.update(id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'Business not found or no changes were made.' });
        }
        res.json({ message: 'Business updated by admin.' });
    } catch (err) {
        console.error("Admin Edit Business Error:", err);
        res.status(500).json({ error: 'Admin failed to update business.' });
    }
};

// 🚫 Admin: Delete any business
exports.deleteBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Business.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Business not found.' });
        }
        res.json({ message: 'Business deleted successfully.' });
    } catch (err) {
        console.error("Delete Business Error:", err);
        res.status(500).json({ error: 'Error deleting business.' });
    }
};

// 📄 Admin: Get all businesses for the dashboard
exports.getAllBusinesses = async (req, res) => {
    try {
        const businesses = await Business.findAllForAdmin();
        res.json(businesses);
    } catch (err) {
        console.error("Get All Businesses Error:", err);
        res.status(500).json({ error: 'Failed to fetch businesses.' });
    }
};

// ===============================================
//              PUBLIC-FACING FUNCTIONS
// ===============================================

// 🌍 Public: Get all visible businesses, with optional filtering
exports.getPublicBusinesses = async (req, res) => {
    try {
        const filters = req.query; 
        const businesses = await Business.findAllPublic(filters);
        res.json(businesses);
    } catch (err) {
        console.error("Get Public Businesses Error:", err);
        res.status(500).json({ error: 'Failed to retrieve businesses.' });
    }
};

exports.getBusinessesByIds = async (req, res) => {
  const { ids } = req.body;

  // Input validation
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'An array of "ids" is required in the request body.' });
  }

  // If the frontend sends an empty array, we can just return an empty array.
  if (ids.length === 0) {
    return res.status(200).json([]);
  }

  try {
    // We will create the `findByIds` function in the Business model next.
    const businesses = await Business.findByIds(ids);
    res.status(200).json(businesses);
  } catch (error) {
    console.error('Fetch Businesses by IDs Error:', error);
    res.status(500).json({ error: 'Server error while fetching businesses.' });
  }
};
