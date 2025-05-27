const User = require('../models/userModel');

// Function to increment login count when user logs in
exports.incrementLoginCount = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find the user and increment their login count
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If loginCount doesn't exist yet, initialize it to 0 before incrementing
    if (!user.loginCount) {
      user.loginCount = 0;
    }
    
    user.loginCount += 1;
    user.lastLogin = new Date();
    
    await user.save();
    
    return res.status(200).json({
      message: 'Login count incremented successfully',
      loginCount: user.loginCount
    });
  } catch (error) {
    console.error('Error incrementing login count:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Function to get user login count
exports.getLoginCount = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({
      userId: user._id,
      loginCount: user.loginCount || 0,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Error getting login count:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
