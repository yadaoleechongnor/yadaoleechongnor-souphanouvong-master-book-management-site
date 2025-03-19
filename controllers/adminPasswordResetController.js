const User = require('../models/userModel');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Request admin password reset (generates token and returns it directly)
exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find admin by email
    const user = await User.findOne({ 
      email, 
      role: 'admin' 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No admin found with that email',
      });
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token expiry (30 minutes)
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    
    await user.save({ validateBeforeSave: false });

    // Create reset URL for frontend with special admin path
    const resetURL = `http://localhost:5173/admin-reset-password/${resetToken}`;

    // Return the token and URL directly to the client
    res.status(200).json({
      success: true,
      message: 'Admin password reset token generated successfully',
      resetToken: resetToken,
      resetURL: resetURL,
      expiresIn: '30 minutes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify admin reset token
exports.verifyAdminResetToken = async (req, res) => {
  try {
    // Get token from parameters
    const { token } = req.params;
    
    // Hash the token from the URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find admin with matching token and valid expiration
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      role: 'admin'
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired',
      });
    }

    // If token is valid
    res.status(200).json({
      success: true,
      message: 'Admin token is valid',
      email: user.email
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reset admin password with token
exports.resetAdminPassword = async (req, res) => {
  try {
    // Get token from parameters
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    // Hash the token from the URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find admin with matching token and valid expiration
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      role: 'admin'
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired',
      });
    }

    // Update the password directly without triggering validators
    await User.findByIdAndUpdate(
      user._id,
      {
        password: await bcrypt.hash(password, 12), // Manually hash password 
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      },
      { 
        new: true,
        runValidators: false // Skip validation
      }
    );

    res.status(200).json({
      success: true,
      message: 'Admin password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
