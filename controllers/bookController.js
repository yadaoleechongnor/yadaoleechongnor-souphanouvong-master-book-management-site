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
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${sanitizedFilename}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
}).single('file');

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

// Comprehensive search function for books
exports.searchBooks = asyncHandler(async (req, res) => {
  try {
    const { search, fields } = req.query; // Changed from 'query' to 'search'
  
    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    // Get all books with populated fields
    const allBooks = await Book.find()
      .populate('branch_id', 'branch_name')
      .populate('uploaded_by', 'name email');

    // Parse fields to search if provided
    const searchFields = fields ? fields.split(',') : ['title', 'author', 'year', 'branch'];

    // Score and sort books by multiple criteria
    const scoredBooks = allBooks.map(book => {
      let totalScore = 0;
      const searchQuery = search.toLowerCase();

      // Calculate score based on specified fields
      searchFields.forEach(field => {
        switch(field.trim()) {
          case 'title':
            totalScore += calculateSimilarityScore(book.title, searchQuery) * 3;
            break;
          case 'author':
            totalScore += calculateSimilarityScore(book.author, searchQuery) * 2;
            break;
          case 'branch':
            if (book.branch_id && book.branch_id.branch_name) {
              totalScore += calculateSimilarityScore(book.branch_id.branch_name, searchQuery) * 1.5;
            }
            break;
          case 'year':
            if (book.year && searchQuery.includes(book.year.toString())) {
              totalScore += 50;
            }
            break;
          case 'abstract':
            if (book.abstract) {
              totalScore += calculateSimilarityScore(book.abstract, searchQuery);
            }
            break;
        }
      });

      // Find similar books
      const similarBooks = allBooks
        .filter(otherBook => 
          otherBook._id.toString() !== book._id.toString() &&
          calculateSimilarityScore(otherBook.title, book.title) > 60
        )
        .map(similarBook => ({
          _id: similarBook._id,
          title: similarBook.title,
          author: similarBook.author,
          similarity: calculateSimilarityScore(similarBook.title, book.title)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      return {
        book: {
          ...book.toObject(),
          similarBooks
        },
        score: totalScore
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    // Format response
    const searchResults = scoredBooks.map(({ book }) => book);

    res.status(200).json({
      success: true,
      count: searchResults.length,
      data: searchResults
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
});

// Helper function to calculate combined score across all fields
const calculateCombinedScore = (book, query) => {
  let score = 0;
  
  // Title search (highest weight)
  score += calculateSimilarityScore(book.title, query) * 3;
  
  // Author search
  score += calculateSimilarityScore(book.author, query) * 2;
  
  // Branch name search
  if (book.branch_id && book.branch_id.branch_name) {
    score += calculateSimilarityScore(book.branch_id.branch_name, query) * 1.5;
  }
  
  // Abstract search
  if (book.abstract) {
    score += calculateSimilarityScore(book.abstract, query);
  }
  
  // Year search
  if (book.year && query.includes(book.year.toString())) {
    score += 50;
  }
  
  return score;
};

// Create a book - Teachers and Admins only
exports.createBook = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Convert year to number
    const year = parseInt(req.body.year, 10);
    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Year must be a valid number'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    const newBook = await Book.create({
      title: req.body.title,
      author: req.body.author,
      branch_id: req.body.branch_id,
      year: year, // Use converted year
      abstract: req.body.abstract,
      book_file: {
        public_id: req.file.filename,
        url: fileUrl
      },
      uploaded_by: req.user.id
    });

    res.status(201).json({
      success: true,
      data: newBook
    });
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating book',
      error: error.message
    });
  }
};

// Update a book - Teachers (own books) and Admins only
exports.updateBook = async (req, res) => {
  try {
    console.log('Update request:', {
      body: req.body,
      file: req.file,
      user: req.user
    });

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID'
      });
    }

    // Allow both teachers and admins to update
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this book'
      });
    }

    // Check if there's anything to update
    if (!req.file && Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    let updateData = {};

    // Handle file update if new file is provided
    if (req.file) {
      // Delete old file if it exists
      if (book.book_file && book.book_file.public_id) {
        const oldFilePath = path.join(uploadsDir, book.book_file.public_id);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      updateData.book_file = {
        public_id: req.file.filename,
        url: fileUrl
      };
    }

    // Handle other fields
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.author) updateData.author = req.body.author;
    if (req.body.branch_id) updateData.branch_id = req.body.branch_id;
    if (req.body.abstract) updateData.abstract = req.body.abstract;
    
    // Handle year separately for validation
    if (req.body.year) {
      const year = parseInt(req.body.year, 10);
      if (isNaN(year)) {
        return res.status(400).json({
          success: false,
          message: 'Year must be a valid number'
        });
      }
      updateData.year = year;
    }

    // Update book with new data
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('branch_id', 'name')
     .populate('uploaded_by', 'name email');

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book',
      error: error.message
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