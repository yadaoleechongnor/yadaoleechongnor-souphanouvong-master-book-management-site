const Download = require('../models/downloadModel');
const Book = require('../models/bookModel');

// Record a new download
exports.recordDownload = async (req, res) => {
  try {
    // Check if the book exists
    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    // Create a download record
    const download = await Download.create({
      user_id: req.user.id,
      book_id: req.params.bookId,
    });

    res.status(201).json({
      success: true,
      data: {
        download,
        bookUrl: book.book_file.url,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all downloads - Admin only
exports.getAllDownloads = async (req, res) => {
  try {
    const downloads = await Download.find()
      .populate('user_id', 'user_name email role')
      .populate('book_id', 'title author');

    res.status(200).json({
      success: true,
      results: downloads.length,
      data: {
        downloads,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get downloads by user - Admin or own downloads
exports.getUserDownloads = async (req, res) => {
  try {
    // Check if user is requesting own downloads or is admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these downloads',
      });
    }

    const downloads = await Download.find({ user_id: req.params.userId })
      .populate('book_id', 'title author upload_date');

    res.status(200).json({
      success: true,
      results: downloads.length,
      data: {
        downloads,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get downloads for a book - Admin or teacher
exports.getBookDownloads = async (req, res) => {
  try {
    const downloads = await Download.find({ book_id: req.params.bookId })
      .populate('user_id', 'user_name email role');

    res.status(200).json({
      success: true,
      results: downloads.length,
      data: {
        downloads,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};