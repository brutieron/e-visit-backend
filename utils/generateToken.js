const jwt = require('jsonwebtoken');

// Change this to accept the full user object
exports.generateToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role
  };
  // Use a shorter expiration, like 1-7 days. 30 days is very long.
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};