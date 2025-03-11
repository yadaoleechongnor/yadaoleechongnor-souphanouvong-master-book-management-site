const { body } = require('express-validator');

exports.validateUserRegistration = [
  body('user_name').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone_number')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('branch_id').optional(),
  body('year').optional().isNumeric().withMessage('Year must be a number'),
  body('student_code').optional(),
];

exports.validateUserLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.validatePasswordReset = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

exports.validateBookCreate = [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('branch_id').notEmpty().withMessage('Branch ID is required'),
  body('year').isNumeric().withMessage('Year must be a number'),
  body('abstract').optional(),
];

exports.validateFaculty = [
  body('faculties_name').notEmpty().withMessage('Faculty name is required'),
];

exports.validateDepartment = [
  body('department_name').notEmpty().withMessage('Department name is required'),
  body('faculties_id').notEmpty().withMessage('Faculty ID is required'),
];

exports.validateSubjectDepartment = [
  body('subject_department_name')
    .notEmpty()
    .withMessage('Subject department name is required'),
  body('department_id').notEmpty().withMessage('Department ID is required'),
];