const express = require('express');
const bookController = require('../controllers/bookController');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply authentication middleware to routes that require user information
router.use(authController.protect);

router
  .route('/')
  .get(bookController.getAllBooks)
  .post(bookController.createBook);

router
  .route('/:id')
  .get(bookController.getBook)
  .patch(bookController.updateBook)
  .delete(bookController.deleteBook);

module.exports = router;