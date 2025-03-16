const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required']
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required']
  },
  branchName: {
    type: String,
    default: ''
  },
  routingNumber: {
    type: String,
    default: ''
  },
  accountType: {
    type: String,
    enum: ['Checking', 'Savings', 'Credit Card', 'Loan', 'Investment', 'Other'],
    default: 'Checking'
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastReconciled: {
    type: Date,
    default: null
  },
  reconciliationNotes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for user + account number + bank name
BankAccountSchema.index({ user: 1, accountNumber: 1, bankName: 1 }, { unique: true });

// Index for faster queries
BankAccountSchema.index({ user: 1, isActive: 1 });

// Pre-save hook to update the updatedAt field
BankAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted balance
BankAccountSchema.virtual('formattedBalance').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.currentBalance);
});

// Method to check if account has sufficient funds
BankAccountSchema.methods.hasSufficientFunds = function(amount) {
  return this.currentBalance >= amount;
};

// Method to update balance
BankAccountSchema.methods.updateBalance = function(amount, isDeposit) {
  if (isDeposit) {
    this.currentBalance += amount;
  } else {
    if (!this.hasSufficientFunds(amount)) {
      throw new Error('Insufficient funds');
    }
    this.currentBalance -= amount;
  }
  return this.save();
};

module.exports = mongoose.model('BankAccount', BankAccountSchema);