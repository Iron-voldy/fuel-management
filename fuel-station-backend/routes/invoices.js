const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

/**
 * @route   GET api/invoices
 * @desc    Get all invoices
 * @access  Private
 */
router.get('/', auth, invoiceController.getAllInvoices);

/**
 * @route   GET api/invoices/aging-report
 * @desc    Get aging report
 * @access  Private
 */
router.get('/aging-report', auth, invoiceController.getAgingReport);

/**
 * @route   GET api/invoices/:id
 * @desc    Get a single invoice
 * @access  Private
 */
router.get('/:id', auth, invoiceController.getInvoiceById);

/**
 * @route   POST api/invoices
 * @desc    Create a new invoice
 * @access  Private
 */
router.post(
  '/',
  [
    auth,
    [
      check('customerId', 'Customer ID is required').not().isEmpty(),
      check('stationId', 'Station ID is required').not().isEmpty(),
      check('items', 'Items are required').isArray({ min: 1 }),
      check('items.*.description', 'Description is required for all items').not().isEmpty(),
      check('items.*.quantity', 'Quantity is required for all items').isFloat({ min: 0.01 }),
      check('items.*.unitPrice', 'Unit price is required for all items').isFloat({ min: 0.01 })
    ]
  ],
  invoiceController.createInvoice
);

/**
 * @route   POST api/invoices/generate-from-sales
 * @desc    Generate invoices from sales
 * @access  Private (Admin/Manager)
 */
router.post(
  '/generate-from-sales',
  [
    auth,
    [
      check('customerId', 'Customer ID is required').not().isEmpty(),
      check('startDate', 'Start date is required').isISO8601(),
      check('endDate', 'End date is required').isISO8601()
    ]
  ],
  invoiceController.generateFromSales
);

/**
 * @route   PUT api/invoices/:id
 * @desc    Update an invoice
 * @access  Private
 */
router.put(
  '/:id',
  [
    auth,
    [
      check('items', 'Items must be an array').optional().isArray(),
      check('taxRate', 'Tax rate must be a number').optional().isFloat({ min: 0 }),
      check('discountType', 'Invalid discount type').optional().isIn(['Percentage', 'Fixed', 'None']),
      check('discountValue', 'Discount value must be a number').optional().isFloat({ min: 0 })
    ]
  ],
  invoiceController.updateInvoice
);

/**
 * @route   PUT api/invoices/:id/cancel
 * @desc    Cancel an invoice
 * @access  Private (Admin/Manager)
 */
router.put('/:id/cancel', auth, invoiceController.cancelInvoice);

/**
 * @route   POST api/invoices/:id/payment
 * @desc    Record payment for an invoice
 * @access  Private
 */
router.post(
  '/:id/payment',
  [
    auth,
    [
      check('amount', 'Amount is required and must be greater than 0').isFloat({ min: 0.01 }),
      check('method', 'Payment method is required').isIn(['Cash', 'Bank Transfer', 'Bank Deposit', 'Check', 'Credit Card', 'Debit Card']),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  invoiceController.recordPayment
);

module.exports = router;