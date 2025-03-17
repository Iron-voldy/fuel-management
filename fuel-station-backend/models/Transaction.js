const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    default: Date.now
  },
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'expense', 'salary', 'transfer', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Uncategorized'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank', 'card', 'credit', 'other'],
    default: 'cash'
  },
  relatedDocumentId: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Pre-save hook to update updatedAt
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ category: 1 });
TransactionSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);