const express = require('express');
const app = express();

const Book = require('../models/bookModel');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs'); 
const path = require('path');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('File received:', file);
    cb(null, true);
  },
}).any(); // Use .any() to accept any fields and debug

// Create custom async handler in case the package is not installed
let asyncHandler;
try {
  asyncHandler = require('express-async-handler');
} catch (error) {
  console.log('express-async-handler not found, using custom implementation');
  // Custom implementation of asyncHandler
  asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper function to calculate text similarity score
const calculateSimilarityScore = (text, searchTerm) => {
  if (!text || !searchTerm) return 0;
  
  text = text.toLowerCase();
  searchTerm = searchTerm.toLowerCase();
  
  // Exact match gets highest score
  if (text === searchTerm) return 100;
  
  // Calculate how many terms from the search query appear in the text
  const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 1);
  let score = 0;
  
  // If the entire search term is contained in the text
  if (text.includes(searchTerm)) {
    score += 80;
  }
  
  // Add points for each search term that appears in the text
  searchTerms.forEach(term => {
    if (text.includes(term)) {
      score += 10;
      
      // Bonus points if the term appears at the beginning of the text
      if (text.startsWith(term)) {
        score += 5;
      }
    }
  });
  
  // Normalize score between 0-100
  return Math.min(100, score);
};

// Get all books
exports.getAllBooks = asyncHandler(async (req, res) => {
  const books = await Book.find()
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  res.status(200).json({
    success: true,
    count: books.length,
    data: books
  });
});

// Get book by ID
exports.getBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id)
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'No book found with that ID'
    });
  }

  res.status(200).json({
    success: true,
    data: book
  });
});

exports.getBranchesWithBooks = asyncHandler(async (req, res) => {
  try {
    // Aggregate to find branches with books
    const branchesWithBooks = await Book.aggregate([
      {
        $group: {
          _id: '$branch_id',
          bookCount: { $sum: 1 },
          books: { $push: '$$ROOT' } // Collect all books for each branch
        }
      },
      {
        $match: {
          bookCount: { $gt: 0 }
        }
      }
    ]);

    // Extract branch IDs
    const branchIds = branchesWithBooks.map(item => item._id);

    // Get the full branch details
    const Branch = mongoose.model('Branch');
    const branches = await Branch.find({ 
      _id: { $in: branchIds } 
    });

    // Add book count, branch name, and books to each branch
    const branchesWithDetails = branchesWithBooks.map(branchData => {
      const branch = branches.find(
        b => b._id.toString() === branchData._id.toString()
      );
      return {
        branch: {
          _id: branch._id,
          branch_name: branch.branch_name // Use branch_name as defined in the Branch model
        },
        books: branchData.books // Include books for the branch
      };
    });

    res.status(200).json({
      success: true,
      count: branchesWithDetails.length,
      data: branchesWithDetails
    });
  } catch (error) {
    console.error('Error getting branches with books:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving branches with books',
      error: error.message
    });
  }
});

// Search books by title - with relevance ranking
exports.searchBooksByTitle = asyncHandler(async (req, res) => {
  const { title } = req.query;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a title to search'
    });
  }
  
  // Get all books and populate necessary fields
  const allBooks = await Book.find()
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  // Score and sort books by title similarity
  const scoredBooks = allBooks.map(book => {
    const score = calculateSimilarityScore(book.title, title);
    return { book, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Extract just the books for response
  const rankedBooks = scoredBooks.map(item => item.book);
  
  res.status(200).json({
    success: true,
    count: rankedBooks.length,
    data: rankedBooks
  });
});

// Create a book - Teachers and Admins only
exports.createBook = [
  upload,
  async (req, res) => {
    try {
      console.log('After multer - req.body:', req.body);
      console.log('After multer - req.file:', req.file);
      console.log('req.files:', req.files);
      console.log('req.user:', req.user); // Log user information

      const file = req.files.find(f => f.fieldname === 'file');
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a book file with field name "file"',
        });
      }

      if (!req.body.title || !req.body.author || !req.body.branch_id || !req.body.year || !req.body.abstract) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields',
        });
      }

      // Get user information from either req.user (set by auth middleware) or from req.body
      const user = req.user || (req.body.userId && req.body.role ? {
        id: req.body.userId,
        role: req.body.role
      } : null);

      // Check if user info is available
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in.',
        });
      }

      // Check if user has appropriate role
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create a book',
        });
      }

      // Construct the HTTP URL for the file
      const fileUrl = `http://localhost:5000/uploads/${file.filename}`;

      const newBook = await Book.create({
        title: req.body.title,
        author: req.body.author,
        branch_id: req.body.branch_id,
        year: req.body.year,
        abstract: req.body.abstract,
        book_file: {
          public_id: file.filename,
          url: fileUrl, // Store the HTTP URL instead of the local file path
        },
        uploaded_by: user.id,
      });

      res.status(201).json({
        success: true,
        data: {
          book: newBook,
        },
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create book',
        stack: error.stack,
      });
    }
  }
];

// Update a book - Teachers (own books) and Admins only
exports.updateBook = async (req, res) => {
  try {
    // Get user information from either req.user (set by auth middleware) or from req.body
    const user = req.user || (req.body.userId && req.body.role ? {
      id: req.body.userId,
      role: req.body.role
    } : null);

    // Check if user info is available
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }
    
    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    // Check if user is the uploader or admin
    if (
      user.role !== 'admin' &&
      book.uploaded_by.toString() !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this book',
      });
    }

    // Handle file upload if new file is provided
    if (req.file) {
      // Update with new file
      book.book_file = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    // Update other book details
    book.title = req.body.title || book.title;
    book.author = req.body.author || book.author;
    book.branch_id = req.body.branch_id || book.branch_id;
    book.year = req.body.year || book.year;
    book.abstract = req.body.abstract || book.abstract;

    await book.save();

    res.status(200).json({
      success: true,
      data: {
        book,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a book - Teachers and Admins only
exports.deleteBook = async (req, res) => {
  try {
    // Debug user information
    console.log('Delete request from user:', {
      userId: req.user ? req.user.id : 'no user id',
      userRole: req.user ? req.user.role : 'no user role',
      bookId: req.params.id
    });
    
    // Allow both teachers and admins to delete books
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
      console.log('Permission denied - user role:', req.user ? req.user.role : 'undefined');
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this book',
      });
    }

    console.log('Permission granted for role:', req.user.role);
    
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    // Log the book details before deletion
    console.log('Deleting book:', book);

    // Delete file from local storage
    const filePath = path.join(uploadsDir, book.book_file.public_id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete book from database
    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};