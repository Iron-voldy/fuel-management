const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const salesController = require('../controllers/salesController');
const auth = require('../middleware/auth');

// @route   GET api/sales
// @desc    Get all sales with optional filtering
// @access  Private
router.get('/', auth, salesController.getAllSales);

// @route   GET api/sales/summary
// @desc    Get sales summary data for dashboard
// @access  Private
router.get('/summary', auth, salesController.getSalesSummary);

// @route   GET api/sales/report
// @desc    Generate sales report
// @access  Private
router.get('/report', auth, salesController.generateSalesReport);

// @route   GET api/sales/:id
// @desc    Get a single sale
// @access  Private
router.get('/:id', auth, salesController.getSaleById);

// @route   POST api/sales
// @desc    Create a new sale record (manual entry)
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('stationId', 'Station ID is required').optional(),
      check('fuelType', 'Fuel type is required').not().isEmpty(),
      check('quantity', 'Quantity is required and must be a number').isNumeric(),
      check('unitPrice', 'Unit price is required and must be a number').isNumeric(),
      check('paymentMethod', 'Payment method is required').optional(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  salesController.createSale
);

// @route   POST api/sales/iot
// @desc    Create a sale record from IoT data
// @access  Private (IoT Integration)
router.post(
  '/iot',
  [
    auth,
    [
      check('stationId', 'Station ID is required').not().isEmpty(),
      check('fuelType', 'Fuel type is required').not().isEmpty(),
      check('quantity', 'Quantity is required and must be a number').isNumeric(),
      check('unitPrice', 'Unit price is required and must be a number').isNumeric(),
      check('sensorId', 'Sensor ID is required').not().isEmpty(),
      check('pumpId', 'Pump ID is required').not().isEmpty(),
      check('timestamp', 'Timestamp must be valid').optional().isISO8601()
    ]
  ],
  salesController.createSaleFromIoT
);

// @route   PUT api/sales/:id
// @desc    Update a sale record
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('paymentMethod', 'Payment method must be valid').optional()
        .isIn(['Cash', 'BankCard', 'BankTransfer', 'Credit', 'Other']),
      check('fuelType', 'Fuel type must be valid').optional()
        .isIn(['Petrol 92', 'Petrol 95', 'Auto Diesel', 'Super Diesel', 'Kerosene']),
      check('quantity', 'Quantity must be a number').optional().isNumeric(),
      check('unitPrice', 'Unit price must be a number').optional().isNumeric(),
      check('date', 'Date must be valid').optional().isISO8601()
    ]
  ],
  salesController.updateSale
);

// @route   DELETE api/sales/:id
// @desc    Delete a sale record
// @access  Private (Admin only)
router.delete('/:id', auth, salesController.deleteSale);

// @route   POST api/sales/reconcile
// @desc    Reconcile IoT data with sales records
// @access  Private (Admin/Manager)
router.post(
  '/reconcile',
  [
    auth,
    [
      check('stationId', 'Station ID is required').not().isEmpty(),
      check('startDate', 'Start date is required and must be valid').isISO8601(),
      check('endDate', 'End date is required and must be valid').isISO8601(),
      check('fuelType', 'Fuel type is required').not().isEmpty()
    ]
  ],
  salesController.reconcileIoTSales
);

module.exports = router;