const mongoose = require('mongoose');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const { validationResult } = require('express-validator');

// Get all bank accounts
exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (err) {
    console.error('Error fetching bank accounts:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get accounts for dashboard
exports.getAccountsDashboard = async (req, res) => {
  try {
    const accounts = await BankAccount.find({}).sort({ createdAt: -1 });
    
    // Get summary information for dashboard
    const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
    const activeAccounts = accounts.filter(account => account.isActive).length;
    
    res.json({
      success: true,
      totalAccounts: accounts.length,
      activeAccounts,
      totalBalance,
      accounts: accounts.map(account => ({
        id: account._id,
        name: account.accountName,
        bank: account.bankName,
        balance: account.currentBalance,
        isActive: account.isActive
      }))
    });
  } catch (err) {
    console.error('Error fetching accounts dashboard:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a single bank account
exports.getAccountById = async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (err) {
    console.error('Error fetching bank account:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Create a new bank account
// Just the createAccount function for clarity
exports.createAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Check if account with same account number already exists
    const existingAccount = await BankAccount.findOne({ 
      accountNumber: req.body.accountNumber,
      bankName: req.body.bankName,
      user: req.user.id
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: 'A bank account with this account number already exists for this bank'
      });
    }

    // Add user ID if authentication is implemented
    if (req.user) {
      req.body.user = req.user.id;
    }

    // Create a new account - the accountId will be automatically generated in the pre-save hook
    const account = new BankAccount(req.body);
    await account.save();

    res.status(201).json({
      success: true,
      data: account
    });
  } catch (err) {
    console.error('Error creating bank account:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}

// Update a bank account
exports.updateAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Prevent modification of account number if transactions exist
    if (req.body.accountNumber) {
      const transactions = await BankTransaction.findOne({ accountId: req.params.id });
      if (transactions) {
        delete req.body.accountNumber; // Remove account number from update
      }
    }

    // Ensure updatedAt is set to current time
    req.body.updatedAt = Date.now();

    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (err) {
    console.error('Error updating bank account:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a bank account
exports.deleteAccount = async (req, res) => {
  try {
    // Check if account has transactions before deleting
    const transactions = await BankTransaction.findOne({ accountId: req.params.id });
    if (transactions) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with existing transactions. Deactivate it instead.'
      });
    }

    const account = await BankAccount.findByIdAndDelete(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error deleting bank account:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get account balance and transaction summary
exports.getAccountSummary = async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await BankTransaction.find({ account: req.params.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

    // Calculate summary statistics
    const totalDeposits = await BankTransaction.aggregate([
      { $match: { account: mongoose.Types.ObjectId(req.params.id), type: 'deposit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawals = await BankTransaction.aggregate([
      { $match: { account: mongoose.Types.ObjectId(req.params.id), type: 'withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        account,
        recentTransactions,
        summary: {
          totalDeposits: totalDeposits.length > 0 ? totalDeposits[0].total : 0,
          totalWithdrawals: totalWithdrawals.length > 0 ? totalWithdrawals[0].total : 0
        }
      }
    });
  } catch (err) {
    console.error('Error fetching account summary:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Reconcile an account
exports.reconcileAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { statementBalance, reconciliationDate, notes } = req.body;
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }

    // Update account with reconciliation info
    account.lastReconciled = reconciliationDate || new Date();
    account.reconciliationNotes = notes || '';
    
    // Calculate difference between statement and system
    const difference = statementBalance - account.currentBalance;
    
    await account.save();

    res.json({
      success: true,
      data: {
        account,
        reconciliation: {
          date: account.lastReconciled,
          statementBalance,
          systemBalance: account.currentBalance,
          difference
        }
      }
    });
  } catch (err) {
    console.error('Error reconciling account:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Transfer funds between accounts
// @desc    Transfer funds between accounts
// @route   POST /api/bank-book/transfer
// @access  Private
exports.transferFunds = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    fromAccountId,
    toAccountId,
    amount,
    description,
    date,
    category,
    reference,
    notes,
    withdrawalTransactionId, // Accept these from frontend if provided
    depositTransactionId
  } = req.body;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ msg: 'Amount must be greater than zero' });
    }

    // Get the source account
    const fromAccount = await BankAccount.findById(fromAccountId).session(session);
    if (!fromAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'Source account not found' });
    }

    // Get the destination account
    const toAccount = await BankAccount.findById(toAccountId).session(session);
    if (!toAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'Destination account not found' });
    }

    // Check user owns both accounts if user is in request
    if (req.user) {
      if (fromAccount.user && fromAccount.user.toString() !== req.user.id) {
        await session.abortTransaction();
        session.endSession();
        return res.status(401).json({ msg: 'User not authorized for source account' });
      }
      if (toAccount.user && toAccount.user.toString() !== req.user.id) {
        await session.abortTransaction();
        session.endSession();
        return res.status(401).json({ msg: 'User not authorized for destination account' });
      }
    }

    // Check sufficient funds
    if (fromAccount.currentBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Insufficient funds in source account' });
    }

    // Generate transaction IDs if not provided
    const finalWithdrawalTransactionId = withdrawalTransactionId || crypto.randomUUID();
    const finalDepositTransactionId = depositTransactionId || crypto.randomUUID();
    
    const currentDate = date ? new Date(date) : new Date();

    // Create withdrawal transaction
    const withdrawalTransaction = new BankTransaction({
      transactionId: finalWithdrawalTransactionId,
      account: fromAccountId,
      amount,
      type: 'withdrawal',
      date: currentDate,
      description: description || `Transfer to ${toAccount.accountName}`,
      category: category || 'Transfer',
      reference: reference || '',
      notes: notes || '',
      relatedAccount: toAccountId,
      isTransfer: true,
      user: req.user ? req.user.id : null
    });

    // Create deposit transaction
    const depositTransaction = new BankTransaction({
      transactionId: finalDepositTransactionId,
      account: toAccountId,
      amount,
      type: 'deposit',
      date: currentDate,
      description: description || `Transfer from ${fromAccount.accountName}`,
      category: category || 'Transfer',
      reference: reference || '',
      notes: notes || '',
      relatedAccount: fromAccountId,
      isTransfer: true,
      user: req.user ? req.user.id : null
    });

    // Update account balances
    fromAccount.currentBalance -= amount;
    toAccount.currentBalance += amount;

    // Save transactions and updated accounts
    await withdrawalTransaction.save({ session });
    await depositTransaction.save({ session });
    await fromAccount.save({ session });
    await toAccount.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({
      msg: 'Transfer completed successfully',
      fromAccount: {
        id: fromAccount._id,
        name: fromAccount.accountName,
        newBalance: fromAccount.currentBalance
      },
      toAccount: {
        id: toAccount._id,
        name: toAccount.accountName,
        newBalance: toAccount.currentBalance
      },
      amount,
      withdrawalTransaction: withdrawalTransaction._id,
      depositTransaction: depositTransaction._id
    });
  } catch (err) {
    // Abort the transaction on error
    await session.abortTransaction();
    session.endSession();
    console.error('Error transferring funds:', err);
    res.status(500).send('Server Error');
  }
};