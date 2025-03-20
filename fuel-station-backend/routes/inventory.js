const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

/**
 * @route   GET api/inventory
 * @desc    Get all fuel inventory items
 * @access  Private
 */
router.get('/', auth, inventoryController.getAllInventory);

/**
 * @route   GET api/inventory/valuation
 * @desc    Get inventory valuation report
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/valuation', auth, inventoryController.getValuationReport);

/**
 * @route   GET api/inventory/status
 * @desc    Get inventory status report
 * @access  Private
 */
router.get('/status', auth, inventoryController.getStatusReport);

/**
 * @route   GET api/inventory/movement
 * @desc    Get inventory movement report
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/movement', auth, inventoryController.getMovementReport);

/**
 * @route   POST api/inventory/reconcile
 * @desc    Reconcile inventory with sales
 * @access  Private (Admin/Manager)
 */
router.post(
  '/reconcile', 
  [
    auth,
    [
      check('stationId', 'Station ID is required').not().isEmpty(),
      check('startDate', 'Start date is required').isISO8601(),
      check('endDate', 'End date is required').isISO8601()
    ]
  ],
  inventoryController.reconcileInventory
);

/**
 * @route   GET api/inventory/:id
 * @desc    Get a single inventory item
 * @access  Private
 */
router.get('/:id', auth, inventoryController.getInventoryById);

/**
 * @route   POST api/inventory
 * @desc    Create new inventory item
 * @access  Private (Admin/Manager)
 */
router.post(
  '/',
  [
    auth,
    [
      check('stationId', 'Station ID is required').not().isEmpty(),
      check('fuelType', 'Fuel type is required').not().isEmpty(),
      check('tankId', 'Tank ID is required').not().isEmpty(),
      check('tankCapacity', 'Tank capacity is required and must be a positive number').isFloat({ min: 0.1 }),
      check('currentVolume', 'Current volume is required').isFloat({ min: 0 }),
      check('costPrice', 'Cost price is required and must be a positive number').isFloat({ min: 0.01 }),
      check('sellingPrice', 'Selling price is required and must be a positive number').isFloat({ min: 0.01 }),
      check('reorderLevel', 'Reorder level is required and must be a positive number').isFloat({ min: 0 })
    ]
  ],
  inventoryController.createInventory
);

/**
 * @route   PUT api/inventory/:id
 * @desc    Update inventory item
 * @access  Private (Admin/Manager)
 */
router.put(
  '/:id',
  [
    auth,
    [
      check('tankCapacity', 'Tank capacity must be a positive number').optional().isFloat({ min: 0.1 }),
      check('sellingPrice', 'Selling price must be a positive number').optional().isFloat({ min: 0.01 }),
      check('reorderLevel', 'Reorder level must be a positive number').optional().isFloat({ min: 0 }),
      check('status', 'Status must be valid').optional().isIn(['Normal', 'Low', 'Critical', 'Replenishing'])
    ]
  ],
  inventoryController.updateInventory
);

/**
 * @route   POST api/inventory/:id/add-stock
 * @desc    Add stock to inventory
 * @access  Private (Admin/Manager)
 */
router.post(
  '/:id/add-stock',
  [
    auth,
    [
      check('volume', 'Volume is required and must be a positive number').isFloat({ min: 0.01 }),
      check('costPrice', 'Cost price is required and must be a positive number').isFloat({ min: 0.01 }),
      check('reference', 'Reference is required').not().isEmpty()
    ]
  ],
  inventoryController.addStock
);

/**
 * @route   POST api/inventory/:id/reduce-stock
 * @desc    Reduce stock manually
 * @access  Private (Admin/Manager)
 */
router.post(
  '/:id/reduce-stock',
  [
    auth,
    [
      check('volume', 'Volume is required and must be a positive number').isFloat({ min: 0.01 }),
      check('reason', 'Reason is required').not().isEmpty()
    ]
  ],
  inventoryController.reduceStock
);

/**
 * @route   POST api/inventory/:id/update-price
 * @desc    Update fuel price
 * @access  Private (Admin/Manager)
 */
router.post(
  '/:id/update-price',
  [
    auth,
    [
      check('newPrice', 'New price is required and must be a positive number').isFloat({ min: 0.01 }),
      check('reason', 'Reason is required').not().isEmpty()
    ]
  ],
  inventoryController.updatePrice
);

module.exports = router;