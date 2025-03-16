const { validationResult } = require('express-validator');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const mongoose = require('mongoose');

// ========== BANK ACCOUNT OPERATIONS ==========

// @route   POST api/bank-book/accounts
// @desc    Create a new bank account
// @access  Private
exports.createBankAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      accountId,
      bankName,
      accountNumber,
      accountType,
      branch,
      currency,
      openingBalance,
      description,
      stationId
    } = req.body;

    // Check if account with this account number already exists
    const existingAccount = await BankAccount.findOne({ accountNumber });
    if (existingAccount) {
      return res.status(400).json({ msg: 'Bank account already exists with this account number' });
    }

    // Create new bank account
    const newBankAccount = new BankAccount({
      accountId,
      bankName,
      accountNumber,
      accountType,
      branch,
      currency: currency || 'LKR',
      openingBalance,
      currentBalance: openingBalance, // Initially, current balance equals opening balance
      description,
      stationId,
      createdBy: req.user.id
    });

    const bankAccount = await newBankAccount.save();
    res.json(bankAccount);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/bank-book/accounts
// @desc    Get all bank accounts
// @access  Private
exports.getAllBankAccounts = async (req, res) => {
  try {
    const bankAccounts = await BankAccount.find()
      .sort({ bankName: 1, accountNumber: 1 });
    res.json(bankAccounts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/bank-book/accounts/:id
// @desc    Get bank account by ID
// @access  Private
exports.getBankAccountById = async (req, res) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id);
    if (!bankAccount) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }
    res.json(bankAccount);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Bank account not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   PUT api/bank-book/accounts/:id
// @desc    Update a bank account
// @access  Private
exports.updateBankAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      bankName,
      accountType,
      branch,
      currency,
      description,
      active
    } = req.body;

    // Build bank account object
    const bankAccountFields = {};
    if (bankName) bankAccountFields.bankName = bankName;
    if (accountType) bankAccountFields.accountType = accountType;
    if (branch) bankAccountFields.branch = branch;
    if (currency) bankAccountFields.currency = currency;
    if (description !== undefined) bankAccountFields.description = description;
    if (active !== undefined) bankAccountFields.active = active;
    bankAccountFields.lastUpdated = Date.now();

    // Update bank account
    let bankAccount = await BankAccount.findById(req.params.id);
    if (!bankAccount) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    // Don't allow changing account number or opening balance
    bankAccount = await BankAccount.findByIdAndUpdate(
      req.params.id,
      { $set: bankAccountFields },
      { new: true }
    );

    res.json(bankAccount);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   DELETE api/bank-book/accounts/:id
// @desc    Delete a bank account
// @access  Private
exports.deleteBankAccount = async (req, res) => {
  try {
    // Check if account has transactions
    const transactions = await BankTransaction.find({ accountId: req.params.id });
    if (transactions.length > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete account with existing transactions. Deactivate it instead.' 
      });
    }

    const bankAccount = await BankAccount.findById(req.params.id);
    if (!bankAccount) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    await BankAccount.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Bank account removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Bank account not found' });
    }
    res.status(500).send('Server error');
  }
};

// ========== BANK TRANSACTION OPERATIONS ==========

// @route   POST api/bank-book/transactions
// @desc    Record a bank transaction
// @access  Private
exports.createTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      transactionId,
      accountId,
      date,
      type,
      amount,
      description,
      category,
      paymentMethod,
      referenceNumber,
      chequeNumber,
      relatedAccountId,
      stationId,
      attachments
    } = req.body;

    // Validate transaction type
    if (!['deposit', 'withdrawal', 'transfer', 'interest', 'charge', 'other'].includes(type)) {
      return res.status(400).json({ msg: 'Invalid transaction type' });
    }

    // Check if the bank account exists
    const bankAccount = await BankAccount.findById(accountId).session(session);
    if (!bankAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    // Calculate new balance
    let newBalance = bankAccount.currentBalance;
    if (type === 'deposit' || type === 'interest') {
      newBalance += amount;
    } else if (type === 'withdrawal' || type === 'charge') {
      if (bankAccount.currentBalance < amount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ msg: 'Insufficient funds in the account' });
      }
      newBalance -= amount;
    } else if (type === 'transfer') {
      // For transfers, check if the related account exists
      if (relatedAccountId) {
        const relatedAccount = await BankAccount.findById(relatedAccountId).session(session);
        if (!relatedAccount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ msg: 'Related bank account not found' });
        }

        // If this is an outgoing transfer
        if (bankAccount.currentBalance < amount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ msg: 'Insufficient funds for transfer' });
        }
        newBalance -= amount;

        // Update related account balance
        const relatedNewBalance = relatedAccount.currentBalance + amount;
        await BankAccount.findByIdAndUpdate(
          relatedAccountId,
          { 
            $set: { 
              currentBalance: relatedNewBalance,
              lastUpdated: Date.now()
            } 
          },
          { session }
        );

        // Create the corresponding transaction for the related account
        const relatedTransaction = new BankTransaction({
          transactionId: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accountId: relatedAccountId,
          date,
          type: 'deposit', // It's a deposit for the receiving account
          amount,
          balanceAfterTransaction: relatedNewBalance,
          description: `Transfer from ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
          category: 'transfer',
          paymentMethod: 'transfer',
          referenceNumber,
          relatedAccountId: accountId,
          stationId,
          createdBy: req.user.id
        });
        await relatedTransaction.save({ session });
      } else {
        // If no related account, treat as a withdrawal
        if (bankAccount.currentBalance < amount) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ msg: 'Insufficient funds in the account' });
        }
        newBalance -= amount;
      }
    }

    // Create the transaction
    const newTransaction = new BankTransaction({
      transactionId,
      accountId,
      date: date || Date.now(),
      type,
      amount,
      balanceAfterTransaction: newBalance,
      description,
      category,
      paymentMethod,
      referenceNumber,
      chequeNumber,
      relatedAccountId,
      stationId,
      attachments,
      createdBy: req.user.id
    });

    // Update bank account balance
    await BankAccount.findByIdAndUpdate(
      accountId,
      { 
        $set: { 
          currentBalance: newBalance,
          lastUpdated: Date.now()
        } 
      },
      { session }
    );

    // Save the transaction
    const transaction = await newTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json(transaction);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/bank-book/transactions
// @desc    Get all bank transactions with optional filtering
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { accountId, startDate, endDate, type, category, limit, page } = req.query;
    
    // Build query object
    const query = {};
    if (accountId) query.accountId = accountId;
    if (type) query.type = type;
    if (category) query.category = category;
    
    // Date filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Pagination
    const pageSize = limit ? parseInt(limit) : 20;
    const currentPage = page ? parseInt(page) : 1;
    const skip = (currentPage - 1) * pageSize;

    // Get total count for pagination
    const total = await BankTransaction.countDocuments(query);

    // Fetch transactions
    const transactions = await BankTransaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('accountId', 'bankName accountNumber')
      .populate('createdBy', 'name');

    res.json({
      transactions,
      pagination: {
        total,
        pageSize,
        currentPage,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/bank-book/transactions/:id
// @desc    Get transaction by ID
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id)
      .populate('accountId', 'bankName accountNumber')
      .populate('relatedAccountId', 'bankName accountNumber')
      .populate('createdBy', 'name');
      
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   POST api/bank-book/transactions/:id/reconcile
// @desc    Mark a transaction as reconciled
// @access  Private
exports.reconcileTransaction = async (req, res) => {
  try {
    const transaction = await BankTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    transaction.reconciled = true;
    transaction.reconciliationDate = Date.now();
    transaction.updatedAt = Date.now();

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   GET api/bank-book/accounts/:id/statement
// @desc    Generate account statement for a specific period
// @access  Private
exports.generateStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ msg: 'Start date and end date are required' });
    }

    // Find the bank account
    const bankAccount = await BankAccount.findById(req.params.id);
    if (!bankAccount) {
      return res.status(404).json({ msg: 'Bank account not found' });
    }

    // Get opening balance - find the latest transaction before the start date
    const openingBalanceTransaction = await BankTransaction.findOne({
      accountId: req.params.id,
      date: { $lt: new Date(startDate) }
    }).sort({ date: -1 });

    let openingBalance = bankAccount.openingBalance;
    if (openingBalanceTransaction) {
      openingBalance = openingBalanceTransaction.balanceAfterTransaction;
    }

    // Get transactions within the date range
    const transactions = await BankTransaction.find({
      accountId: req.params.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 })
      .populate('createdBy', 'name');

    // Calculate totals
    const deposits = transactions
      .filter(t => t.type === 'deposit' || t.type === 'interest')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const withdrawals = transactions
      .filter(t => t.type === 'withdrawal' || t.type === 'charge')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const transfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate closing balance
    const closingBalance = openingBalance + deposits - withdrawals - transfers;

    // Format the statement
    const statement = {
      accountInfo: {
        id: bankAccount._id,
        accountId: bankAccount.accountId,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        branch: bankAccount.branch,
        currency: bankAccount.currency
      },
      statementPeriod: {
        startDate,
        endDate
      },
      summary: {
        openingBalance,
        totalDeposits: deposits,
        totalWithdrawals: withdrawals,
        totalTransfers: transfers,
        closingBalance
      },
      transactions
    };

    res.json(statement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};