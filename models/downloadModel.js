const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A download must be associated with a user'],
    },
    book_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'Book',
      required: [true, 'A download must be associated with a book'],
    },
    download_date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-find middleware to populate user and book data
downloadSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user_id',
    select: 'name email role',
  }).populate({
    path: 'book_id',
    select: 'title author'
  });
  next();
});

const Download = mongoose.model('Download', downloadSchema);

module.exports = Download;