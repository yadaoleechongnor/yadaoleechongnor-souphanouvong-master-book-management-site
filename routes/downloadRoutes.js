const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const downloadController = require('../controllers/downloadController');
const path = require('path');

const router = express.Router();

// Public routes
router.get('/', downloadController.getAllDownloads);
router.get('/:id', downloadController.getDownload);

// Protected routes
router.use(protect);

// Routes for teachers and admins only
router.use(restrictTo('teacher', 'admin'));
router.post('/', downloadController.createDownload);
router.patch('/:id', downloadController.updateDownload);
router.delete('/:id', downloadController.deleteDownload);

module.exports = router;