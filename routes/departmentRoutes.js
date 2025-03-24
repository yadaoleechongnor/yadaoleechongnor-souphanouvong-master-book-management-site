const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const departmentController = require('../controllers/departmentController');

const router = express.Router();

// Public routes
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartment);

// Admin only routes
router.use(protect, restrictTo('admin'));
router.post('/', departmentController.createDepartment);
router.patch('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;