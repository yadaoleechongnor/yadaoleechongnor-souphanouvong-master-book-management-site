const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Only define the schema if it doesn't exist yet
let User;

// Check if the model already exists
if (mongoose.models && mongoose.models.User) {
  User = mongoose.models.User;
} else {
  // Define new schema and model
  const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    phone_number: {
      type: String,
      trim: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    year: {
      type: String,
      trim: true,
    },
    student_code: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student','teacher', 'admin'],
      default: 'studnet',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }, {
    timestamps: true,
  });

  // Password hashing middleware
  userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
      // Generate a salt
      const salt = await bcrypt.genSalt(10);
      
      // Hash the password along with the new salt
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  // Method to compare password for login
  userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User = mongoose.model('User', userSchema);
}

// Export the User model
module.exports = User;
