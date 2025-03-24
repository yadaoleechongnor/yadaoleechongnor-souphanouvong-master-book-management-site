const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Adjust path as needed

// Create custom async handler since express-async-handler is not installed
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware for checking user authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error('Auth token error:', error);
      // Instead of sending an error, just continue to the next middleware
      // This allows the controller to try alternative auth methods (like from req.body)
      next();
    }
  } else if (req.body && req.body.userId && req.body.role) {
    // If no token but user info in body, let the controller handle it
    next();
  } else {
    // No authentication info found, let the controller handle it
    next();
  }
});

// Middleware for checking specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    // User will be set by the protect middleware if token is valid
    if (!req.user && (!req.body.userId || !req.body.role)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }
    
    // Get role from req.user (from token) or from req.body
    const userRole = req.user ? req.user.role : req.body.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${userRole} is not authorized to access this resource`,
      });
    }
    
    next();
  };
};

module.exports = { protect, authorize };