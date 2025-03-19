const mongoose = require('mongoose');

const PettyCashSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  stationId: {
    type: String, // Changed from ObjectId to String
    required: false // Made it optional
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Stationery',
      'Cleaning',
      'Refreshments',
      'Maintenance',
      'Transport',
      'Utilities',
      'Miscellaneous',
      'Replenishment' // Added this to the enum list
    ]
  },
  transactionType: {
    type: String,
    enum: ['withdrawal', 'replenishment'],
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  receiptUrl: {
    type: String
  },
  attachments: [{
    name: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
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

// Indexes for faster queries
PettyCashSchema.index({ transactionType: 1, date: -1 });
PettyCashSchema.index({ requestedBy: 1, date: -1 });
PettyCashSchema.index({ stationId: 1, date: -1 });
PettyCashSchema.index({ approvalStatus: 1 });

// Pre-save hook to update the updatedAt field
PettyCashSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PettyCash', PettyCashSchema);