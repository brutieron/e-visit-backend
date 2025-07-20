// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // <<<<<<<< 1. IMPORT THE USER MODEL

/**
 * This is the corrected 'protect' middleware.
 * It now fetches the full user object from the database after verifying the token.
 */
exports.protect = async (req, res, next) => { // <<<<<<<< 2. MAKE THE FUNCTION ASYNC
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    /**
     * <<<<<<<<<<<<<<<<<<<<<<<< THIS IS THE FINAL FIX >>>>>>>>>>>>>>>>>>>>
     * Instead of just attaching the decoded payload, we now use the ID from the token
     * to fetch the COMPLETE user object from the database.
     * This object includes the `stripe_customer_id` and all other user details.
     */
    const fullUser = await User.findById(decoded.id);

    if (!fullUser) {
        return res.status(401).json({ error: 'Not authorized, user not found.' });
    }

    // Attach the full, fresh user object to the request.
    req.user = fullUser;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};


/**
 * This 'authorizeRoles' middleware is now more robust because it receives
 * the full user object from the corrected 'protect' middleware.
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
          error: `Access Denied. User role ('${req.user.role}') is not authorized for this route. Required roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};