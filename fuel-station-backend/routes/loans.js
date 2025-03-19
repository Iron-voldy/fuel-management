const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const loanController = require('../controllers/loanController');
const auth = require('../middleware/auth');

// @route   GET api/loans
// @desc    Get all loans with optional filtering
// @access  Private (Admin/Manager/Accountant)
router.get('/', auth, loanController.getAllLoans);

// @route   GET api/loans/:id
// @desc    Get a single loan by ID
// @access  Private
router.get('/:id', auth, loanController.getLoanById);

// @route   GET api/loans/employee/:employeeId
// @desc    Get all loans for an employee
// @access  Private
router.get('/employee/:employeeId', auth, loanController.getEmployeeLoans);

// @route   POST api/loans
// @desc    Apply for a new loan
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('employeeId', 'Employee ID is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('purpose', 'Purpose is required').not().isEmpty(),
      check('durationMonths', 'Duration in months is required').isNumeric(),
      check('startDate', 'Valid start date is required').optional().isISO8601()
    ]
  ],
  loanController.applyForLoan
);

// @route   PUT api/loans/:id/approve
// @desc    Approve a loan application
// @access  Private (Admin/Manager)
router.put('/:id/approve', auth, loanController.approveLoan);

// @route   PUT api/loans/:id/reject
// @desc    Reject a loan application
// @access  Private (Admin/Manager)
router.put(
  '/:id/reject',
  [
    auth,
    [
      check('rejectionReason', 'Rejection reason is required').not().isEmpty()
    ]
  ],
  loanController.rejectLoan
);

// @route   PUT api/loans/:id
// @desc    Update loan details
// @access  Private (Admin/Manager)
router.put(
  '/:id',
  [
    auth,
    [
      check('purpose', 'Purpose is required').optional().not().isEmpty(),
      check('durationMonths', 'Duration must be a number').optional().isNumeric(),
      check('amount', 'Amount must be a number').optional().isNumeric(),
      check('startDate', 'Valid start date is required').optional().isISO8601()
    ]
  ],
  loanController.updateLoan
);

// @route   POST api/loans/:id/payment
// @desc    Record a manual loan payment
// @access  Private (Admin/Manager/Accountant)
router.post(
  '/:id/payment',
  [
    auth,
    [
      check('installmentNumber', 'Installment number is required').isNumeric(),
      check('paymentDate', 'Valid payment date is required').optional().isISO8601()
    ]
  ],
  loanController.recordLoanPayment
);

// @route   PUT api/loans/:id/cancel
// @desc    Cancel a loan
// @access  Private (Admin only)
router.put('/:id/cancel', auth, loanController.cancelLoan);

module.exports = router;