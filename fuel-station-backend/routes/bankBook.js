const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const bankBookController = require('../controllers/bankBookController');
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

// Bank Account Routes
// @route   GET api/bank-book/accounts
// @desc    Get all bank accounts
// @access  Private
router.get('/accounts', auth, bankBookController.getAllAccounts);

// @route   GET api/bank-book/accounts/dashboard
// @desc    Get all accounts with balances for dashboard
// @access  Private
router.get('/accounts/dashboard', auth, bankBookController.getAccountsDashboard);

// @route   GET api/bank-book/accounts/:id
// @desc    Get a single bank account
// @access  Private
router.get('/accounts/:id', auth, bankBookController.getAccountById);

// @route   POST api/bank-book/accounts
// @desc    Create a new bank account
// @access  Private
router.post(
  '/accounts',
  [
    auth,
    [
      check('accountName', 'Account name is required').not().isEmpty(),
      check('accountNumber', 'Account number is required').not().isEmpty(),
      check('bankName', 'Bank name is required').not().isEmpty()
    ]
  ],
  bankBookController.createAccount
);

// @route   PUT api/bank-book/accounts/:id
// @desc    Update a bank account
// @access  Private
router.put(
  '/accounts/:id',
  [
    auth,
    [
      check('accountName', 'Account name is required').optional().not().isEmpty(),
      check('bankName', 'Bank name is required').optional().not().isEmpty()
    ]
  ],
  bankBookController.updateAccount
);

// @route   DELETE api/bank-book/accounts/:id
// @desc    Delete a bank account
// @access  Private
router.delete('/accounts/:id', auth, bankBookController.deleteAccount);

// @route   GET api/bank-book/accounts/:id/summary
// @desc    Get account balance and transaction summary
// @access  Private
router.get('/accounts/:id/summary', auth, bankBookController.getAccountSummary);

// @route   POST api/bank-book/accounts/:id/reconcile
// @desc    Perform bank reconciliation
// @access  Private
router.post(
  '/accounts/:id/reconcile',
  [
    auth,
    [
      check('statementBalance', 'Statement balance is required').isNumeric(),
      check('reconciliationDate', 'Valid reconciliation date is required').optional().isDate()
    ]
  ],
  bankBookController.reconcileAccount
);

// @route   GET api/bank-book/accounts/:id/reconciliation
// @desc    Get reconciliation summary for an account
// @access  Private
router.get(
  '/accounts/:id/reconciliation',
  auth,
  transactionController.getReconciliationSummary
);

// @route   POST api/bank-book/transfer
// @desc    Transfer funds between accounts
// @access  Private
router.post(
  '/transfer',
  [
    auth,
    [
      check('fromAccountId', 'Source account ID is required').not().isEmpty(),
      check('toAccountId', 'Destination account ID is required').not().isEmpty(),
      check('amount', 'Valid amount is required').isNumeric().custom(value => value > 0),
      check('date', 'Valid date is required').optional().isDate()
    ]
  ],
  bankBookController.transferFunds
);

// Transaction Routes
// @route   GET api/bank-book/transactions
// @desc    Get all transactions with optional filtering
// @access  Private
router.get('/transactions', auth, transactionController.getAllTransactions);

// @route   GET api/bank-book/transactions/stats
// @desc    Get transaction statistics and summary
// @access  Private
router.get('/transactions/stats', auth, transactionController.getTransactionStats);

// @route   POST api/bank-book/transactions/batch-reconcile
// @desc    Batch reconcile multiple transactions
// @access  Private
router.post(
  '/transactions/batch-reconcile',
  [
    auth,
    [
      check('transactionIds', 'Transaction IDs array is required').isArray(),
      check('isReconciled', 'Reconciliation status must be boolean').optional().isBoolean()
    ]
  ],
  transactionController.batchReconcileTransactions
);

// @route   GET api/bank-book/transactions/:id
// @desc    Get a single transaction
// @access  Private
router.get('/transactions/:id', auth, transactionController.getTransaction);

// @route   POST api/bank-book/transactions
// @desc    Create a new transaction
// @access  Private
router.post(
    '/transactions',
    [
      auth,
      [
        check('accountId', 'Account ID is required').not().isEmpty(),
        check('amount', 'Valid amount is required').isNumeric().custom(value => value > 0),
        check('type', 'Transaction type must be deposit or withdrawal').isIn(['deposit', 'withdrawal']),
        check('description', 'Description is required').not().isEmpty(),
        check('date', 'Valid date is required').optional().isISO8601()
      ]
    ],
    transactionController.createTransaction
  );

// @route   PUT api/bank-book/transactions/:id
// @desc    Update a transaction
// @access  Private
router.put(
  '/transactions/:id',
  [
    auth,
    [
      check('description', 'Description is required').optional().not().isEmpty(),
      check('category', 'Category is required').optional().not().isEmpty(),
      check('date', 'Valid date is required').optional().isDate()
    ]
  ],
  transactionController.updateTransaction
);

// @route   DELETE api/bank-book/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/transactions/:id', auth, transactionController.deleteTransaction);

// @route   PUT api/bank-book/transactions/:id/reconcile
// @desc    Mark transaction as reconciled
// @access  Private
router.put('/transactions/:id/reconcile', auth, transactionController.reconcileTransaction);

// @route   POST api/bank-book/transactions/:id/attachments
// @desc    Upload attachment for a transaction
// @access  Private
router.post(
  '/transactions/:id/attachments',
  [auth, upload.single('attachment')],
  transactionController.uploadAttachment
);

// @route   DELETE api/bank-book/transactions/:id/attachments/:attachmentId
// @desc    Delete attachment from a transaction
// @access  Private
router.delete(
  '/transactions/:id/attachments/:attachmentId',
  auth,
  transactionController.deleteAttachment
);

module.exports = router;