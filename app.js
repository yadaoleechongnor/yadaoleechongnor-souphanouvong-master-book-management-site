const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Import routes
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const branchRoutes = require('./routes/branchRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const adminPasswordResetRoutes = require('./routes/adminPasswordResetRoutes');
const otpResetRoutes = require('./routes/otpResetRoutes'); // Add OTP reset routes
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Add CSP header middleware
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  next();
});

// Middleware
app.use(helmet({
  frameguard: {
    action: 'sameorigin'
  }
}));
app.use(cors({
  origin: ['http://localhost:5173', 'https://souphanouvonguniversity-book-management.onrender.com'], // Add all your frontend origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Ensure this line is present

// Routes
app.use('/api/users', userRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/auth', passwordResetRoutes);  
// Consolidate the auth-related routes to avoid conflicts and make the routing more predictable

app.use('/api/otp', otpResetRoutes); // Add OTP reset routes at /api/otp

// OTP and auth routes - make sure there are no duplicate routes
app.use('/api/otp', otpResetRoutes); // Keep primary OTP routes

// Instead of duplicating routes which can cause confusion, let's be more specific
app.use('/api/auth/password-reset', otpResetRoutes); // More specific path for password reset operations

// admin password reset routes
app.use('/api/admin', adminPasswordResetRoutes);  // This will make routes available at /api/admin/resetpassword/...

// Remove this duplicate route that might be causing conflicts
// app.use('/api', passwordResetRoutes); 

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;