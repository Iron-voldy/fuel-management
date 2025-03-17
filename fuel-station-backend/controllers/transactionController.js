const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const crypto = require('crypto');


// @desc    Get all transactions with optional filtering
// @route   GET /api/bank-book/transactions
// @access  Private
exports.getAllTransactions = async (req, res) => {
  try {
    const { 
      accountId, 
      type, 
      category, 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
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
    
    if (accountId) filterObj.account = accountId;
    if (type) filterObj.type = type;
    if (category) filterObj.category = category;
    
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
        { reference: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await BankTransaction.countDocuments(filterObj);

    // Get transactions with pagination and sorting
    const transactions = await BankTransaction.find(filterObj)
      .populate('account', 'accountName bankName')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      total,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get a single transaction
// @route   GET /api/bank-book/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id)
      .populate('account', 'accountName bankName accountNumber')
      .populate('relatedAccount', 'accountName bankName');

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new transaction
// @route   POST /api/bank-book/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    accountId,
    amount,
    type,
    date,
    description,
    category,
    reference,
    notes,
    relatedAccountId
  } = req.body;

  try {
    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ msg: 'Amount must be greater than zero' });
    }

    // Get the account
    const account = await BankAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    // Check user owns the account if user is in request
    if (req.user && account.user && account.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Check related account if provided
    let relatedAccount = null;
    if (relatedAccountId) {
      relatedAccount = await BankAccount.findById(relatedAccountId);
      if (!relatedAccount) {
        return res.status(404).json({ msg: 'Related account not found' });
      }
      if (req.user && relatedAccount.user && relatedAccount.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized for related account' });
      }
    }

    // Create transaction
    const newTransaction = new BankTransaction({
      account: accountId,
      amount,
      type,
      date: date || new Date(),
      description,
      category: category || 'Uncategorized',
      reference: reference || '',
      notes: notes || '',
      relatedAccount: relatedAccountId || null,
      isTransfer: relatedAccountId ? true : false,
      user: req.user ? req.user.id : null
    });

    // Update account balance
    if (type === 'deposit') {
      account.currentBalance += amount;
    } else if (type === 'withdrawal') {
      // Check sufficient funds
      if (account.currentBalance < amount) {
        return res.status(400).json({ msg: 'Insufficient funds in account' });
      }
      account.currentBalance -= amount;
    }

    // Save transaction and updated account
    const transaction = await newTransaction.save();
    await account.save();

    // Populate account details
    const populatedTransaction = await BankTransaction.findById(transaction._id)
      .populate('account', 'accountName bankName');

    res.json(populatedTransaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a transaction
// @route   PUT /api/bank-book/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    description,
    category,
    date,
    reference,
    notes
  } = req.body;

  try {
    const transaction = await BankTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Don't allow updating critical fields like amount, type, or account
    // Only allow updating metadata
    if (description) transaction.description = description;
    if (category) transaction.category = category;
    if (date) transaction.date = date;
    if (reference !== undefined) transaction.reference = reference;
    if (notes !== undefined) transaction.notes = notes;

    const updatedTransaction = await transaction.save();
    
    // Populate account details
    const populatedTransaction = await BankTransaction.findById(updatedTransaction._id)
      .populate('account', 'accountName bankName');
    
    if (transaction.relatedAccount) {
      await populatedTransaction.populate('relatedAccount', 'accountName bankName');
    }

    res.json(populatedTransaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/bank-book/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get the account to update balance
    const account = await BankAccount.findById(transaction.account);
    if (!account) {
      return res.status(404).json({ msg: 'Associated bank account not found' });
    }

    // Reverse the effect on account balance
    if (transaction.type === 'deposit') {
      account.currentBalance -= transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      account.currentBalance += transaction.amount;
    }

    // Delete related transaction if this is part of a transfer
    if (transaction.isTransfer && transaction.relatedAccount) {
      // Find and delete the related transaction
      const relatedTransaction = await BankTransaction.findOne({
        relatedAccount: transaction.account,
        account: transaction.relatedAccount,
        amount: transaction.amount,
        isTransfer: true
      });

      if (relatedTransaction) {
        // Update the related account balance
        const relatedAccount = await BankAccount.findById(transaction.relatedAccount);
        if (relatedAccount) {
          if (transaction.type === 'deposit') {
            // If this was a deposit, the related was a withdrawal
            relatedAccount.currentBalance += transaction.amount;
          } else {
            // If this was a withdrawal, the related was a deposit
            relatedAccount.currentBalance -= transaction.amount;
          }
          await relatedAccount.save();
        }
        
        await relatedTransaction.remove();
      }
    }

    // Save account with updated balance and remove transaction
    await account.save();
    await transaction.remove();

    res.json({ msg: 'Transaction removed', affectedAccountId: account._id });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Get transaction stats and summary
// @route   GET /api/bank-book/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res) => {
  try {
    const { 
      accountId,
      period = 'month', // Options: day, week, month, quarter, year
      startDate,
      endDate 
    } = req.query;

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
      date: { $gte: periodStartDate, $lte: periodEndDate }
    };
    
    if (req.user) {
      filterObj.user = req.user.id;
    }
    
    if (accountId) filterObj.account = accountId;

    // Get transaction totals by type
    const depositTotal = await BankTransaction.aggregate([
      { $match: { ...filterObj, type: 'deposit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const withdrawalTotal = await BankTransaction.aggregate([
      { $match: { ...filterObj, type: 'withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get category breakdown
    const categoryBreakdown = await BankTransaction.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: { type: '$type', category: '$category' }, 
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Format category data
    const formattedCategories = {};
    categoryBreakdown.forEach(item => {
      const type = item._id.type;
      const category = item._id.category;
      
      if (!formattedCategories[type]) {
        formattedCategories[type] = [];
      }
      
      formattedCategories[type].push({
        category,
        amount: item.total,
        count: item.count
      });
    });

    // Get daily/weekly/monthly trend data
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

    const trends = await BankTransaction.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: { date: groupFormat, type: '$type' }, 
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format trend data
    const formattedTrends = {};
    trends.forEach(item => {
      const date = item._id.date;
      const type = item._id.type;
      
      if (!formattedTrends[date]) {
        formattedTrends[date] = {
          date,
          deposit: 0,
          withdrawal: 0
        };
      }
      
      formattedTrends[date][type] = item.total;
    });

    // Convert to array for easier frontend consumption
    const trendArray = Object.values(formattedTrends);

    res.json({
      period: {
        start: periodStartDate,
        end: periodEndDate,
        name: period
      },
      totals: {
        deposits: depositTotal.length > 0 ? depositTotal[0].total : 0,
        withdrawals: withdrawalTotal.length > 0 ? withdrawalTotal[0].total : 0,
        netCashFlow: (depositTotal.length > 0 ? depositTotal[0].total : 0) - 
                     (withdrawalTotal.length > 0 ? withdrawalTotal[0].total : 0)
      },
      categories: formattedCategories,
      trends: trendArray
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Upload attachment for a transaction
// @route   POST /api/bank-book/transactions/:id/attachments
// @access  Private
exports.uploadAttachment = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Add attachment to transaction
    transaction.attachments.push({
      name: req.file.originalname || 'attachment',
      path: req.file.path,
      uploadDate: new Date()
    });

    await transaction.save();

    res.json({
      msg: 'Attachment uploaded successfully',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete attachment from a transaction
// @route   DELETE /api/bank-book/transactions/:id/attachments/:attachmentId
// @access  Private
exports.deleteAttachment = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Find attachment index
    const attachmentIndex = transaction.attachments.findIndex(
      attachment => attachment._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ msg: 'Attachment not found' });
    }

    // Remove attachment from array
    transaction.attachments.splice(attachmentIndex, 1);
    await transaction.save();

    res.json({
      msg: 'Attachment deleted',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Mark transaction as reconciled
// @route   PUT /api/bank-book/transactions/:id/reconcile
// @access  Private
exports.reconcileTransaction = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    // Check user owns the transaction
    if (req.user && transaction.user && transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Toggle reconciled status
    transaction.isReconciled = !transaction.isReconciled;
    await transaction.save();

    res.json({
      msg: transaction.isReconciled ? 'Transaction marked as reconciled' : 'Transaction marked as unreconciled',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Batch reconcile transactions
// @route   POST /api/bank-book/transactions/batch-reconcile
// @access  Private
exports.batchReconcileTransactions = async (req, res) => {
  const { transactionIds, isReconciled = true } = req.body;

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ msg: 'Please provide an array of transaction IDs' });
  }

  try {
    // Verify all transactions belong to user
    let filter = { _id: { $in: transactionIds } };
    if (req.user) {
      filter.user = req.user.id;
    }
    
    const transactions = await BankTransaction.find(filter);

    if (transactions.length !== transactionIds.length) {
      return res.status(401).json({ 
        msg: 'You are not authorized for all transactions or some transactions were not found' 
      });
    }

    // Update all transactions
    const result = await BankTransaction.updateMany(
      { _id: { $in: transactionIds } },
      { $set: { isReconciled } }
    );

    res.json({
      msg: `${result.nModified} transactions updated`,
      isReconciled
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get reconciliation summary for an account
// @route   GET /api/bank-book/accounts/:id/reconciliation
// @access  Private
exports.getReconciliationSummary = async (req, res) => {
  try {
    // Verify account exists and belongs to user
    let filter = { _id: req.params.id };
    if (req.user) {
      filter.user = req.user.id;
    }
    
    const account = await BankAccount.findOne(filter);

    if (!account) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    // Get transactions grouped by reconciliation status
    const reconciledTransactions = await BankTransaction.find({
      account: req.params.id,
      isReconciled: true
    }).sort({ date: -1 });

    const unreconciledTransactions = await BankTransaction.find({
      account: req.params.id,
      isReconciled: false
    }).sort({ date: -1 });

    // Calculate totals for reconciled transactions
    const reconciledDeposits = reconciledTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const reconciledWithdrawals = reconciledTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate totals for unreconciled transactions
    const unreconciledDeposits = unreconciledTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const unreconciledWithdrawals = unreconciledTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate reconciled balance
    const reconciledBalance = account.openingBalance + reconciledDeposits - reconciledWithdrawals;

    res.json({
      account: {
        id: account._id,
        name: account.accountName,
        currentBalance: account.currentBalance,
        openingBalance: account.openingBalance,
        lastReconciled: account.lastReconciled
      },
      reconciled: {
        count: reconciledTransactions.length,
        deposits: reconciledDeposits,
        withdrawals: reconciledWithdrawals,
        balance: reconciledBalance
      },
      unreconciled: {
        count: unreconciledTransactions.length,
        deposits: unreconciledDeposits,
        withdrawals: unreconciledWithdrawals,
        transactions: unreconciledTransactions
      },
      expectedBalance: reconciledBalance + unreconciledDeposits - unreconciledWithdrawals,
      difference: account.currentBalance - (reconciledBalance + unreconciledDeposits - unreconciledWithdrawals)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};