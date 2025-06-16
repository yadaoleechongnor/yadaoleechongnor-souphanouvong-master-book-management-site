const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const fs = require('fs');
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
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
    },
  },
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Import routes
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const branchRoutes = require('./routes/branchRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const adminPasswordResetRoutes = require('./routes/adminPasswordResetRoutes');
const otpResetRoutes = require('./routes/otpResetRoutes');
const newsRoutes = require('./routes/newsRoutes');

// Routes
app.use('/users', userRoutes);
app.use(['/books', '/v1/books'], bookRoutes);  // Handle both path prefixes
app.use('/departments', departmentRoutes);
app.use('/branches', branchRoutes);
app.use('/faculties', facultyRoutes);
app.use('/downloads', downloadRoutes);
app.use('/password', passwordResetRoutes);
app.use('/auth', passwordResetRoutes);
app.use('/otp', otpResetRoutes);
app.use('/auth/password-reset', otpResetRoutes);
app.use('/admin', adminPasswordResetRoutes);
app.use('/news',newsRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
