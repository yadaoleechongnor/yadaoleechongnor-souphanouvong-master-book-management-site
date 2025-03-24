const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');  // Changed from 'middlewares' to 'middleware'
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes
router.use(protect); // All routes after this middleware require authentication

// Current user routes
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMyPassword', authController.updatePassword);

// Admin only routes
router.use(restrictTo('admin'));

// Routes for getting users by role
router.get('/users', userController.getAllUsers);
router.get('/students', userController.getAllStudents);
router.get('/teachers', userController.getAllTeachers);
router.get('/admins', userController.getAllAdmins);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;