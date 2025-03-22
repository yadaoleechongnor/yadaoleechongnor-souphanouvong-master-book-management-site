const express = require('express');
const bookController = require('../controllers/bookController');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply authentication middleware to routes that require user information
// router.use(authController.protect);

// Get all books
router.get('/', bookController.getAllBooks);

// Get books by branch
router.get('/branch/:branchId', bookController.getBooksByBranch);

// Search books by branch name (new route)
router.get('/search/branch', bookController.searchBooksByBranchName);

// Get books by year
// router.get('/year/:year', bookController.getBooksByYear);

// Search books by author
router.get('/search/author', bookController.searchBooksByAuthor);

// Get books by uploader
router.get('/uploader/:uploaderId', bookController.getBooksByUploader);

// Search books by title
router.get('/search/title', bookController.searchBooksByTitle);

// Make sure this route comes BEFORE any routes with path parameters like :id
router.get('/year', bookController.searchBooksByYear);

router
  .route('/')
  // .get(bookController.getAllBooks)
  .post(bookController.createBook);

router
  .route('/:id')
  .get(bookController.getBook)
  .patch(bookController.updateBook)
  .delete(bookController.deleteBook);

module.exports = router;