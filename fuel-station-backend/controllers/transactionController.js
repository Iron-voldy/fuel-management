const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');

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
    const filterObj = { user: req.user.id };
    
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

// Rest of your controller code...

// @desc    Get reconciliation summary for an account
// @route   GET /api/bank-book/accounts/:id/reconciliation
// @access  Private
exports.getReconciliationSummary = async (req, res) => {
  try {
    // Verify account exists and belongs to user
    const account = await BankAccount.findOne({
      _id: req.params.id,
      user: req.user.id
    });

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

module.exports = exports;