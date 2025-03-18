const { validationResult } = require('express-validator');
const config = require('config');
const Loan = require('../models/Loan');
const Employee = require('../models/Employee');
const calculationHelpers = require('../utils/calculationHelpers');

// Helper function to generate unique loan ID
const generateLoanId = () => {
  const prefix = 'LN';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

// @desc    Get all loans with optional filtering
// @route   GET /api/loans
// @access  Private (Admin/Manager/Accountant)
exports.getAllLoans = async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'accountant') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view all loans'
      });
    }

    const { 
      employeeId,
      status,
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      limit = 50,
      skip = 0,
      sort = '-createdAt' // Default sort by creation date, newest first
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (employeeId) filterObj.employeeId = employeeId;
    if (status) filterObj.status = status;
    
    // Date range filter (for start date)
    if (startDate || endDate) {
      filterObj.startDate = {};
      if (startDate) filterObj.startDate.$gte = new Date(startDate);
      if (endDate) filterObj.startDate.$lte = new Date(endDate);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filterObj.amount = {};
      if (minAmount) filterObj.amount.$gte = Number(minAmount);
      if (maxAmount) filterObj.amount.$lte = Number(maxAmount);
    }

    // Get total count for pagination
    const total = await Loan.countDocuments(filterObj);

    // Get loans with pagination and sorting
    const loans = await Loan.find(filterObj)
      .populate('employeeId', 'employeeId personalInfo.name position')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: loans.length,
      data: loans
    });
  } catch (err) {
    console.error('Error fetching loans:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single loan by ID
// @route   GET /api/loans/:id
// @access  Private
exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('employeeId', 'employeeId personalInfo position')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name');

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Check if user has permission (admin, manager, accountant, or the employee themselves)
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'accountant' &&
        req.user.id !== loan.employeeId.userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this loan'
      });
    }

    // Check for overdue installments
    await loan.checkOverdueInstallments();

    res.json({
      success: true,
      data: loan
    });
  } catch (err) {
    console.error('Error fetching loan:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all loans for an employee
// @route   GET /api/loans/employee/:employeeId
// @access  Private
exports.getEmployeeLoans = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;

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
        error: 'Not authorized to view these loans'
      });
    }

    // Build query
    const query = { employeeId };
    if (status) {
      query.status = status;
    }

    // Find the loans
    const loans = await Loan.find(query)
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    // Check for overdue installments in all loans
    await Promise.all(loans.map(loan => loan.checkOverdueInstallments()));

    // Calculate summary statistics
    const totalLoans = loans.length;
    const activeLoans = loans.filter(loan => loan.status === 'active').length;
    const completedLoans = loans.filter(loan => loan.status === 'completed').length;
    const pendingLoans = loans.filter(loan => loan.status === 'pending').length;
    
    const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalRepayable = loans.reduce((sum, loan) => sum + loan.totalRepayable, 0);
    const remainingAmount = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
    
    const overdueInstallments = loans.reduce((sum, loan) => {
      return sum + loan.installments.filter(i => i.status === 'overdue').length;
    }, 0);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: employee.personalInfo.name,
          position: employee.position
        },
        summary: {
          totalLoans,
          activeLoans,
          completedLoans,
          pendingLoans,
          totalAmount,
          totalRepayable,
          remainingAmount,
          overdueInstallments
        },
        loans
      }
    });
  } catch (err) {
    console.error('Error fetching employee loans:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Apply for a new loan
// @route   POST /api/loans
// @access  Private
exports.applyForLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { 
      employeeId,
      amount,
      purpose,
      durationMonths,
      startDate
    } = req.body;

    // If no employee ID provided, assume the current user
    const targetEmployeeId = employeeId || req.user.employeeId;
    
    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Find the employee
    const employee = await Employee.findById(targetEmployeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if user is applying for someone else without permission
    if (employeeId && employeeId !== req.user.employeeId && 
        req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to apply for a loan on behalf of another employee'
      });
    }

    // Check if employee already has active loans
    const activeLoans = await Loan.find({
      employeeId: targetEmployeeId,
      status: { $in: ['active', 'pending'] }
    });

    // Get loan policy from config
    const loanInterestRate = config.get('loanInterestRate');
    const maxActiveLoans = 1; // Configurable policy: maximum number of active loans allowed
    
    // Check if employee has reached maximum number of active loans
    if (activeLoans.length >= maxActiveLoans) {
      return res.status(400).json({
        success: false,
        error: 'Employee already has an active or pending loan. Only one active loan is allowed at a time.',
        activeLoans
      });
    }

    // Calculate loan details
    const loanCalculation = calculationHelpers.calculateLoanRepayment(
      amount,
      durationMonths,
      startDate || new Date()
    );

    // Generate a unique loan ID
    const loanId = generateLoanId();

    // Create new loan record
    const newLoan = new Loan({
      loanId,
      employeeId: targetEmployeeId,
      amount,
      purpose,
      interestRate: loanInterestRate,
      startDate: startDate || new Date(),
      durationMonths,
      installmentAmount: loanCalculation.monthlyInstallment,
      totalRepayable: loanCalculation.totalRepayable,
      remainingAmount: loanCalculation.totalRepayable,
      installments: loanCalculation.schedule,
      status: 'pending', // Initial status is pending until approved
      createdBy: req.user.id
    });

    // If user is admin or manager, auto-approve the loan
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      newLoan.status = 'active';
      newLoan.approvedBy = req.user.id;
      newLoan.approvalDate = new Date();
    }

    // Save the loan record
    const loan = await newLoan.save();

    res.status(201).json({
      success: true,
      message: req.user.role === 'admin' || req.user.role === 'manager' 
        ? 'Loan application auto-approved' 
        : 'Loan application submitted for approval',
      data: loan
    });
  } catch (err) {
    console.error('Error applying for loan:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Approve a loan application
// @route   PUT /api/loans/:id/approve
// @access  Private (Admin/Manager)
exports.approveLoan = async (req, res) => {
  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to approve loans'
    });
  }

  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Check if loan is in pending status
    if (loan.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Loan cannot be approved as it is currently ${loan.status}`
      });
    }

    // Update loan status
    loan.status = 'active';
    loan.approvedBy = req.user.id;
    loan.approvalDate = new Date();
    loan.updatedAt = Date.now();

    // Save the updated loan
    await loan.save();

    // Return the updated loan with populated references
    const updatedLoan = await Loan.findById(req.params.id)
      .populate('employeeId', 'employeeId personalInfo.name position')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Loan application approved',
      data: updatedLoan
    });
  } catch (err) {
    console.error('Error approving loan:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reject a loan application
// @route   PUT /api/loans/:id/reject
// @access  Private (Admin/Manager)
exports.rejectLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to reject loans'
    });
  }

  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Check if loan is in pending status
    if (loan.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Loan cannot be rejected as it is currently ${loan.status}`
      });
    }

    // Update loan status
    loan.status = 'rejected';
    loan.approvedBy = req.user.id;
    loan.approvalDate = new Date();
    loan.rejectionReason = rejectionReason;
    loan.updatedAt = Date.now();

    // Save the updated loan
    await loan.save();

    // Return the updated loan with populated references
    const updatedLoan = await Loan.findById(req.params.id)
      .populate('employeeId', 'employeeId personalInfo.name position')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Loan application rejected',
      data: updatedLoan
    });
  } catch (err) {
    console.error('Error rejecting loan:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update loan details
// @route   PUT /api/loans/:id
// @access  Private (Admin/Manager)
exports.updateLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if user has permission
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update loans'
    });
  }

  try {
    const { 
      purpose,
      durationMonths,
      amount,
      startDate,
      status
    } = req.body;

    // Find the loan
    let loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Prevent updates to completed or rejected loans
    if (loan.status === 'completed' || loan.status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: `Cannot update a ${loan.status} loan`
      });
    }

    // Build update object with only allowed fields
    const updateData = {};
    
    // For pending loans, more fields can be updated
    if (loan.status === 'pending') {
      if (purpose) updateData.purpose = purpose;
      
      // If amount, duration, or start date changes, recalculate loan details
      if (amount || durationMonths || startDate) {
        const newAmount = amount || loan.amount;
        const newDuration = durationMonths || loan.durationMonths;
        const newStartDate = startDate ? new Date(startDate) : loan.startDate;
        
        const loanCalculation = calculationHelpers.calculateLoanRepayment(
          newAmount,
          newDuration,
          newStartDate
        );
        
        updateData.amount = newAmount;
        updateData.durationMonths = newDuration;
        updateData.startDate = newStartDate;
        updateData.installmentAmount = loanCalculation.monthlyInstallment;
        updateData.totalRepayable = loanCalculation.totalRepayable;
        updateData.remainingAmount = loanCalculation.totalRepayable;
        updateData.installments = loanCalculation.schedule;
      }
    }
    
    // For active loans, only certain fields can be updated
    if (loan.status === 'active') {
      if (purpose) updateData.purpose = purpose;
      
      // Allow changing status to completed (for manual completion)
      if (status === 'completed') {
        updateData.status = 'completed';
        updateData.remainingAmount = 0;
        updateData.endDate = new Date();
      }
    }

    // Add audit info
    updateData.updatedAt = Date.now();

    // Update the loan
    loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('employeeId', 'employeeId personalInfo.name position')
    .populate('approvedBy', 'name')
    .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });
  } catch (err) {
    console.error('Error updating loan:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Record a manual loan payment
// @route   POST /api/loans/:id/payment
// @access  Private (Admin/Manager/Accountant)
exports.recordLoanPayment = async (req, res) => {
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
      error: 'Not authorized to record loan payments'
    });
  }

  try {
    const { installmentNumber, paymentDate, notes } = req.body;

    // Find the loan
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Check if loan is active
    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot record payment for a ${loan.status} loan`
      });
    }

    // Find the installment
    const installmentIndex = loan.installments.findIndex(
      inst => inst.installmentNumber === installmentNumber
    );

    if (installmentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Installment #${installmentNumber} not found`
      });
    }

    // Check if installment is already paid
    if (loan.installments[installmentIndex].status === 'paid') {
      return res.status(400).json({
        success: false,
        error: `Installment #${installmentNumber} is already paid`
      });
    }

    // Update the installment
    loan.installments[installmentIndex].status = 'paid';
    loan.installments[installmentIndex].paidDate = paymentDate || new Date();

    // Update the remaining amount
    loan.remainingAmount -= loan.installments[installmentIndex].amount;

    // If no more remaining amount, mark loan as completed
    if (loan.remainingAmount <= 0) {
      loan.status = 'completed';
      loan.endDate = new Date();
    }

    // Add notes if provided
    if (notes) {
      loan.installments[installmentIndex].notes = notes;
    }

    // Save the updated loan
    await loan.save();

    res.json({
      success: true,
      message: 'Loan payment recorded successfully',
      data: loan
    });
  } catch (err) {
    console.error('Error recording loan payment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Cancel a loan
// @route   PUT /api/loans/:id/cancel
// @access  Private (Admin only)
exports.cancelLoan = async (req, res) => {
  // Only admins can cancel loans
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to cancel loans'
    });
  }

  try {
    const { reason } = req.body;

    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }

    // Can only cancel pending or active loans
    if (loan.status !== 'pending' && loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a ${loan.status} loan`
      });
    }

    // Update loan status
    loan.status = 'cancelled';
    loan.rejectionReason = reason || 'Cancelled by administrator';
    loan.updatedAt = Date.now();

    // Save the updated loan
    await loan.save();

    res.json({
      success: true,
      message: 'Loan cancelled successfully',
      data: loan
    });
  } catch (err) {
    console.error('Error cancelling loan:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};