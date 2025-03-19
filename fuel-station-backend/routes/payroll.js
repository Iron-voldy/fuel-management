const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const payrollController = require('../controllers/payrollController');
const auth = require('../middleware/auth');

// @route   GET api/payroll
// @desc    Get all payrolls
// @access  Private (Admin/Manager/Accountant)
router.get('/', auth, payrollController.getAllPayrolls);

// @route   GET api/payroll/summary
// @desc    Get current payroll summary for dashboard
// @access  Private (Admin/Manager/Accountant)
router.get('/summary', auth, payrollController.getPayrollSummary);

// @route   GET api/payroll/:id
// @desc    Get a single payroll by ID
// @access  Private
router.get('/:id', auth, payrollController.getPayrollById);

// @route   GET api/payroll/employee/:employeeId/:year/:month
// @desc    Get payroll for an employee by month and year
// @access  Private
router.get('/employee/:employeeId/:year/:month', auth, payrollController.getEmployeePayrollByMonth);

// @route   POST api/payroll/generate/employee/:employeeId
// @desc    Generate payroll for a specific employee
// @access  Private (Admin/Manager/Accountant)
router.post(
  '/generate/employee/:employeeId',
  [
    auth,
    [
      check('month', 'Month is required').isInt({ min: 1, max: 12 }),
      check('year', 'Year is required').isInt({ min: 2000 })
    ]
  ],
  payrollController.generateEmployeePayroll
);

// @route   POST api/payroll/generate/batch
// @desc    Generate payroll for multiple employees (batch process)
// @access  Private (Admin/Manager/Accountant)
router.post(
  '/generate/batch',
  [
    auth,
    [
      check('month', 'Month is required').isInt({ min: 1, max: 12 }),
      check('year', 'Year is required').isInt({ min: 2000 }),
      check('employeeIds', 'Employee IDs must be an array').optional().isArray()
    ]
  ],
  payrollController.generateBatchPayroll
);

// @route   POST api/payroll/:id/process-payment
// @desc    Process salary payment for a single payroll
// @access  Private (Admin/Manager/Accountant)
router.post(
  '/:id/process-payment',
  [
    auth,
    [
      check('accountId', 'Bank account ID is required').not().isEmpty(),
      check('paymentDate', 'Payment date must be valid').optional().isISO8601()
    ]
  ],
  payrollController.processPayment
);

// @route   POST api/payroll/process-batch-payment
// @desc    Process batch payment for multiple payrolls
// @access  Private (Admin/Manager/Accountant)
router.post(
  '/process-batch-payment',
  [
    auth,
    [
      check('accountId', 'Bank account ID is required').not().isEmpty(),
      check('payrollIds', 'Payroll IDs must be an array').isArray(),
      check('paymentDate', 'Payment date must be valid').optional().isISO8601()
    ]
  ],
  payrollController.processBatchPayment
);

// @route   GET api/payroll/:id/payslip
// @desc    Generate payslip for an employee
// @access  Private
router.get('/:id/payslip', auth, payrollController.generatePayslip);

// @route   PUT api/payroll/:id
// @desc    Update payroll details
// @access  Private (Admin/Manager/Accountant)
router.put(
  '/:id',
  [
    auth,
    [
      check('remarks', 'Remarks must be a string').optional().isString()
    ]
  ],
  payrollController.updatePayroll
);

// @route   PUT api/payroll/:id/cancel-payment
// @desc    Cancel a payroll payment (Admin only)
// @access  Private (Admin only)
router.put('/:id/cancel-payment', auth, payrollController.cancelPayrollPayment);

module.exports = router;