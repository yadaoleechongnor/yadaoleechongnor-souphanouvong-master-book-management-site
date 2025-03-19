const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

// Route for requesting a password reset (generates token)
router.post('/forgot-password', passwordResetController.forgotPassword);

// Route for verifying reset token - Should be GET to match frontend request
router.get('/resetpassword/:token', passwordResetController.verifyResetToken);

// Route for resetting password with token
router.post('/resetpassword/:token', passwordResetController.resetPassword);

module.exports = router;
