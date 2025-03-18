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

const path = require('path'); // Add this line

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
  origin: 'http://localhost:3000', // Remove trailing slash
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Add this line

// Routes
app.use('/api/users', userRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/downloads', downloadRoutes);

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