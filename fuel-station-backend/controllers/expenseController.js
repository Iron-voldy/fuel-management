const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const crypto = require('crypto');
const validators = require('../utils/validators'); // Ensure this import is present

// Helper function to generate unique expense ID
const generateExpenseId = () => {
  const prefix = 'EXP';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

// @desc    Get all expenses with optional filtering
// @route   GET /api/expenses
// @access  Private
exports.getAllExpenses = async (req, res) => {
  try {
    const { 
      category, 
      stationId, 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      approvalStatus,
      isRecurring,
      search,
      limit = 50,
      skip = 0,
      sort = '-date' // Default sort by date descending
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (req.user) {
      filterObj.user = req.user.id;
    }
    
    if (category) filterObj.category = category;
    if (stationId) filterObj.stationId = stationId;
    if (approvalStatus) filterObj.approvalStatus = approvalStatus;
    if (isRecurring !== undefined) filterObj.isRecurring = isRecurring === 'true';
    
    // Date range filter
    if (startDate || endDate) {
      filterObj.date = {};
      if (startDate) filterObj.date.$gte = new Date(startDate);
      if (endDate) filterObj.date.$lte = new Date(endDate);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filterObj.amount = {};
      if (minAmount) filterObj.amount.$gte = Number(minAmount);
      if (maxAmount) filterObj.amount.$lte = Number(maxAmount);
    }

    // Text search
    if (search) {
      filterObj.$or = [
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Expense.countDocuments(filterObj);

    // Get expenses with pagination and sorting
    const expenses = await Expense.find(filterObj)
      .populate('approvedBy', 'name')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: expenses.length,
      data: expenses
    });
  } catch (err) {
    console.error('Error fetching expenses:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single expense
// @route   GET /api/expenses/:id
// @access  Private
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('approvedBy', 'name')
      .populate('transactionId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Check user owns the expense
    if (req.user.role !== 'admin' && expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false, 
        error: 'User not authorized'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error fetching expense:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Generate a unique expense ID
    const expenseId = generateExpenseId();
    
    // Set default approval status based on user role
    let approvalStatus = 'Pending';
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      approvalStatus = 'Approved';
    }

    // Create expense
    const newExpense = new Expense({
      expenseId,
      user: req.user.id,
      ...req.body,
      approvalStatus
    });

    // If expense is already approved and payment method is Bank Transfer
    // create a bank transaction if account ID is provided
    if (approvalStatus === 'Approved' && 
        req.body.paymentMethod === 'Bank Transfer' && 
        req.body.accountId) {
      
      // Find the bank account
      const account = await BankAccount.findById(req.body.accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Check sufficient funds
      if (account.currentBalance < req.body.amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds in account'
        });
      }
      
      // Generate transaction ID - FIXED: Added await here
      const transactionId = await validators.generateTransactionId();
      
      // Create the bank transaction
      const bankTransaction = new BankTransaction({
        transactionId, // Now this will be a string, not a Promise
        user: req.user.id,
        account: req.body.accountId,
        amount: req.body.amount,
        type: 'withdrawal',
        date: req.body.date || new Date(),
        description: req.body.description,
        category: 'Expense',
        notes: `Expense: ${req.body.category} - ${expenseId}`
      });
      
      // Update account balance
      account.currentBalance -= req.body.amount;
      
      // Save transaction and account
      await bankTransaction.save();
      await account.save();
      
      // Link the transaction to the expense
      newExpense.transactionId = bankTransaction._id;
    }

    // Save the expense
    const expense = await newExpense.save();

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error creating expense:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Find expense by ID
    let expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Check user authorization
    if (req.user.role !== 'admin' && expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authorized'
      });
    }

    // Don't allow updating if expense is already approved unless user is admin
    if (expense.approvalStatus === 'Approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update approved expense'
      });
    }

    // Update expense
    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          updatedAt: Date.now()
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error updating expense:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Check user authorization
    if (req.user.role !== 'admin' && expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authorized'
      });
    }

    // Don't allow deletion if expense is already approved unless user is admin
    if (expense.approvalStatus === 'Approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete approved expense'
      });
    }

    // If there's a linked bank transaction, delete it too
    if (expense.transactionId) {
      const transaction = await BankTransaction.findById(expense.transactionId);
      if (transaction) {
        // Get the account
        const account = await BankAccount.findById(transaction.account);
        if (account) {
          // Reverse the effect on account balance
          account.currentBalance += transaction.amount;
          await account.save();
        }
        
        await BankTransaction.findByIdAndDelete(expense.transactionId);
      }
    }

    await expense.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error deleting expense:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Approve an expense
// @route   PUT /api/expenses/:id/approve
// @access  Private (Admin/Manager)
exports.approveExpense = async (req, res) => {
  try {
    // Only admins and managers can approve expenses
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(401).json({
        success: false,
        error: 'User not authorized to approve expenses'
      });
    }

    let expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Already approved
    if (expense.approvalStatus === 'Approved') {
      return res.status(400).json({
        success: false,
        error: 'Expense already approved'
      });
    }

    // Update approval status
    expense.approvalStatus = 'Approved';
    expense.approvedBy = req.user.id;

    // If payment method is Bank Transfer and accountId provided
    // create a bank transaction for the expense
    if (expense.paymentMethod === 'Bank Transfer' && req.body.accountId) {
      // Find the bank account
      const account = await BankAccount.findById(req.body.accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Check sufficient funds
      if (account.currentBalance < expense.amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds in account'
        });
      }
      
      // FIXED: Added await here
      const transactionId = await validators.generateTransactionId();
      
      // Create the bank transaction
      const bankTransaction = new BankTransaction({
        transactionId, // Now this will be a string, not a Promise
        user: req.user.id,
        account: req.body.accountId,
        amount: expense.amount,
        type: 'withdrawal',
        date: expense.date,
        description: expense.description,
        category: 'Expense',
        notes: `Expense: ${expense.category} - ${expense.expenseId}`
      });
      
      // Update account balance
      account.currentBalance -= expense.amount;
      
      // Save transaction and account
      await bankTransaction.save();
      await account.save();
      
      // Link the transaction to the expense
      expense.transactionId = bankTransaction._id;
    }

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error approving expense:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reject an expense
// @route   PUT /api/expenses/:id/reject
// @access  Private (Admin/Manager)
exports.rejectExpense = async (req, res) => {
  try {
    // Only admins and managers can reject expenses
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(401).json({
        success: false,
        error: 'User not authorized to reject expenses'
      });
    }

    let expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Already rejected
    if (expense.approvalStatus === 'Rejected') {
      return res.status(400).json({
        success: false,
        error: 'Expense already rejected'
      });
    }

    // Was approved but now rejected, need to reverse transaction if any
    if (expense.approvalStatus === 'Approved' && expense.transactionId) {
      const transaction = await BankTransaction.findById(expense.transactionId);
      if (transaction) {
        // Get the account
        const account = await BankAccount.findById(transaction.account);
        if (account) {
          // Reverse the effect on account balance
          account.currentBalance += transaction.amount;
          await account.save();
        }
        
        await BankTransaction.findByIdAndDelete(expense.transactionId);
        
        // Remove transaction reference
        expense.transactionId = null;
      }
    }

    // Update approval status
    expense.approvalStatus = 'Rejected';
    expense.approvedBy = req.user.id;
    
    // Add rejection reason if provided
    if (req.body.rejectionReason) {
      expense.notes = `${expense.notes}\nRejection reason: ${req.body.rejectionReason}`;
    }

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error rejecting expense:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get expense summary (for dashboard)
// @route   GET /api/expenses/summary
// @access  Private
exports.getExpenseSummary = async (req, res) => {
  try {
    // Get query parameters
    const { period = 'month', startDate, endDate, stationId } = req.query;
    
    // Set date range based on period if not explicitly provided
    const today = new Date();
    let periodStartDate, periodEndDate;

    if (!startDate) {
      switch(period) {
        case 'day':
          periodStartDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          periodStartDate = new Date(today);
          periodStartDate.setDate(periodStartDate.getDate() - periodStartDate.getDay());
          periodStartDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          periodStartDate = new Date(today.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          periodStartDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    } else {
      periodStartDate = new Date(startDate);
    }

    periodEndDate = endDate ? new Date(endDate) : new Date();

    // Build filter object
    const filterObj = {
      approvalStatus: 'Approved',
      date: { $gte: periodStartDate, $lte: periodEndDate }
    };
    
    if (req.user.role !== 'admin') {
      filterObj.user = req.user.id;
    }
    
    if (stationId) {
      filterObj.stationId = stationId;
    }

    // Get total expenses
    const totalExpensesAggregate = await Expense.aggregate([
      { $match: filterObj },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalExpenses = totalExpensesAggregate.length > 0 ? totalExpensesAggregate[0].total : 0;

    // Get expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: filterObj },
      { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } }
    ]);

    // Get expenses by payment method
    const expensesByPaymentMethod = await Expense.aggregate([
      { $match: filterObj },
      { $group: { _id: '$paymentMethod', amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } }
    ]);

    // Get expenses trend over time
    let groupFormat;
    switch(period) {
      case 'day':
        groupFormat = { $dateToString: { format: '%H:00', date: '$date' } };
        break;
      case 'week':
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
      case 'quarter':
      case 'year':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    const expensesTrend = await Expense.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: groupFormat,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get top 5 recent expenses
    const recentExpenses = await Expense.find(filterObj)
      .sort({ date: -1 })
      .limit(5)
      .select('expenseId date category description amount paymentMethod');

    // Prepare the response
    res.json({
      success: true,
      data: {
        period: {
          start: periodStartDate,
          end: periodEndDate,
          name: period
        },
        summary: {
          totalExpenses,
          expensesByCategory,
          expensesByPaymentMethod,
          expensesTrend,
          recentExpenses
        }
      }
    });
  } catch (err) {
    console.error('Error getting expense summary:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Upload attachment for an expense
// @route   POST /api/expenses/:id/attachments
// @access  Private
exports.uploadAttachment = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Check user authorization
    if (req.user.role !== 'admin' && expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authorized'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Add attachment to expense
    expense.attachments.push({
      name: req.file.originalname || 'attachment',
      path: req.file.path,
      uploadDate: new Date()
    });

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error uploading attachment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete attachment from an expense
// @route   DELETE /api/expenses/:id/attachments/:attachmentId
// @access  Private
exports.deleteAttachment = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Check user authorization
    if (req.user.role !== 'admin' && expense.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authorized'
      });
    }

    // Find attachment index
    const attachmentIndex = expense.attachments.findIndex(
      attachment => attachment._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Remove attachment from array
    expense.attachments.splice(attachmentIndex, 1);
    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (err) {
    console.error('Error deleting attachment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};