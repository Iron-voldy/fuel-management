const mongoose = require('mongoose');

const BankTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'interest', 'charge', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfterTransaction: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'sales', 'fuel_purchase', 'salary', 'rent', 
      'utilities', 'maintenance', 'taxes', 'insurance', 
      'loan_repayment', 'equipment', 'transfer', 'other'
    ]
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'transfer', 'online', 'card', 'other'],
    required: true
  },
  referenceNumber: {
    type: String
  },
  chequeNumber: {
    type: String
  },
  // For transfers between accounts
  relatedAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  // For reconciliation
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciliationDate: {
    type: Date
  },
  attachments: [String],
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BankTransaction', BankTransactionSchema);