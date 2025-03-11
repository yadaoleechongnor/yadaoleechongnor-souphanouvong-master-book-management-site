const express = require('express');
const bookController = require('../controllers/bookController');
const { protect, restrictTo } = require('../middlewares/authMiddleware'); // Corrected path

const router = express.Router();

router
  .route('/')
  .get(bookController.getAllBooks)
  .post(protect, restrictTo('admin', 'teacher'), bookController.createBook);

router
  .route('/:id')
  .get(bookController.getBook)
  .patch(protect, restrictTo('admin', 'teacher'), bookController.updateBook)
  .delete(protect, restrictTo('admin'), bookController.deleteBook);

router.get('/:id/view', bookController.viewBookPDF);

module.exports = router;