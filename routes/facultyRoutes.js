const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const facultyController = require('../controllers/facultyController');

const router = express.Router();

// Public routes
router.get('/', facultyController.getAllFaculties);
router.get('/:id', facultyController.getFaculty);

// Admin only routes
router.use(protect, restrictTo('admin'));
router.post('/', facultyController.createFaculty);
router.patch('/:id', facultyController.updateFaculty);
router.delete('/:id', facultyController.deleteFaculty);

module.exports = router;