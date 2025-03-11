const express = require('express');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const downloadController = require('../controllers/downloadController');

const router = express.Router();

// All download routes require authentication
router.use(protect);

// Record a download
router.post('/:bookId', downloadController.recordDownload);

// Get user's downloads
router.get('/user/:userId', downloadController.getUserDownloads);

// Admin and teacher routes
router.use(restrictTo('teacher', 'admin'));
router.get('/book/:bookId', downloadController.getBookDownloads);

// Admin only routes
router.use(restrictTo('admin'));
router.get('/', downloadController.getAllDownloads);

module.exports = router;