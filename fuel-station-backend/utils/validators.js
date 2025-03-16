const mongoose = require('mongoose');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');

// Generate unique bank account ID
exports.generateBankAccountId = async () => {
  const prefix = 'BA';
  let isUnique = false;
  let accountId;

  while (!isUnique) {
    // Generate a random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    accountId = `${prefix}${randomNum}`;

    // Check if it already exists
    const existingAccount = await BankAccount.findOne({ accountId });
    if (!existingAccount) {
      isUnique = true;
    }
  }

  return accountId;
};

// Generate unique bank transaction ID
exports.generateTransactionId = async () => {
  const prefix = 'TXN';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let transactionId;

  while (!isUnique) {
    // Generate a random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    transactionId = `${prefix}${dateStr}${randomNum}`;

    // Check if it already exists
    const existingTransaction = await BankTransaction.findOne({ transactionId });
    if (!existingTransaction) {
      isUnique = true;
    }
  }

  return transactionId;
};

// Validate MongoDB ObjectID
exports.isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Validate bank account balance is sufficient for withdrawal
exports.hasSufficientBalance = async (accountId, amount) => {
  const account = await BankAccount.findById(accountId);
  if (!account) {
    return {
      isValid: false,
      message: 'Bank account not found'
    };
  }

  if (account.currentBalance < amount) {
    return {
      isValid: false,
      message: 'Insufficient balance in the account'
    };
  }

  return {
    isValid: true,
    message: 'Sufficient balance'
  };
};

// Format currency amount
exports.formatCurrency = (amount, currency = 'LKR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate EPF, ETF amounts based on salary
exports.calculateStatutoryContributions = (basicSalary) => {
  const epfEmployee = basicSalary * 0.08; // 8% employee contribution
  const epfEmployer = basicSalary * 0.12; // 12% employer contribution
  const etf = basicSalary * 0.03; // 3% ETF contribution

  return {
    epfEmployee,
    epfEmployer,
    etf,
    totalEmployerContribution: epfEmployer + etf // 15% total
  };
};