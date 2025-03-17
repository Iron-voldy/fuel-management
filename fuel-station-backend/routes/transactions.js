const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/attachments/');
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

// @route   GET api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', auth, transactionController.getAllTransactions);

// @route   GET api/transactions/stats
// @desc    Get transaction statistics
// @access  Private
router.get('/stats', auth, transactionController.getTransactionStats);

// @route   GET api/transactions/:id
// @desc    Get a transaction by ID
// @access  Private
router.get('/:id', auth, transactionController.getTransaction);

// @route   POST api/transactions
// @desc    Create a new transaction
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('accountId', 'Account ID is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('type', 'Type must be deposit or withdrawal').isIn(['deposit', 'withdrawal']),
      check('description', 'Description is required').not().isEmpty()
    ]
  ],
  transactionController.createTransaction
);

// @route   PUT api/transactions/:id
// @desc    Update a transaction
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('description', 'Description is required').optional().not().isEmpty(),
      check('category', 'Category is required').optional().not().isEmpty(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  transactionController.updateTransaction
);

// @route   DELETE api/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/:id', auth, transactionController.deleteTransaction);

// @route   POST api/transactions/batch-reconcile
// @desc    Batch reconcile transactions
// @access  Private
router.post(
  '/batch-reconcile',
  [
    auth,
    [
      check('transactionIds', 'Transaction IDs must be an array').isArray(),
      check('isReconciled', 'isReconciled must be a boolean').optional().isBoolean()
    ]
  ],
  transactionController.batchReconcileTransactions
);

// @route   PUT api/transactions/:id/reconcile
// @desc    Toggle reconciliation status
// @access  Private
router.put('/:id/reconcile', auth, transactionController.reconcileTransaction);

// @route   POST api/transactions/:id/attachments
// @desc    Add attachment to transaction
// @access  Private
router.post(
  '/:id/attachments',
  [auth, upload.single('attachment')],
  transactionController.uploadAttachment
);

// @route   DELETE api/transactions/:id/attachments/:attachmentId
// @desc    Delete attachment from transaction
// @access  Private
router.delete(
  '/:id/attachments/:attachmentId',
  auth,
  transactionController.deleteAttachment
);

module.exports = router;