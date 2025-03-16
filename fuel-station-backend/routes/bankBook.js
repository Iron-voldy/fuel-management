const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const bankBookController = require('../controllers/bankBookController');
const auth = require('../middleware/auth');

// ========== BANK ACCOUNT ROUTES ==========

// @route   POST api/bank-book/accounts
// @desc    Create a new bank account
// @access  Private
router.post(
  '/accounts',
  [
    auth,
    [
      check('accountId', 'Account ID is required').not().isEmpty(),
      check('bankName', 'Bank name is required').not().isEmpty(),
      check('accountNumber', 'Account number is required').not().isEmpty(),
      check('accountType', 'Account type is required').isIn(['savings', 'current', 'fixed', 'other']),
      check('branch', 'Branch is required').not().isEmpty(),
      check('openingBalance', 'Opening balance is required and must be a number').isNumeric()
    ]
  ],
  bankBookController.createBankAccount
);

// @route   GET api/bank-book/accounts
// @desc    Get all bank accounts
// @access  Private
router.get('/accounts', auth, bankBookController.getAllBankAccounts);

// @route   GET api/bank-book/accounts/:id
// @desc    Get bank account by ID
// @access  Private
router.get('/accounts/:id', auth, bankBookController.getBankAccountById);

// @route   PUT api/bank-book/accounts/:id
// @desc    Update a bank account
// @access  Private
router.put(
  '/accounts/:id',
  [
    auth,
    [
      check('bankName', 'Bank name is required if provided').optional().not().isEmpty(),
      check('accountType', 'Account type must be valid if provided').optional().isIn(['savings', 'current', 'fixed', 'other']),
      check('branch', 'Branch is required if provided').optional().not().isEmpty(),
      check('currency', 'Currency is required if provided').optional().not().isEmpty(),
      check('active', 'Active status must be a boolean if provided').optional().isBoolean()
    ]
  ],
  bankBookController.updateBankAccount
);

// @route   DELETE api/bank-book/accounts/:id
// @desc    Delete a bank account
// @access  Private
router.delete('/accounts/:id', auth, bankBookController.deleteBankAccount);

// ========== BANK TRANSACTION ROUTES ==========

// @route   POST api/bank-book/transactions
// @desc    Record a bank transaction
// @access  Private
router.post(
  '/transactions',
  [
    auth,
    [
      check('transactionId', 'Transaction ID is required').not().isEmpty(),
      check('accountId', 'Account ID is required').not().isEmpty(),
      check('type', 'Transaction type is required').isIn(['deposit', 'withdrawal', 'transfer', 'interest', 'charge', 'other']),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('description', 'Description is required').not().isEmpty(),
      check('category', 'Category is required').not().isEmpty(),
      check('paymentMethod', 'Payment method is required').isIn(['cash', 'cheque', 'transfer', 'online', 'card', 'other'])
    ]
  ],
  bankBookController.createTransaction
);

// @route   GET api/bank-book/transactions
// @desc    Get all bank transactions with optional filtering
// @access  Private
router.get('/transactions', auth, bankBookController.getTransactions);

// @route   GET api/bank-book/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/transactions/:id', auth, bankBookController.getTransactionById);

// @route   POST api/bank-book/transactions/:id/reconcile
// @desc    Mark a transaction as reconciled
// @access  Private
router.post('/transactions/:id/reconcile', auth, bankBookController.reconcileTransaction);

// @route   GET api/bank-book/accounts/:id/statement
// @desc    Generate account statement for a specific period
// @access  Private
router.get('/accounts/:id/statement', auth, bankBookController.generateStatement);

module.exports = router;