const express = require('express');
const router = express.Router();
const adminPasswordResetController = require('../controllers/adminPasswordResetController');

// Admin password reset routes (separate from student/teacher routes)
router.post('/forgot-password', adminPasswordResetController.adminForgotPassword);
router.get('/verify-token/:token', adminPasswordResetController.verifyAdminResetToken);
router.post('/reset-password/:token', adminPasswordResetController.resetAdminPassword);

module.exports = router;
