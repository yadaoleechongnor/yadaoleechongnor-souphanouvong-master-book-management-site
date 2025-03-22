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

// Get books by branch
exports.getBooksByBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  
  const books = await Book.find({ branch_id: branchId })
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  res.status(200).json({
    success: true,
    count: books.length,
    data: books
  });
});

// Search books by branch name - with relevance ranking
exports.searchBooksByBranchName = asyncHandler(async (req, res) => {
  // Accept both branchName and branch as query parameters for flexibility
  const branchName = req.query.branchName || req.query.branch;
  
  if (!branchName) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a branch name to search'
    });
  }

  console.log(`Searching for branch with name containing: "${branchName}"`);
  
  try {
    // First find branches that match the name pattern
    const Branch = mongoose.model('Branch');
    
    // Log all branches to help diagnose the issue
    const allBranches = await Branch.find({});
    console.log('All available branches:', allBranches.map(b => b.name));
    
    // Get all branches for scoring
    const branches = await Branch.find({});
    
    // Score and sort branches by relevance
    const scoredBranches = branches.map(branch => {
      const score = calculateSimilarityScore(branch.name, branchName);
      return { branch, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    console.log(`Found ${scoredBranches.length} branches with similarity scores`);
    
    if (scoredBranches.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Get branch IDs from scored branches
    const branchIds = scoredBranches.map(item => item.branch._id);
    
    // Find books belonging to these branches
    const books = await Book.find({ branch_id: { $in: branchIds } })
      .populate('branch_id', 'name')
      .populate('uploaded_by', 'name email');
    
    // Score and sort books by branch relevance
    const scoredBooks = books.map(book => {
      const branchItem = scoredBranches.find(
        item => item.branch._id.toString() === book.branch_id._id.toString()
      );
      return {
        book,
        score: branchItem ? branchItem.score : 0
      };
    }).sort((a, b) => b.score - a.score);
    
    // Extract just the books for response
    const rankedBooks = scoredBooks.map(item => item.book);
    
    return res.status(200).json({
      success: true,
      count: rankedBooks.length,
      data: rankedBooks
    });
    
  } catch (error) {
    console.error('Error in searchBooksByBranchName:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching for books by branch name',
      error: error.message
    });
  }
});

// Get books by year
exports.getBooksByYear = asyncHandler(async (req, res) => {
  const { year } = req.params;
  
  const books = await Book.find({ year: Number(year) })
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  res.status(200).json({
    success: true,
    count: books.length,
    data: books
  });
});

// Search books by year (using query parameter)
exports.searchBooksByYear = asyncHandler(async (req, res) => {
  const { year } = req.query;
  
  if (!year || isNaN(Number(year))) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid year parameter'
    });
  }
  
  const books = await Book.find({ year: Number(year) })
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  res.status(200).json({
    success: true,
    count: books.length,
    data: books
  });
});

// Search books by author (search) - with relevance ranking
exports.searchBooksByAuthor = asyncHandler(async (req, res) => {
  const { author } = req.query;
  
  if (!author) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an author name to search'
    });
  }
  
  // Get all books and populate necessary fields
  const allBooks = await Book.find()
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  // Score and sort books by author name similarity
  const scoredBooks = allBooks.map(book => {
    const score = calculateSimilarityScore(book.author, author);
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

// Get books by uploader
exports.getBooksByUploader = asyncHandler(async (req, res) => {
  const { uploaderId } = req.params;
  
  const books = await Book.find({ uploaded_by: uploaderId })
    .populate('branch_id', 'name')
    .populate('uploaded_by', 'name email');
  
  res.status(200).json({
    success: true,
    count: books.length,
    data: books
  });
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

      if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
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
        uploaded_by: req.user.id,
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
    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    // Check if user is the uploader or admin
    if (
      req.user.role !== 'admin' &&
      book.uploaded_by.toString() !== req.user.id
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

// Delete a book - Admins only
exports.deleteBook = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this book',
      });
    }

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
    console.error('Error deleting book:', error); // Add this line to log the error
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};