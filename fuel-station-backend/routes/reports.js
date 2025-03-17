const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// Existing routes

// @route   GET api/reports/petty-cash/transactions
// @desc    Generate petty cash transaction report
// @access  Private
router.get(
  '/petty-cash/transactions',
  [
    auth,
    [
      check('startDate', 'Start date must be valid').optional().isISO8601(),
      check('endDate', 'End date must be valid').optional().isISO8601(),
      check('format', 'Format must be json, csv, or pdf').optional().isIn(['json', 'csv', 'pdf'])
    ]
  ],
  reportController.generatePettyCashTransactionReport
);

// @route   GET api/reports/petty-cash/balance
// @desc    Generate petty cash balance report
// @access  Private
router.get(
  '/petty-cash/balance',
  auth,
  reportController.generatePettyCashBalanceReport
);

// @route   GET api/reports/petty-cash/replenishment-recommendation
// @desc    Generate petty cash replenishment recommendation report
// @access  Private (Admin/Manager)
router.get(
  '/petty-cash/replenishment-recommendation',
  auth,
  reportController.generatePettyCashReplenishmentReport
);

module.exports = router;