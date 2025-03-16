const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');

// @route   POST api/employees
// @desc    Create a new employee
// @access  Private
exports.createEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      employeeId,
      personalInfo,
      position,
      stationId,
      salary,
      bankDetails,
      userId
    } = req.body;

    // Calculate total gross salary
    let totalGross = salary.basic;
    if (salary.allowances && salary.allowances.length > 0) {
      totalGross += salary.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
    }

    // Create new employee
    const newEmployee = new Employee({
      employeeId,
      personalInfo,
      position,
      stationId,
      salary: {
        ...salary,
        totalGross
      },
      bankDetails,
      userId,
      updatedAt: Date.now()
    });

    const employee = await newEmployee.save();
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/employees
// @desc    Get all employees
// @access  Private
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ 'personalInfo.name': 1 });
    res.json(employees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/employees/:id
// @desc    Get employee by ID
// @access  Private
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   PUT api/employees/:id
// @desc    Update an employee
// @access  Private
exports.updateEmployee = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      personalInfo,
      position,
      stationId,
      salary,
      bankDetails
    } = req.body;

    // Calculate total gross salary
    let totalGross = salary.basic;
    if (salary.allowances && salary.allowances.length > 0) {
      totalGross += salary.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
    }

    // Build employee object
    const employeeFields = {};
    if (personalInfo) employeeFields.personalInfo = personalInfo;
    if (position) employeeFields.position = position;
    if (stationId) employeeFields.stationId = stationId;
    if (salary) {
      employeeFields.salary = {
        ...salary,
        totalGross
      };
    }
    if (bankDetails) employeeFields.bankDetails = bankDetails;
    employeeFields.updatedAt = Date.now();

    // Update employee
    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: employeeFields },
      { new: true }
    );

    res.json(employee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   DELETE api/employees/:id
// @desc    Delete an employee
// @access  Private
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    await Employee.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Employee removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
};