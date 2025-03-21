const express = require('express');
const router = express.Router();
const { requestOTP, verifyOTP, requestPasswordResetOTP, resetPassword, verifyUserEmail } = require('../controllers/otpController');

// OTP request routes
router.post('/request', requestOTP);
router.post('/request-password-reset', requestPasswordResetOTP);

// OTP verification routes
router.post('/verify', verifyOTP);
router.post('/verify-email', verifyOTP); // Use the verifyOTP handler for email verification too

// Password reset route
router.post('/reset-password', resetPassword);

// Specific email verification route
router.post('/verify-user-email', verifyUserEmail);

module.exports = router;
