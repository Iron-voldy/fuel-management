const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const pettyCashController = require('../controllers/pettyCashController');
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/petty-cash/');
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

// @route   GET api/petty-cash
// @desc    Get all petty cash transactions
// @access  Private
router.get('/', auth, pettyCashController.getAllTransactions);

// @route   GET api/petty-cash/summary
// @desc    Get petty cash summary data for dashboard
// @access  Private
router.get('/summary', auth, pettyCashController.getSummary);

// @route   GET api/petty-cash/balance/:stationId
// @desc    Get petty cash balance for a station
// @access  Private
router.get('/balance/:stationId?', auth, pettyCashController.getBalance);

// @route   PUT api/petty-cash/balance/:stationId
// @desc    Update petty cash balance settings
// @access  Private (Admin/Manager)
router.put(
  '/balance/:stationId?',
  [
    auth,
    [
      check('maxLimit', 'Maximum limit must be a number greater than 0').optional().isFloat({ min: 0 }),
      check('minLimit', 'Minimum limit must be a number greater than 0').optional().isFloat({ min: 0 })
    ]
  ],
  pettyCashController.updateBalanceSettings
);

// @route   GET api/petty-cash/:id
// @desc    Get a single petty cash transaction
// @access  Private
router.get('/:id', auth, pettyCashController.getTransactionById);

// @route   POST api/petty-cash/withdrawal
// @desc    Create a new petty cash withdrawal request
// @access  Private
router.post(
  '/withdrawal',
  [
    auth,
    [
      check('amount', 'Amount is required and must be a number').isFloat({ min: 0.01 }),
      check('description', 'Description is required').notEmpty(),
      check('category', 'Category is required').notEmpty(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  pettyCashController.createWithdrawalRequest
);

// @route   POST api/petty-cash/replenishment
// @desc    Create a petty cash replenishment
// @access  Private (Admin/Manager)
router.post(
  '/replenishment',
  [
    auth,
    [
      check('amount', 'Amount is required and must be a number').isFloat({ min: 0.01 }),
      check('description', 'Description is required').optional(),
      check('accountId', 'Bank account ID must be valid').optional(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  pettyCashController.createReplenishment
);

// @route   PUT api/petty-cash/:id
// @desc    Update a petty cash transaction
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('description', 'Description is required').optional().notEmpty(),
      check('category', 'Category is required').optional().notEmpty(),
      check('date', 'Date must be valid').optional().isISO8601(),
      check('amount', 'Amount must be a number').optional().isFloat({ min: 0.01 })
    ]
  ],
  pettyCashController.updateTransaction
);

// @route   DELETE api/petty-cash/:id
// @desc    Delete a petty cash transaction
// @access  Private
router.delete('/:id', auth, pettyCashController.deleteTransaction);

// @route   PUT api/petty-cash/:id/approve
// @desc    Approve a petty cash withdrawal request
// @access  Private (Admin/Manager)
router.put('/:id/approve', auth, pettyCashController.approveTransaction);

// @route   PUT api/petty-cash/:id/reject
// @desc    Reject a petty cash withdrawal request
// @access  Private (Admin/Manager)
router.put(
  '/:id/reject',
  [
    auth,
    [
      check('rejectionReason', 'Rejection reason is required').optional()
    ]
  ],
  pettyCashController.rejectTransaction
);

// @route   POST api/petty-cash/:id/receipt
// @desc    Upload receipt for a petty cash transaction
// @access  Private
router.post(
  '/:id/receipt',
  [auth, upload.single('receipt')],
  pettyCashController.uploadReceipt
);

module.exports = router;