const express = require('express');
const router = express.Router();
const { requestOTP, verifyOTP } = require('../controllers/otpController');

// OTP request route - sends OTP to user's email
router.post('/request', requestOTP);

// OTP verification route - validates the OTP submitted by user
router.post('/verify', verifyOTP);

module.exports = router;
