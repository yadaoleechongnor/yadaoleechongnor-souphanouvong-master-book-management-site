// ...existing code...

// Make sure your schema includes purpose field
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['verification', 'reset', 'login'],
    default: 'verification',
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  }
});

// Add an index to improve query performance
otpSchema.index({ email: 1, createdAt: -1 });

// ...existing code...
