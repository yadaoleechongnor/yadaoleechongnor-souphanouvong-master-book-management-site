const express = require('express');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const downloadController = require('../controllers/downloadController');
const path = require('path');

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

// Handle file downloads
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);

  res.download(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }
  });
});

module.exports = router;