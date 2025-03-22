const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BankTransactionSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bankAccount',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Uncategorized'
  },
  reference: {
    type: String
  },
  notes: {
    type: String
  },
  isReconciled: {
    type: Boolean,
    default: false
  },
  isTransfer: {
    type: Boolean,
    default: false
  },
  relatedAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bankAccount',
    default: null
  },
  attachments: [
    {
      name: String,
      path: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
BankTransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('bankTransaction', BankTransactionSchema);