const { validationResult } = require('express-validator');
const moment = require('moment');
const config = require('config');
const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const calculationHelpers = require('../utils/calculationHelpers');

// Get EPF/ETF rates from config
const epfEmployeeRate = config.get('epfEmployeeRate') / 100; // 8%
const epfEmployerRate = config.get('epfEmployerRate') / 100; // 12%
const etfRate = config.get('etfRate') / 100; // 3%

// Helper function to generate unique payroll ID
const generatePayrollId = () => {
  const prefix = 'PAY';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

// @desc    Get all payrolls with optional filtering
// @route   GET /api/payroll
// @access  Private (Admin/Manager/Accountant)
exports.getAllPayrolls = async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view all payrolls'
      });
    }

    const { 
      employeeId,
      month,
      year,
      startDate, 
      endDate, 
      paymentStatus,
      limit = 50,
      skip = 0,
      sort = '-payPeriod.year -payPeriod.month' // Default sort by payment period, most recent first
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (employeeId) filterObj.employeeId = employeeId;
    if (month) filterObj['payPeriod.month'] = parseInt(month);
    if (year) filterObj['payPeriod.year'] = parseInt(year);
    if (paymentStatus) filterObj.paymentStatus = paymentStatus;
    
    // Date range filter (for payment date)
    if (startDate || endDate) {
      filterObj.paymentDate = {};
      if (startDate) filterObj.paymentDate.$gte = new Date(startDate);
      if (endDate) filterObj.paymentDate.$lte = new Date(endDate);
    }

    // Get total count for pagination
    const total = await Payroll.countDocuments(filterObj);

    // Get payrolls with pagination and sorting
    const payrolls = await Payroll.find(filterObj)
      .populate('employeeId', 'employeeId personalInfo.name position')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: payrolls.length,
      data: payrolls
    });
  } catch (err) {
    console.error('Error fetching payrolls:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single payroll by ID
// @route   GET /api/payroll/:id
// @access  Private
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'employeeId personalInfo position bankDetails');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Check if user has permission (admin, manager, accountant, or the employee themselves)
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'accountant' &&
        req.user.id !== payroll.employeeId.userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this payroll'
      });
    }

    res.json({
      success: true,
      data: payroll
    });
  } catch (err) {
    console.error('Error fetching payroll:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get payroll for an employee by month and year
// @route   GET /api/payroll/employee/:employeeId/:year/:month
// @access  Private
exports.getEmployeePayrollByMonth = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year or month'
      });
    }

    // Find the employee first to verify existence
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if user has permission (admin, manager, accountant, or the employee themselves)
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'accountant' &&
        req.user.id !== employee.userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this payroll'
      });
    }

    // Find the payroll record
    const payroll = await Payroll.findOne({
      employeeId: employeeId,
      'payPeriod.year': yearNum,
      'payPeriod.month': monthNum
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found for the specified month'
      });
    }

    res.json({
      success: true,
      data: payroll
    });
  } catch (err) {
    console.error('Error fetching employee payroll:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get current payroll summary for dashboard
// @route   GET /api/payroll/summary
// @access  Private (Admin/Manager/Accountant)
exports.getPayrollSummary = async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view payroll summary'
      });
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();

    // Get current month's payroll data
    const currentMonthPayrolls = await Payroll.find({
      'payPeriod.month': currentMonth,
      'payPeriod.year': currentYear
    }).populate('employeeId', 'employeeId personalInfo.name position');

    // Calculate summary statistics
    const totalEmployees = await Employee.countDocuments({ });
    const processedEmployees = currentMonthPayrolls.length;
    const pendingEmployees = totalEmployees - processedEmployees;
    
    // Calculate total amounts
    const totalNetSalary = currentMonthPayrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);
    const totalEpfEmployee = currentMonthPayrolls.reduce((sum, payroll) => sum + payroll.deductions.epfEmployee, 0);
    const totalEpfEmployer = currentMonthPayrolls.reduce((sum, payroll) => sum + payroll.contributions.epfEmployer, 0);
    const totalEtf = currentMonthPayrolls.reduce((sum, payroll) => sum + payroll.contributions.etf, 0);
    
    // Payment status breakdown
    const paid = currentMonthPayrolls.filter(p => p.paymentStatus === 'Paid').length;
    const pending = currentMonthPayrolls.filter(p => p.paymentStatus === 'Pending').length;

    res.json({
      success: true,
      data: {
        currentPeriod: {
          month: currentMonth,
          year: currentYear,
          monthName: moment().month(currentMonth - 1).format('MMMM')
        },
        employeeSummary: {
          total: totalEmployees,
          processed: processedEmployees,
          pending: pendingEmployees,
          percentageProcessed: totalEmployees > 0 ? (processedEmployees / totalEmployees) * 100 : 0
        },
        financialSummary: {
          totalNetSalary,
          totalEpfEmployee,
          totalEpfEmployer,
          totalEtf,
          totalStatutoryContributions: totalEpfEmployee + totalEpfEmployer + totalEtf,
          totalCostToCompany: totalNetSalary + totalEpfEmployer + totalEtf
        },
        paymentStatus: {
          paid,
          pending,
          percentagePaid: processedEmployees > 0 ? (paid / processedEmployees) * 100 : 0
        },
        recentlyProcessed: currentMonthPayrolls.slice(0, 5) // Return up to 5 recent payrolls
      }
    });
  } catch (err) {
    console.error('Error generating payroll summary:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate payroll for a specific employee
// @route   POST /api/payroll/generate/employee/:employeeId
// @access  Private (Admin/Manager/Accountant)
exports.generateEmployeePayroll = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to generate payroll'
    });
  }

  try {
    const { employeeId } = req.params;
    const { month, year, additionalEarnings, additionalDeductions } = req.body;

    // Validate month and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month or year'
      });
    }

    // Check if payroll already exists for this employee/month/year
    const existingPayroll = await Payroll.findOne({
      employeeId,
      'payPeriod.month': monthNum,
      'payPeriod.year': yearNum
    });

    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        error: 'Payroll already exists for this employee in the specified month/year'
      });
    }

    // Get employee data
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Get active loans for the employee
    const activeLoans = await Loan.find({
      employeeId,
      status: 'active'
    });

    // Calculate payroll using the calculation helper
    const payrollCalculation = calculationHelpers.calculatePayroll(
      employee, 
      activeLoans,
      additionalEarnings || {},
      additionalDeductions || {}
    );

    // Generate a unique payroll ID
    const payrollId = generatePayrollId();

    // Create new payroll record
    const newPayroll = new Payroll({
      payrollId,
      employeeId,
      payPeriod: {
        month: monthNum,
        year: yearNum
      },
      earnings: payrollCalculation.earnings,
      deductions: payrollCalculation.deductions,
      contributions: payrollCalculation.contributions,
      netSalary: payrollCalculation.summary.netSalary,
      paymentStatus: 'Pending', // Initial status is Pending
      generatedBy: req.user.id,
      remarks: req.body.remarks || ''
    });

    // Save the payroll record
    const payroll = await newPayroll.save();

    // Update loan records if there are any deductions
    if (payrollCalculation.deductions.loanDeductions && payrollCalculation.deductions.loanDeductions.length > 0) {
      for (const loanDeduction of payrollCalculation.deductions.loanDeductions) {
        const loan = await Loan.findById(loanDeduction.loanId);
        
        if (loan) {
          // Find the pending installment
          const installmentIndex = loan.installments.findIndex(
            inst => inst.installmentNumber === loanDeduction.installmentNumber && inst.status === 'pending'
          );
          
          if (installmentIndex !== -1) {
            // Mark the installment as paid
            loan.installments[installmentIndex].status = 'paid';
            loan.installments[installmentIndex].paidDate = new Date();
            loan.installments[installmentIndex].payrollId = payroll._id;
            
            // Update remaining amount
            loan.remainingAmount -= loanDeduction.amount;
            
            // If no more remaining amount, mark loan as completed
            if (loan.remainingAmount <= 0) {
              loan.status = 'completed';
              loan.endDate = new Date();
            }
            
            await loan.save();
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data: payroll
    });
  } catch (err) {
    console.error('Error generating payroll:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate payroll for multiple employees (batch process)
// @route   POST /api/payroll/generate/batch
// @access  Private (Admin/Manager/Accountant)
exports.generateBatchPayroll = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to generate batch payroll'
    });
  }

  try {
    const { month, year, employeeIds } = req.body;

    // Validate month and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month or year'
      });
    }

    // If no employee IDs are provided, get all active employees
    let employees = [];
    if (!employeeIds || employeeIds.length === 0) {
      employees = await Employee.find();
    } else {
      employees = await Employee.find({ _id: { $in: employeeIds } });
    }

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No employees found'
      });
    }

    // Check which employees already have payroll for this month
    const existingPayrolls = await Payroll.find({
      employeeId: { $in: employees.map(e => e._id) },
      'payPeriod.month': monthNum,
      'payPeriod.year': yearNum
    });

    const existingEmployeeIds = existingPayrolls.map(p => p.employeeId.toString());
    
    // Filter out employees that already have payroll
    const eligibleEmployees = employees.filter(e => !existingEmployeeIds.includes(e._id.toString()));

    if (eligibleEmployees.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All selected employees already have payroll for this month'
      });
    }

    // Process each eligible employee
    const results = {
      success: [],
      failed: []
    };

    for (const employee of eligibleEmployees) {
      try {
        // Get active loans for the employee
        const activeLoans = await Loan.find({
          employeeId: employee._id,
          status: 'active'
        });

        // Calculate payroll
        const payrollCalculation = calculationHelpers.calculatePayroll(employee, activeLoans);

        // Generate a unique payroll ID
        const payrollId = generatePayrollId();

        // Create new payroll record
        const newPayroll = new Payroll({
          payrollId,
          employeeId: employee._id,
          payPeriod: {
            month: monthNum,
            year: yearNum
          },
          earnings: payrollCalculation.earnings,
          deductions: payrollCalculation.deductions,
          contributions: payrollCalculation.contributions,
          netSalary: payrollCalculation.summary.netSalary,
          paymentStatus: 'Pending',
          generatedBy: req.user.id
        });

        // Save the payroll record
        const payroll = await newPayroll.save();

        // Update loan records if there are any deductions
        if (payrollCalculation.deductions.loanDeductions && payrollCalculation.deductions.loanDeductions.length > 0) {
          for (const loanDeduction of payrollCalculation.deductions.loanDeductions) {
            const loan = await Loan.findById(loanDeduction.loanId);
            
            if (loan) {
              // Find the pending installment
              const installmentIndex = loan.installments.findIndex(
                inst => inst.installmentNumber === loanDeduction.installmentNumber && inst.status === 'pending'
              );
              
              if (installmentIndex !== -1) {
                // Mark the installment as paid
                loan.installments[installmentIndex].status = 'paid';
                loan.installments[installmentIndex].paidDate = new Date();
                loan.installments[installmentIndex].payrollId = payroll._id;
                
                // Update remaining amount
                loan.remainingAmount -= loanDeduction.amount;
                
                // If no more remaining amount, mark loan as completed
                if (loan.remainingAmount <= 0) {
                  loan.status = 'completed';
                  loan.endDate = new Date();
                }
                
                await loan.save();
              }
            }
          }
        }

        // Add to success list
        results.success.push({
          employeeId: employee._id,
          employeeName: employee.personalInfo.name,
          payrollId: payroll.payrollId,
          netSalary: payroll.netSalary
        });
      } catch (error) {
        // Add to failed list
        results.failed.push({
          employeeId: employee._id,
          employeeName: employee.personalInfo.name,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully generated payroll for ${results.success.length} employees. Failed for ${results.failed.length} employees.`,
      data: results
    });
  } catch (err) {
    console.error('Error generating batch payroll:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Process salary payment for a single payroll
// @route   POST /api/payroll/:id/process-payment
// @access  Private (Admin/Manager/Accountant)
exports.processPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to process payroll payments'
    });
  }

  try {
    const { accountId, paymentDate, reference } = req.body;

    // Find the payroll
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'personalInfo.name bankDetails');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Check if payroll is already paid
    if (payroll.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'This payroll has already been paid'
      });
    }

    // Find the bank account
    const bankAccount = await BankAccount.findById(accountId);
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    // Check if bank account has sufficient funds
    if (bankAccount.currentBalance < payroll.netSalary) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds in bank account',
        required: payroll.netSalary,
        available: bankAccount.currentBalance
      });
    }

    // Generate bank transaction ID
    const transactionId = 'SAL' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + 
                           Math.floor(1000 + Math.random() * 9000);

    // Create bank transaction for salary payment
    const bankTransaction = new BankTransaction({
      transactionId,
      user: req.user.id,
      account: accountId,
      amount: payroll.netSalary,
      type: 'withdrawal',
      date: paymentDate || new Date(),
      description: `Salary Payment - ${payroll.employeeId.personalInfo.name} - ${payroll.payPeriod.month}/${payroll.payPeriod.year}`,
      category: 'Salary',
      reference: reference || payroll.payrollId,
      notes: `Payroll ID: ${payroll.payrollId}`
    });

    // Update bank account balance
    bankAccount.currentBalance -= payroll.netSalary;

    // Update payroll with payment information
    payroll.paymentStatus = 'Paid';
    payroll.paymentDate = paymentDate || new Date();
    payroll.bankTransactionId = bankTransaction._id;
    payroll.updatedBy = req.user.id;
    payroll.updatedAt = Date.now();

    // Save all changes
    await bankTransaction.save();
    await bankAccount.save();
    await payroll.save();

    res.json({
      success: true,
      message: 'Payroll payment processed successfully',
      data: {
        payroll,
        transaction: bankTransaction
      }
    });
  } catch (err) {
    console.error('Error processing payroll payment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Process batch payment for multiple payrolls
// @route   POST /api/payroll/process-batch-payment
// @access  Private (Admin/Manager/Accountant)
exports.processBatchPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to process batch payroll payments'
    });
  }

  try {
    const { accountId, payrollIds, paymentDate, reference } = req.body;

    if (!payrollIds || payrollIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No payroll IDs provided'
      });
    }

    // Find the bank account
    const bankAccount = await BankAccount.findById(accountId);
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    // Find all the payrolls
    const payrolls = await Payroll.find({
      _id: { $in: payrollIds },
      paymentStatus: 'Pending' // Only process pending payrolls
    }).populate('employeeId', 'personalInfo.name');

    if (payrolls.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending payrolls found with the provided IDs'
      });
    }

    // Calculate total amount needed
    const totalAmount = payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);

    // Check if bank account has sufficient funds
    if (bankAccount.currentBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds in bank account',
        required: totalAmount,
        available: bankAccount.currentBalance
      });
    }

    // Start a transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Process each payroll
      const results = {
        success: [],
        failed: []
      };

      for (const payroll of payrolls) {
        try {
          // Generate bank transaction ID
          const transactionId = 'SAL' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + 
                                Math.floor(1000 + Math.random() * 9000);

          // Create bank transaction for salary payment
          const bankTransaction = new BankTransaction({
            transactionId,
            user: req.user.id,
            account: accountId,
            amount: payroll.netSalary,
            type: 'withdrawal',
            date: paymentDate || new Date(),
            description: `Salary Payment - ${payroll.employeeId.personalInfo.name} - ${payroll.payPeriod.month}/${payroll.payPeriod.year}`,
            category: 'Salary',
            reference: reference || `Batch-${new Date().toISOString().slice(0, 10)}`,
            notes: `Payroll ID: ${payroll.payrollId}`
          });

          await bankTransaction.save({ session });

          // Update payroll with payment information
          payroll.paymentStatus = 'Paid';
          payroll.paymentDate = paymentDate || new Date();
          payroll.bankTransactionId = bankTransaction._id;
          payroll.updatedBy = req.user.id;
          payroll.updatedAt = Date.now();

          await payroll.save({ session });

          results.success.push({
            payrollId: payroll._id,
            employeeName: payroll.employeeId.personalInfo.name,
            amount: payroll.netSalary,
            transactionId: bankTransaction.transactionId
          });
        } catch (error) {
          results.failed.push({
            payrollId: payroll._id,
            employeeName: payroll.employeeId.personalInfo.name,
            error: error.message
          });
        }
      }

      // Update bank account balance
      bankAccount.currentBalance -= totalAmount;
      await bankAccount.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: `Successfully processed payments for ${results.success.length} payrolls. Failed for ${results.failed.length} payrolls.`,
        data: {
          totalAmount,
          bankAccount: {
            id: bankAccount._id,
            name: bankAccount.accountName,
            newBalance: bankAccount.currentBalance
          },
          results
        }
      });
    } catch (error) {
      // Abort transaction in case of error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error('Error processing batch payroll payment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate payslip for an employee
// @route   GET /api/payroll/:id/payslip
// @access  Private
exports.generatePayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'employeeId personalInfo position salary bankDetails');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Check if user has permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'accountant' &&
        req.user.id !== payroll.employeeId.userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this payslip'
      });
    }

    // Format payslip data
    const payslipData = {
      payrollId: payroll.payrollId,
      payPeriod: {
        month: payroll.payPeriod.month,
        year: payroll.payPeriod.year,
        monthName: moment().month(payroll.payPeriod.month - 1).format('MMMM')
      },
      employee: {
        id: payroll.employeeId.employeeId,
        name: payroll.employeeId.personalInfo.name,
        position: payroll.employeeId.position,
        joinDate: payroll.employeeId.personalInfo.joinDate
      },
      earnings: {
        basicSalary: payroll.earnings.basicSalary,
        allowances: payroll.earnings.allowances || [],
        overtimeAmount: payroll.earnings.overtimeAmount || 0,
        bonuses: payroll.earnings.bonuses || 0,
        otherEarnings: payroll.earnings.otherEarnings || 0,
        totalEarnings: payroll.earnings.totalEarnings
      },
      deductions: {
        epfEmployee: payroll.deductions.epfEmployee,
        loanRepayment: payroll.deductions.loanRepayment || 0,
        advances: payroll.deductions.advances || 0,
        otherDeductions: payroll.deductions.otherDeductions || 0,
        totalDeductions: payroll.deductions.totalDeductions
      },
      contributions: {
        epfEmployer: payroll.contributions.epfEmployer,
        etf: payroll.contributions.etf,
        totalContributions: payroll.contributions.totalContributions
      },
      summary: {
        grossSalary: payroll.earnings.totalEarnings,
        totalDeductions: payroll.deductions.totalDeductions,
        netSalary: payroll.netSalary,
        costToCompany: payroll.earnings.totalEarnings + payroll.contributions.totalContributions
      },
      payment: {
        status: payroll.paymentStatus,
        date: payroll.paymentDate,
        bankDetails: payroll.employeeId.bankDetails
      },
      generated: {
        date: payroll.createdAt,
        by: req.user.name || 'System'
      }
    };

    res.json({
      success: true,
      data: payslipData
    });
  } catch (err) {
    console.error('Error generating payslip:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update payroll details
// @route   PUT /api/payroll/:id
// @access  Private (Admin/Manager/Accountant)
exports.updatePayroll = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update payroll'
    });
  }

  try {
    // Find the payroll
    let payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Cannot update if already paid
    if (payroll.paymentStatus === 'Paid' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a paid payroll (admin override required)'
      });
    }

    // Get allowed update fields based on user role
    const allowedFields = [];
    
    // Basic fields any authorized role can update
    if (payroll.paymentStatus !== 'Paid') {
      allowedFields.push(
        'earnings.overtimeHours', 'earnings.overtimeAmount', 'earnings.bonuses', 'earnings.otherEarnings',
        'deductions.advances', 'deductions.otherDeductions',
        'remarks'
      );
    }
    
    // Admin-only fields, can update even if paid
    if (req.user.role === 'admin') {
      allowedFields.push(
        'earnings.basicSalary', 'earnings.allowances',
        'deductions.epfEmployee', 'deductions.loanRepayment',
        'contributions.epfEmployer', 'contributions.etf',
        'paymentStatus', 'paymentDate'
      );
    }

    // Build update object with only allowed fields
    const updateData = {};
    
    // Handle nested fields properly
    allowedFields.forEach(field => {
      const parts = field.split('.');
      if (parts.length === 1) {
        // Direct field
        if (req.body[parts[0]] !== undefined) {
          updateData[parts[0]] = req.body[parts[0]];
        }
      } else if (parts.length === 2) {
        // Nested field
        if (req.body[parts[0]] && req.body[parts[0]][parts[1]] !== undefined) {
          if (!updateData[parts[0]]) {
            updateData[parts[0]] = {};
          }
          updateData[parts[0]][parts[1]] = req.body[parts[0]][parts[1]];
        }
      }
    });

    // Add audit info
    updateData.updatedBy = req.user.id;
    updateData.updatedAt = Date.now();

    // If earnings components are updated, recalculate totalEarnings
    if (updateData.earnings) {
      const currentEarnings = payroll.earnings.toObject();
      const updatedEarnings = { ...currentEarnings, ...updateData.earnings };
      
      // Calculate total earnings
      let totalEarnings = updatedEarnings.basicSalary;
      
      if (updatedEarnings.allowances && Array.isArray(updatedEarnings.allowances)) {
        totalEarnings += updatedEarnings.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
      }
      
      totalEarnings += (updatedEarnings.overtimeAmount || 0);
      totalEarnings += (updatedEarnings.bonuses || 0);
      totalEarnings += (updatedEarnings.otherEarnings || 0);
      
      updateData.earnings.totalEarnings = totalEarnings;
      
      // Recalculate EPF if admin
      if (req.user.role === 'admin') {
        // Update deductions
        if (!updateData.deductions) updateData.deductions = {};
        updateData.deductions.epfEmployee = totalEarnings * epfEmployeeRate;
        
        // Update contributions
        if (!updateData.contributions) updateData.contributions = {};
        updateData.contributions.epfEmployer = totalEarnings * epfEmployerRate;
        updateData.contributions.etf = totalEarnings * etfRate;
        updateData.contributions.totalContributions = 
          updateData.contributions.epfEmployer + updateData.contributions.etf;
      }
    }

    // If deductions components are updated, recalculate totalDeductions
    if (updateData.deductions) {
      const currentDeductions = payroll.deductions.toObject();
      const updatedDeductions = { ...currentDeductions, ...updateData.deductions };
      
      // Calculate total deductions
      updateData.deductions.totalDeductions = 
        (updatedDeductions.epfEmployee || 0) +
        (updatedDeductions.loanRepayment || 0) +
        (updatedDeductions.advances || 0) +
        (updatedDeductions.otherDeductions || 0);
    }

    // Recalculate net salary if earnings or deductions changed
    if (updateData.earnings || updateData.deductions) {
      const totalEarnings = updateData.earnings?.totalEarnings || payroll.earnings.totalEarnings;
      const totalDeductions = updateData.deductions?.totalDeductions || payroll.deductions.totalDeductions;
      
      updateData.netSalary = totalEarnings - totalDeductions;
    }

    // Update the payroll record
    payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Payroll record updated successfully',
      data: payroll
    });
  } catch (err) {
    console.error('Error updating payroll:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Cancel a payroll payment (Admin only)
// @route   PUT /api/payroll/:id/cancel-payment
// @access  Private (Admin only)
exports.cancelPayrollPayment = async (req, res) => {
  // Only admins can cancel payroll payments
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to cancel payroll payments'
    });
  }

  try {
    // Find the payroll
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Check if payroll is paid
    if (payroll.paymentStatus !== 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'This payroll has not been paid yet'
      });
    }

    // Check if there's a bank transaction attached
    if (!payroll.bankTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'No bank transaction found for this payroll payment'
      });
    }

    // Start a transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the bank transaction
      const bankTransaction = await BankTransaction.findById(payroll.bankTransactionId);
      
      if (bankTransaction) {
        // Find the bank account
        const bankAccount = await BankAccount.findById(bankTransaction.account);
        
        if (bankAccount) {
          // Refund the amount to the bank account
          bankAccount.currentBalance += bankTransaction.amount;
          await bankAccount.save({ session });
        }
        
        // Mark transaction as cancelled or delete it
        await BankTransaction.findByIdAndDelete(bankTransaction._id, { session });
      }

      // Update payroll status
      payroll.paymentStatus = 'Cancelled';
      payroll.paymentDate = null;
      payroll.bankTransactionId = null;
      payroll.updatedBy = req.user.id;
      payroll.updatedAt = Date.now();
      payroll.remarks = `${payroll.remarks || ''}\nPayment cancelled by ${req.user.name || 'admin'} on ${new Date().toISOString()}`;
      
      await payroll.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Payroll payment cancelled successfully',
        data: payroll
      });
    } catch (error) {
      // Abort transaction in case of error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error('Error cancelling payroll payment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};