const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const auth = require('../middleware/auth');

// @route   POST api/employees
// @desc    Create a new employee
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('employeeId', 'Employee ID is required').not().isEmpty(),
      check('personalInfo.name', 'Name is required').not().isEmpty(),
      check('personalInfo.address', 'Address is required').not().isEmpty(),
      check('personalInfo.contact', 'Contact number is required').not().isEmpty(),
      check('personalInfo.email', 'Please include a valid email').isEmail(),
      check('position', 'Position is required').not().isEmpty(),
      check('salary.basic', 'Basic salary is required').isNumeric(),
      check('bankDetails.bankName', 'Bank name is required').not().isEmpty(),
      check('bankDetails.accountNumber', 'Account number is required').not().isEmpty(),
      check('bankDetails.branchCode', 'Branch code is required').not().isEmpty()
    ]
  ],
  employeeController.createEmployee
);

// @route   GET api/employees
// @desc    Get all employees
// @access  Private
router.get('/', auth, employeeController.getAllEmployees);

// @route   GET api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', auth, employeeController.getEmployeeById);

// @route   PUT api/employees/:id
// @desc    Update an employee
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('personalInfo.name', 'Name is required').optional().not().isEmpty(),
      check('personalInfo.email', 'Please include a valid email').optional().isEmail(),
      check('salary.basic', 'Basic salary must be a number').optional().isNumeric()
    ]
  ],
  employeeController.updateEmployee
);

// @route   DELETE api/employees/:id
// @desc    Delete an employee
// @access  Private
router.delete('/:id', auth, employeeController.deleteEmployee);

module.exports = router;