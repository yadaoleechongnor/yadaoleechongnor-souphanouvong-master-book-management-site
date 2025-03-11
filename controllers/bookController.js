const Book = require('../models/bookModel');
const { cloudinary } = require('../config/cloudinary');
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

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Find books
    let query = Book.find(queryObj)
      .populate({
        path: 'branch_id',
        select: 'branch_name',
        populate: {
          path: 'department_id',
          select: 'department_name',
          populate: {
            path: 'faculties_id',
            select: 'faculties_name'
          }
        }
      })
      .populate('uploaded_by', 'user_name');

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    const books = await query;

    // Add book_url to each book
    const booksWithUrl = books.map(book => ({
      ...book._doc,
      book_url: `${req.protocol}://${req.get('host')}/api/v1/books/${book._id}/view`
    }));

    res.status(200).json({
      success: true,
      results: booksWithUrl.length,
      data: {
        books: booksWithUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching books:', error); // Add this line to log the error
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single book
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate({
        path: 'branch_id',
        select: 'branch_name',
        populate: {
          path: 'department_id',
          select: 'department_name',
          populate: {
            path: 'faculties_id',
            select: 'faculties_name'
          }
        }
      })
      .populate('uploaded_by', 'user_name');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        book: {
          ...book._doc,
          book_url: `${req.protocol}://${req.get('host')}/api/view/books/${book._id}`
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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

      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'raw',
      });

      const newBook = await Book.create({
        title: req.body.title,
        author: req.body.author,
        branch_id: req.body.branch_id,
        year: req.body.year,
        abstract: req.body.abstract,
        book_file: {
          public_id: result.public_id,
          url: result.secure_url,
        },
        uploaded_by: req.user.id,
      });

      // Delete temporary file
      fs.unlinkSync(file.path);

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
      // Delete old file from cloudinary
      await cloudinary.uploader.destroy(book.book_file.public_id);

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

    // Delete file from cloudinary
    await cloudinary.uploader.destroy(book.book_file.public_id);

    // Delete book from database
    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Serve PDF book without token
exports.viewBookPDF = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with that ID',
      });
    }

    res.redirect(book.book_file.url);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};