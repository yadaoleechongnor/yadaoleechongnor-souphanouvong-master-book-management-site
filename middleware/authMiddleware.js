const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Protect routes
const protect = async (req, res, next) => {
  let token;
  
  console.log('Headers:', req.headers);
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token from Authorization header:', token);
  } 
  // Check if token exists in cookies (if cookie-parser is available)
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
    console.log('Token from cookies:', token);
  }
  // Alternative approach: Check for token in query parameters as fallback
  else if (req.query && req.query.token) {
    token = req.query.token;
    console.log('Using token from query parameter');
  }

  // If no token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Get user from the token
    const currentUser = await User.findById(decoded.id).select('-password');
    console.log('Current user:', {id: currentUser._id, role: currentUser.role});
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
    });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('RestrictTo middleware:', {
      allowedRoles: roles,
      userRole: req.user ? req.user.role : 'no role',
      userObject: req.user ? JSON.stringify(req.user) : 'no user object',
      hasAccess: req.user ? roles.includes(req.user.role) : false
    });
    
    // Make sure req.user exists before checking role
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    
    console.log('Permission granted for role:', req.user.role);
    next();
  };
};

module.exports = { protect, restrictTo };