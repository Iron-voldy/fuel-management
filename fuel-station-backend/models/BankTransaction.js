const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  relatedAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: [true, 'Transaction type is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    default: 'Uncategorized'
  },
  reference: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  isTransfer: {
    type: Boolean,
    default: false
  },
  isReconciled: {
    type: Boolean,
    default: false
  },
  attachments: [{
    name: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
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

// Indexes for faster queries
BankTransactionSchema.index({ account: 1, date: -1 });
BankTransactionSchema.index({ user: 1, date: -1 });
BankTransactionSchema.index({ user: 1, type: 1, date: -1 });
BankTransactionSchema.index({ user: 1, category: 1, date: -1 });

// Add text index for searching
BankTransactionSchema.index({ 
  description: 'text', 
  reference: 'text', 
  notes: 'text', 
  category: 'text' 
});

// Pre-save hook to update the updatedAt field
BankTransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted amount
BankTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Static method to find recent transactions
BankTransactionSchema.statics.findRecent = function(userId, accountId, limit = 10) {
  const query = { user: userId };
  if (accountId) query.account = accountId;
  
  return this.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .populate('account', 'accountName bankName');
};

// Method to add attachment
BankTransactionSchema.methods.addAttachment = function(name, path) {
  this.attachments.push({ name, path });
  return this.save();
};

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);