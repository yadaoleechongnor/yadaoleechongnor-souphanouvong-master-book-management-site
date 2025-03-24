const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A download must have a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    file: {
      type: String,
      required: [true, 'A download must have a file'],
    },
    uploadedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A download must belong to a user'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-find middleware to populate user data
downloadSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'uploadedBy',
    select: 'name email role',
  });
  next();
});

const Download = mongoose.model('Download', downloadSchema);

module.exports = Download;