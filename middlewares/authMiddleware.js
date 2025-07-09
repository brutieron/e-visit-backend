const jwt = require('jsonwebtoken');

// Your 'protect' middleware is excellent. No changes needed.
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the payload from the token directly to req.user
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

// This version provides a slightly more helpful error message.
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // This check is good, but we can make the error message more specific.
    if (!req.user || !roles.includes(req.user.role)) {
      // The new error message tells the developer what role the user *has* vs what role is *required*.
      return res.status(403).json({ 
          error: `Access Denied. User role ('${req.user.role}') is not authorized for this route. Required roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};