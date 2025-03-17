const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expenseId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Fuel Purchase',
      'Electricity',
      'Water',
      'Rent',
      'Salaries',
      'Maintenance',
      'Equipment',
      'Office Supplies',
      'Marketing',
      'Insurance',
      'Taxes',
      'Transportation',
      'Utilities',
      'Other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank Transfer', 'Credit Card', 'Check', 'Other']
  },
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', null],
    default: null
  },
  attachments: [{
    name: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankTransaction',
    default: null
  },
  notes: {
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

// Create indexes for faster queries
ExpenseSchema.index({ user: 1, date: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ stationId: 1 });
ExpenseSchema.index({ approvalStatus: 1 });

// Add text index for searching
ExpenseSchema.index({
  description: 'text',
  category: 'text',
  notes: 'text'
});

// Pre-save hook to update the updatedAt field
ExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted amount
ExpenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR'
  }).format(this.amount);
});

module.exports = mongoose.model('Expense', ExpenseSchema);