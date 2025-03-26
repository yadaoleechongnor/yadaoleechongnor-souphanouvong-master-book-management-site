const Download = require('../models/downloadModel');
const Book = require('../models/bookModel');
const path = require('path');
const fs = require('fs');

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

// Download a book PDF and record the download
exports.downloadBookPdf = async (req, res) => {
  try {
    // Check if the book exists
    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    // Verify book has a PDF file
    if (!book.book_file || !book.book_file.url) {
      return res.status(404).json({
        success: false,
        message: 'This book does not have a PDF file available for download',
      });
    }

    // Create a download record
    await Download.create({
      user_id: req.user.id,
      book_id: req.params.bookId,
    });

    // Determine file path (this assumes book_file.url contains a relative path to your file storage)
    const filePath = path.resolve(process.cwd(), book.book_file.url);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on server',
      });
    }

    // Set download headers
    const fileName = book.title.replace(/\s+/g, '_') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get popular books based on download count
exports.getPopularBooks = async (req, res) => {
  try {
    // Set default limit to 10 if not specified
    const limit = parseInt(req.query.limit) || 10;
    
    // Aggregate downloads to get download counts per book
    const popularBooks = await Download.aggregate([
      // Group by book_id and count downloads
      {
        $group: {
          _id: '$book_id',
          downloadCount: { $sum: 1 }
        }
      },
      // Sort by download count in descending order
      {
        $sort: { downloadCount: -1 }
      },
      // Limit to the requested number of results
      {
        $limit: limit
      },
      // Look up book details
      {
        $lookup: {
          from: 'books', // Use your actual books collection name
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      // Unwind the bookDetails array
      {
        $unwind: '$bookDetails'
      },
      // Project the fields we want to return
      {
        $project: {
          _id: 1,
          bookId: '$_id',
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          coverImage: '$bookDetails.cover_image',
          downloadCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      results: popularBooks.length,
      data: {
        popularBooks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get download statistics
exports.getDownloadStats = async (req, res) => {
  try {
    const stats = await Download.aggregate([
      // Group by book_id
      {
        $group: {
          _id: '$book_id',
          totalDownloads: { $sum: 1 },
          firstDownload: { $min: '$download_date' },
          lastDownload: { $max: '$download_date' }
        }
      },
      // Sort by total downloads in descending order
      {
        $sort: { totalDownloads: -1 }
      },
      // Look up book details
      {
        $lookup: {
          from: 'books', // Use your actual books collection name
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      // Unwind the bookDetails array
      {
        $unwind: '$bookDetails'
      },
      // Project the fields we want to return
      {
        $project: {
          _id: 0,
          bookId: '$_id',
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          totalDownloads: 1,
          firstDownload: 1,
          lastDownload: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      results: stats.length,
      data: {
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get weekly download trends
exports.getDownloadTrends = async (req, res) => {
  try {
    // Default to last 6 weeks if not specified
    const weeks = parseInt(req.query.weeks) || 6;
    const currentDate = new Date();
    
    // Calculate the date x weeks ago
    const startDate = new Date();
    startDate.setDate(currentDate.getDate() - (weeks * 7));
    
    const trends = await Download.aggregate([
      // Match documents from the last x weeks
      {
        $match: {
          download_date: { $gte: startDate }
        }
      },
      // Add a week field
      {
        $addFields: {
          week: { 
            $week: '$download_date' 
          },
          year: { 
            $year: '$download_date' 
          }
        }
      },
      // Group by week and year
      {
        $group: {
          _id: { 
            week: '$week', 
            year: '$year' 
          },
          count: { $sum: 1 },
          downloads: { $push: { bookId: '$book_id', date: '$download_date' } }
        }
      },
      // Sort by year and week
      {
        $sort: { 
          '_id.year': 1, 
          '_id.week': 1 
        }
      },
      // Project to a more readable format
      {
        $project: {
          _id: 0,
          week: '$_id.week',
          year: '$_id.year',
          totalDownloads: '$count',
          downloads: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      results: trends.length,
      data: {
        trends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Simple CRUD controllers
const getAllDownloads = async (req, res) => {
  try {
    const downloads = await Download.find();
    res.status(200).json({
      status: 'success',
      results: downloads.length,
      data: {
        downloads,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

const getDownload = async (req, res) => {
  try {
    const download = await Download.findById(req.params.id);
    
    if (!download) {
      return res.status(404).json({
        status: 'fail',
        message: 'Download not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        download,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

const createDownload = async (req, res) => {
  try {
    const newDownload = await Download.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        download: newDownload,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message,
    });
  }
};

const updateDownload = async (req, res) => {
  try {
    const download = await Download.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!download) {
      return res.status(404).json({
        status: 'fail',
        message: 'Download not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        download,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message,
    });
  }
};

const deleteDownload = async (req, res) => {
  try {
    const download = await Download.findByIdAndDelete(req.params.id);
    
    if (!download) {
      return res.status(404).json({
        status: 'fail',
        message: 'Download not found',
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message,
    });
  }
};

module.exports = {
  getAllDownloads,
  getDownload,
  createDownload,
  updateDownload,
  deleteDownload,
  downloadBookPdf: exports.downloadBookPdf,
  recordDownload: exports.recordDownload,
  getUserDownloads: exports.getUserDownloads,
  getBookDownloads: exports.getBookDownloads,
  getPopularBooks: exports.getPopularBooks,
  getDownloadStats: exports.getDownloadStats,
  getDownloadTrends: exports.getDownloadTrends
};