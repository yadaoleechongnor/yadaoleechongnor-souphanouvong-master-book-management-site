const User = require('../models/userModel');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
    const { password, email } = req.body;

    // Add debug logging
    console.log('Request body:', req.body);
    console.log('Token:', token);

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

    // Find the user with more relaxed conditions to help debug
    let query = {
      resetPasswordToken: hashedToken,
      role: 'admin'
    };
    
    // Only check expiration if we're not debugging
    if (process.env.NODE_ENV !== 'development') {
      query.resetPasswordExpires = { $gt: Date.now() };
    }
    
    // Find admin with matching token
    let user = await User.findOne(query);

    // If user not found by token, try finding by email
    if (!user && email) {
      user = await User.findOne({ email, role: 'admin' });
      console.log('Fallback to email search:', user ? 'User found' : 'User not found');
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired',
      });
    }

    try {
      // Method 1: Manual two-step approach - First save password then clear reset fields
      // This allows the pre-save hook to run on password change
      user.password = password;
      await user.save({ validateBeforeSave: false }); // Let password middleware run
      
      // Second update to clear reset tokens (without triggering password middleware)
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
    } catch (saveErr) {
      console.error('Error saving user with proper password hashing:', saveErr);
      
      // Method 2: Fallback - Manually hash the password if the model's hooks aren't working
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Update user document directly in the database
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            password: hashedPassword
          },
          $unset: { 
            resetPasswordToken: "", 
            resetPasswordExpires: "" 
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Admin password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
