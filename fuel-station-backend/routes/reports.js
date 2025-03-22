const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// --------------------------
// SALES REPORTS
// --------------------------

/**
 * @route   GET api/reports/sales
 * @desc    Generate sales report
 * @access  Private
 */
router.get(
  '/sales',
  auth,
  reportController.generateSalesReport
);

// --------------------------
// FINANCIAL REPORTS
// --------------------------

/**
 * @route   GET api/reports/financial
 * @desc    Generate financial report
 * @access  Private
 */
router.get(
  '/financial',
  auth,
  reportController.generateFinancialReport
);

// --------------------------
// INVENTORY REPORTS
// --------------------------

/**
 * @route   GET api/reports/inventory
 * @desc    Generate inventory report
 * @access  Private
 */
router.get(
  '/inventory',
  auth,
  reportController.generateInventoryReport
);

// --------------------------
// CUSTOMER REPORTS
// --------------------------

/**
 * @route   GET api/reports/customers
 * @desc    Generate customer report
 * @access  Private
 */
router.get(
  '/customers',
  auth,
  reportController.generateCustomerReport
);

// --------------------------
// BANKING REPORTS
// --------------------------

/**
 * @route   GET api/reports/banking
 * @desc    Generate banking report
 * @access  Private
 */
router.get(
  '/banking',
  auth,
  reportController.generateBankingReport
);

// --------------------------
// PETTY CASH REPORTS
// --------------------------

/**
 * @route   GET api/reports/petty-cash/transactions
 * @desc    Generate petty cash transaction report
 * @access  Private
 */
router.get(
  '/petty-cash/transactions',
  [
    auth,
    [
      check('startDate', 'Start date must be valid').optional().isISO8601(),
      check('endDate', 'End date must be valid').optional().isISO8601(),
      check('format', 'Format must be json, csv, or pdf').optional().isIn(['json', 'csv', 'pdf'])
    ],
    validate
  ],
  reportController.generatePettyCashTransactionReport
);

/**
 * @route   GET api/reports/petty-cash/balance
 * @desc    Generate petty cash balance report
 * @access  Private
 */
router.get(
  '/petty-cash/balance',
  auth,
  reportController.generatePettyCashBalanceReport
);

/**
 * @route   GET api/reports/petty-cash/replenishment-recommendation
 * @desc    Generate petty cash replenishment recommendation report
 * @access  Private (Admin/Manager)
 */
router.get(
  '/petty-cash/replenishment-recommendation',
  auth,
  reportController.generatePettyCashReplenishmentReport
);

// --------------------------
// REPORT SCHEDULING
// --------------------------

/**
 * @route   POST api/reports/schedule
 * @desc    Schedule a report
 * @access  Private
 */
router.post(
  '/schedule',
  [
    auth,
    [
      check('reportType', 'Report type is required').not().isEmpty(),
      check('frequency', 'Frequency is required').isIn(['daily', 'weekly', 'monthly', 'quarterly']),
      check('recipients', 'At least one recipient email is required').isArray({ min: 1 }),
      check('format', 'Format is required').isIn(['pdf', 'csv', 'xlsx', 'json'])
    ],
    validate
  ],
  reportController.scheduleReport
);

/**
 * @route   GET api/reports/schedule
 * @desc    Get scheduled reports
 * @access  Private
 */
router.get(
  '/schedule',
  auth,
  reportController.getScheduledReports
);

/**
 * @route   DELETE api/reports/schedule/:id
 * @desc    Delete a scheduled report
 * @access  Private
 */
router.delete(
  '/schedule/:id',
  auth,
  reportController.deleteScheduledReport
);

module.exports = router;