const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/expenses/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and common document types
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// @route   GET api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', auth, expenseController.getAllExpenses);

// @route   GET api/expenses/summary
// @desc    Get expense summary for dashboard
// @access  Private
router.get('/summary', auth, expenseController.getExpenseSummary);

// @route   GET api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, expenseController.getExpenseById);

// @route   POST api/expenses
// @desc    Create a new expense
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('category', 'Category is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('paymentMethod', 'Payment method is required').not().isEmpty(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  expenseController.createExpense
);

// @route   PUT api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('category', 'Category is required').optional().not().isEmpty(),
      check('description', 'Description is required').optional().not().isEmpty(),
      check('amount', 'Amount must be a number').optional().isNumeric(),
      check('paymentMethod', 'Payment method is required').optional().not().isEmpty(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  expenseController.updateExpense
);

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, expenseController.deleteExpense);

// @route   PUT api/expenses/:id/approve
// @desc    Approve an expense
// @access  Private (Admin/Manager)
router.put(
  '/:id/approve',
  [
    auth,
    [
      check('accountId', 'Bank account ID is required for Bank Transfer payments').optional()
    ]
  ],
  expenseController.approveExpense
);

// @route   PUT api/expenses/:id/reject
// @desc    Reject an expense
// @access  Private (Admin/Manager)
router.put(
  '/:id/reject',
  [
    auth,
    [
      check('rejectionReason', 'Rejection reason is required').optional()
    ]
  ],
  expenseController.rejectExpense
);

// @route   POST api/expenses/:id/attachments
// @desc    Upload attachment for an expense
// @access  Private
router.post(
  '/:id/attachments',
  [auth, upload.single('attachment')],
  expenseController.uploadAttachment
);

// @route   DELETE api/expenses/:id/attachments/:attachmentId
// @desc    Delete attachment from an expense
// @access  Private
router.delete(
  '/:id/attachments/:attachmentId',
  auth,
  expenseController.deleteAttachment
);

module.exports = router;