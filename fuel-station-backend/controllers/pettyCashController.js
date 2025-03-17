const { validationResult } = require('express-validator');
const PettyCash = require('../models/PettyCash');
const PettyCashBalance = require('../models/PettyCashBalance');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const crypto = require('crypto');

// Helper function to generate unique petty cash transaction ID
const generateTransactionId = () => {
  const prefix = 'PCH';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

// @desc    Get all petty cash transactions with optional filtering
// @route   GET /api/petty-cash
// @access  Private
exports.getAllTransactions = async (req, res) => {
  try {
    const { 
      stationId, 
      transactionType,
      category,
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      approvalStatus,
      requestedBy,
      search,
      limit = 50,
      skip = 0,
      sort = '-date' // Default sort by date descending
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (req.user && req.user.role !== 'admin') {
      // If not admin, user can only see their station's data or their own requests
      if (req.user.stationId) {
        filterObj.stationId = req.user.stationId;
      } else {
        filterObj.requestedBy = req.user.id;
      }
    }
    
    if (stationId) filterObj.stationId = stationId;
    if (transactionType) filterObj.transactionType = transactionType;
    if (category) filterObj.category = category;
    if (approvalStatus) filterObj.approvalStatus = approvalStatus;
    if (requestedBy) filterObj.requestedBy = requestedBy;
    
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
    const total = await PettyCash.countDocuments(filterObj);

    // Get transactions with pagination and sorting
    const transactions = await PettyCash.find(filterObj)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    console.error('Error fetching petty cash transactions:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single petty cash transaction
// @route   GET /api/petty-cash/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await PettyCash.findById(req.params.id)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check authorization for non-admin users
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        transaction.requestedBy._id.toString() !== req.user.id && 
        (!req.user.stationId || transaction.stationId.toString() !== req.user.stationId.toString())) {
      return res.status(401).json({
        success: false, 
        error: 'Not authorized to view this transaction'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error('Error fetching petty cash transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new petty cash withdrawal request
// @route   POST /api/petty-cash/withdrawal
// @access  Private
exports.createWithdrawalRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { 
      stationId,
      amount, 
      description, 
      category, 
      date,
      notes 
    } = req.body;

    // Validate station
    if (!stationId && req.user.stationId) {
      req.body.stationId = req.user.stationId;
    } else if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    // Check petty cash balance
    let pettyCashBalance = await PettyCashBalance.findOne({ stationId: req.body.stationId });
    
    if (!pettyCashBalance) {
      // Create a new petty cash balance record if it doesn't exist
      pettyCashBalance = new PettyCashBalance({ 
        stationId: req.body.stationId,
        currentBalance: 0,
        updatedBy: req.user.id
      });
      await pettyCashBalance.save();
    }

    // Check if there's enough balance for the withdrawal
    if (pettyCashBalance.currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient petty cash balance',
        currentBalance: pettyCashBalance.currentBalance
      });
    }

    // Generate a unique transaction ID
    const transactionId = generateTransactionId();
    
    // Set default approval status based on user role and amount
    let approvalStatus = 'Pending';
    let approvedBy = null;
    
    // Auto-approve small amounts for managers
    const autoApprovalLimit = 1000; // LKR 1000 - can be configured
    if ((req.user.role === 'admin' || req.user.role === 'manager') && amount <= autoApprovalLimit) {
      approvalStatus = 'Approved';
      approvedBy = req.user.id;
      
      // Update petty cash balance if auto-approved
      pettyCashBalance.currentBalance -= amount;
      await pettyCashBalance.save();
    }

    // Create the withdrawal transaction
    const transaction = new PettyCash({
      transactionId,
      date: date || new Date(),
      stationId: req.body.stationId,
      amount,
      description,
      category,
      transactionType: 'withdrawal',
      requestedBy: req.user.id,
      approvedBy,
      approvalStatus,
      notes: notes || ''
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      data: transaction,
      balance: pettyCashBalance.currentBalance
    });
  } catch (err) {
    console.error('Error creating petty cash withdrawal:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a petty cash replenishment
// @route   POST /api/petty-cash/replenishment
// @access  Private (Admin/Manager)
exports.createReplenishment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Only admins and managers can replenish petty cash
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to replenish petty cash'
    });
  }

  try {
    const { 
      stationId,
      amount, 
      description, 
      accountId, // Bank account to withdraw from
      date,
      notes 
    } = req.body;

    // Validate station
    if (!stationId && req.user.stationId) {
      req.body.stationId = req.user.stationId;
    } else if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    // Validate bank account if provided
    if (accountId) {
      const account = await BankAccount.findById(accountId);
      
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Check if bank account has sufficient funds
      if (account.currentBalance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds in bank account'
        });
      }
    }

    // Find or create petty cash balance for the station
    let pettyCashBalance = await PettyCashBalance.findOne({ stationId: req.body.stationId });
    
    if (!pettyCashBalance) {
      pettyCashBalance = new PettyCashBalance({ 
        stationId: req.body.stationId,
        currentBalance: 0,
        updatedBy: req.user.id
      });
    }

    // Check maximum limit
    if (pettyCashBalance.currentBalance + amount > pettyCashBalance.maxLimit) {
      return res.status(400).json({
        success: false,
        error: `Replenishment would exceed maximum limit of ${pettyCashBalance.maxLimit}`,
        currentBalance: pettyCashBalance.currentBalance,
        maxLimit: pettyCashBalance.maxLimit
      });
    }

    // Generate a unique transaction ID
    const transactionId = generateTransactionId();
    
    // Create bank transaction if bank account is provided
    if (accountId) {
      // Generate bank transaction ID
      const bankTransactionId = 'BNK' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + 
                               Math.floor(1000 + Math.random() * 9000);
      
      // Create the bank transaction
      const bankTransaction = new BankTransaction({
        transactionId: bankTransactionId,
        user: req.user.id,
        account: accountId,
        amount,
        type: 'withdrawal',
        date: date || new Date(),
        description: description || 'Petty Cash Replenishment',
        category: 'PettyCash',
        notes: `Petty Cash Replenishment - ${transactionId}`
      });
      
      // Update the bank account balance
      const account = await BankAccount.findById(accountId);
      account.currentBalance -= amount;
      
      // Save bank transaction and updated account
      await bankTransaction.save();
      await account.save();
    }

    // Create petty cash replenishment transaction
    const transaction = new PettyCash({
      transactionId,
      date: date || new Date(),
      stationId: req.body.stationId,
      amount,
      description: description || 'Petty Cash Replenishment',
      category: 'Replenishment',
      transactionType: 'replenishment',
      requestedBy: req.user.id,
      approvedBy: req.user.id, // Auto-approved since only admins/managers can create replenishments
      approvalStatus: 'Approved',
      notes: notes || ''
    });

    // Update petty cash balance
    pettyCashBalance.currentBalance += amount;
    pettyCashBalance.lastReplenishmentDate = date || new Date();
    pettyCashBalance.lastReplenishmentAmount = amount;
    pettyCashBalance.updatedBy = req.user.id;
    
    await transaction.save();
    await pettyCashBalance.save();

    res.status(201).json({
      success: true,
      data: transaction,
      balance: pettyCashBalance.currentBalance
    });
  } catch (err) {
    console.error('Error creating petty cash replenishment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update a petty cash transaction
// @route   PUT /api/petty-cash/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    let transaction = await PettyCash.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if user is authorized to update
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        transaction.requestedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this transaction'
      });
    }

    // Cannot update approved or rejected transactions unless user is admin
    if (transaction.approvalStatus !== 'Pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: `Cannot update a transaction with status: ${transaction.approvalStatus}`
      });
    }

    // Cannot change transaction type
    if (req.body.transactionType && req.body.transactionType !== transaction.transactionType) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change transaction type'
      });
    }

    // Only update allowed fields
    const allowedUpdates = ['description', 'category', 'date', 'notes'];
    // For admins, allow amount update if transaction is still pending
    if (req.user.role === 'admin' && transaction.approvalStatus === 'Pending') {
      allowedUpdates.push('amount');
    }

    const updateData = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Add audit info
    updateData.updatedAt = Date.now();

    // Update the transaction
    transaction = await PettyCash.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error('Error updating petty cash transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete a petty cash transaction
// @route   DELETE /api/petty-cash/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await PettyCash.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if user is authorized to delete
    if (req.user.role !== 'admin' && transaction.requestedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this transaction'
      });
    }

    // Cannot delete approved or processed transactions unless user is admin
    if (transaction.approvalStatus === 'Approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an approved transaction'
      });
    }

    // If deleting an approved transaction, restore the balance
    if (transaction.approvalStatus === 'Approved') {
      const pettyCashBalance = await PettyCashBalance.findOne({ stationId: transaction.stationId });
      
      if (pettyCashBalance) {
        if (transaction.transactionType === 'withdrawal') {
          pettyCashBalance.currentBalance += transaction.amount;
        } else if (transaction.transactionType === 'replenishment') {
          pettyCashBalance.currentBalance -= transaction.amount;
          // Ensure balance doesn't go negative
          if (pettyCashBalance.currentBalance < 0) {
            pettyCashBalance.currentBalance = 0;
          }
        }
        
        await pettyCashBalance.save();
      }
    }

    await transaction.remove();

    res.json({
      success: true,
      message: 'Transaction removed'
    });
  } catch (err) {
    console.error('Error deleting petty cash transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Approve a petty cash withdrawal request
// @route   PUT /api/petty-cash/:id/approve
// @access  Private (Admin/Manager)
exports.approveTransaction = async (req, res) => {
  // Only admins and managers can approve petty cash requests
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to approve petty cash transactions'
    });
  }

  try {
    const transaction = await PettyCash.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Only pending transactions can be approved
    if (transaction.approvalStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Transaction already ${transaction.approvalStatus.toLowerCase()}`
      });
    }

    // Only withdrawals need approval
    if (transaction.transactionType !== 'withdrawal') {
      return res.status(400).json({
        success: false,
        error: 'Only withdrawal transactions need approval'
      });
    }

    // Check petty cash balance
    const pettyCashBalance = await PettyCashBalance.findOne({ stationId: transaction.stationId });
    
    if (!pettyCashBalance) {
      return res.status(404).json({
        success: false,
        error: 'Petty cash balance not found for this station'
      });
    }

    // Check if there's enough balance for the withdrawal
    if (pettyCashBalance.currentBalance < transaction.amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient petty cash balance',
        currentBalance: pettyCashBalance.currentBalance,
        requestedAmount: transaction.amount
      });
    }

    // Update the transaction status
    transaction.approvalStatus = 'Approved';
    transaction.approvedBy = req.user.id;
    transaction.updatedAt = Date.now();
    
    // Update the petty cash balance
    pettyCashBalance.currentBalance -= transaction.amount;
    pettyCashBalance.updatedBy = req.user.id;
    
    await transaction.save();
    await pettyCashBalance.save();
    
    // Return the updated transaction with approver information
    const updatedTransaction = await PettyCash.findById(req.params.id)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      data: updatedTransaction,
      currentBalance: pettyCashBalance.currentBalance
    });
  } catch (err) {
    console.error('Error approving petty cash transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reject a petty cash withdrawal request
// @route   PUT /api/petty-cash/:id/reject
// @access  Private (Admin/Manager)
exports.rejectTransaction = async (req, res) => {
  // Only admins and managers can reject petty cash requests
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to reject petty cash transactions'
    });
  }

  const { rejectionReason } = req.body;

  try {
    const transaction = await PettyCash.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Only pending transactions can be rejected
    if (transaction.approvalStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Transaction already ${transaction.approvalStatus.toLowerCase()}`
      });
    }

    // Update the transaction status
    transaction.approvalStatus = 'Rejected';
    transaction.approvedBy = req.user.id;
    transaction.updatedAt = Date.now();
    
    // Add rejection reason to notes if provided
    if (rejectionReason) {
      transaction.notes = transaction.notes 
        ? `${transaction.notes}\nRejection reason: ${rejectionReason}`
        : `Rejection reason: ${rejectionReason}`;
    }
    
    await transaction.save();
    
    // Return the updated transaction with approver information
    const updatedTransaction = await PettyCash.findById(req.params.id)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      data: updatedTransaction
    });
  } catch (err) {
    console.error('Error rejecting petty cash transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Upload receipt for a petty cash transaction
// @route   POST /api/petty-cash/:id/receipt
// @access  Private
exports.uploadReceipt = async (req, res) => {
  try {
    const transaction = await PettyCash.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if user is authorized (requestor or admin/manager)
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        transaction.requestedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to upload receipt for this transaction'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Update transaction with receipt URL
    transaction.receiptUrl = req.file.path;
    
    // Also add as an attachment
    transaction.attachments.push({
      name: req.file.originalname || 'receipt',
      path: req.file.path,
      uploadDate: new Date()
    });

    await transaction.save();

    res.json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error('Error uploading receipt:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get petty cash balance for a station
// @route   GET /api/petty-cash/balance/:stationId
// @access  Private
exports.getBalance = async (req, res) => {
  try {
    // If stationId is not provided, use the user's station
    const stationId = req.params.stationId || req.user.stationId;
    
    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    // Get balance for the station
    let balance = await PettyCashBalance.findOne({ stationId });
    
    // If no balance record exists, create one with zero balance
    if (!balance) {
      balance = new PettyCashBalance({
        stationId,
        currentBalance: 0,
        updatedBy: req.user.id
      });
      await balance.save();
    }

    // Get latest transactions
    const latestTransactions = await PettyCash.find({ stationId })
      .sort({ date: -1 })
      .limit(5)
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      data: {
        balance,
        needsReplenishment: balance.currentBalance < balance.minLimit,
        latestTransactions
      }
    });
  } catch (err) {
    console.error('Error getting petty cash balance:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get petty cash summary and statistics
// @route   GET /api/petty-cash/summary
// @access  Private
exports.getSummary = async (req, res) => {
  try {
    const { 
      stationId, 
      period = 'month',
      startDate,
      endDate
    } = req.query;

    // Build station filter
    const stationFilter = {};
    if (stationId) {
      stationFilter.stationId = stationId;
    } else if (req.user.stationId) {
      stationFilter.stationId = req.user.stationId;
    }

    // Set date range based on period
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

    // Get current balances
    const balances = await PettyCashBalance.find(stationFilter);
    
    const totalCurrentBalance = balances.reduce((sum, balance) => sum + balance.currentBalance, 0);

    // Get withdrawals for the period
    const withdrawals = await PettyCash.find({
      ...stationFilter,
      approvalStatus: 'Approved',
      transactionType: 'withdrawal',
      date: { $gte: periodStartDate, $lte: periodEndDate }
    });

    // Get replenishments for the period
    const replenishments = await PettyCash.find({
      ...stationFilter,
      approvalStatus: 'Approved',
      transactionType: 'replenishment',
      date: { $gte: periodStartDate, $lte: periodEndDate }
    });

    // Calculate totals
    const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReplenishments = replenishments.reduce((sum, tx) => sum + tx.amount, 0);

    // Group withdrawals by category
    const withdrawalsByCategory = {};
    withdrawals.forEach(withdrawal => {
      if (!withdrawalsByCategory[withdrawal.category]) {
        withdrawalsByCategory[withdrawal.category] = 0;
      }
      withdrawalsByCategory[withdrawal.category] += withdrawal.amount;
    });

    // This code should be appended to the pettyCashController.js file where it left off

    // Calculate top expense categories
    const topCategories = Object.entries(withdrawalsByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get pending requests
    const pendingRequests = await PettyCash.find({
      ...stationFilter,
      approvalStatus: 'Pending',
      transactionType: 'withdrawal'
    })
    .sort({ date: 1 })
    .populate('requestedBy', 'name');

    const totalPendingAmount = pendingRequests.reduce((sum, req) => sum + req.amount, 0);

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
          currentBalance: totalCurrentBalance,
          totalWithdrawals,
          totalReplenishments,
          netChange: totalReplenishments - totalWithdrawals,
          withdrawalsByCategory,
          topCategories
        },
        pendingRequests: {
          count: pendingRequests.length,
          amount: totalPendingAmount,
          requests: pendingRequests.slice(0, 5) // Only return the first 5
        },
        stations: balances.map(balance => ({
          stationId: balance.stationId,
          currentBalance: balance.currentBalance,
          maxLimit: balance.maxLimit,
          minLimit: balance.minLimit,
          needsReplenishment: balance.currentBalance < balance.minLimit
        }))
      }
    });
  } catch (err) {
    console.error('Error getting petty cash summary:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update petty cash balance settings
// @route   PUT /api/petty-cash/balance/:stationId
// @access  Private (Admin/Manager)
exports.updateBalanceSettings = async (req, res) => {
  // Only admins and managers can update petty cash settings
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to update petty cash settings'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { maxLimit, minLimit } = req.body;
    const stationId = req.params.stationId || req.user.stationId;
    
    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    // Get or create balance record
    let balance = await PettyCashBalance.findOne({ stationId });
    
    if (!balance) {
      balance = new PettyCashBalance({
        stationId,
        currentBalance: 0,
        updatedBy: req.user.id
      });
    }

    // Update settings
    if (maxLimit !== undefined) {
      balance.maxLimit = maxLimit;
    }
    
    if (minLimit !== undefined) {
      balance.minLimit = minLimit;
    }
    
    balance.updatedBy = req.user.id;
    await balance.save();

    res.json({
      success: true,
      data: balance
    });
  } catch (err) {
    console.error('Error updating petty cash settings:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};