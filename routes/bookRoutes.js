const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const bookController = require('../controllers/bookController');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${sanitizedFilename}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
}).single('file');

// Public routes - Anyone can view books
router.get('/', bookController.getAllBooks);
router.get('/getbookwithbranch', bookController.getBranchesWithBooks);
router.get('/searchbook', bookController.searchBooksByTitle);
router.get('/:id', bookController.getBook);

// Protected routes - Only authenticated users can access these
router.use(protect);

// Teacher and admin only routes - Only these roles can create/update/delete books
router.post('/', restrictTo('teacher', 'admin'), (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, bookController.createBook);

router.patch('/:id', restrictTo('teacher', 'admin'), (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, bookController.updateBook);

router.delete('/:id', restrictTo('teacher', 'admin'), bookController.deleteBook);

module.exports = router;