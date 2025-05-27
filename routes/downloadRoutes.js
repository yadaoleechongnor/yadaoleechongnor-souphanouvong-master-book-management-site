const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const downloadController = require('../controllers/downloadController');
const path = require('path');

const router = express.Router();

// Public routes for popular books (accessible without authentication)
router.get('/popular', downloadController.getPopularBooks);


// Protected routes
router.use(protect);

// Route to download a book PDF - available to all authenticated users
router.get('/books/:bookId/download', downloadController.downloadBookPdf);

// Route to record a download - available to all authenticated users
router.post('/books/:bookId/record', downloadController.recordDownload);

// User download history - own downloads or admin
// router.get('/user/:userId', downloadController.getUserDownloads);

// Routes for statistics and analytics (accessible to teachers and admin)
router.get('/stats', restrictTo('teacher', 'admin'), downloadController.getDownloadStats);
router.get('/trends', restrictTo('teacher', 'admin'), downloadController.getDownloadTrends);



// Other public routes
router.get('/', downloadController.getAllDownloads);
router.get('/:id', downloadController.getDownload);

// Book download history - for admins and teachers
// router.get('/books/:bookId', restrictTo('teacher', 'admin'), downloadController.getBookDownloads);

module.exports = router;