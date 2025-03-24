const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const bookController = require('../controllers/bookController');

const router = express.Router();

// Public routes - Anyone can view books
router.get('/', bookController.getAllBooks);
router.get('/getbookwithbranch', bookController.getBranchesWithBooks);
router.get('/searchbook', bookController.searchBooksByTitle);
router.get('/:id', bookController.getBook);

// Protected routes - Only authenticated users can access these
router.use(protect);

// Teacher and admin only routes - Only these roles can create/update/delete books
router.post('/', restrictTo('teacher', 'admin'), bookController.createBook);
router.patch('/:id', restrictTo('teacher', 'admin'), bookController.updateBook);
router.delete('/:id', restrictTo('teacher', 'admin'), bookController.deleteBook);

module.exports = router;