const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  loanId: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [100, 'Loan amount must be at least 100']
  },
  purpose: {
    type: String,
    required: [true, 'Loan purpose is required']
  },
  interestRate: {
    type: Number,
    required: true,
    default: 23 // Default interest rate of 23%
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  durationMonths: {
    type: Number,
    required: true,
    min: [1, 'Loan duration must be at least 1 month']
  },
  installmentAmount: {
    type: Number,
    required: true
  },
  totalRepayable: {
    type: Number,
    required: true
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  installments: [{
    installmentNumber: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    paidDate: {
      type: Date
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll'
    },
    notes: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  rejectionReason: {
    type: String
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

// Create index for faster queries
LoanSchema.index({ employeeId: 1, status: 1 });
LoanSchema.index({ loanId: 1 });
LoanSchema.index({ status: 1 });

// Pre-save hook to update the updatedAt field
LoanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for remaining installments
LoanSchema.virtual('remainingInstallments').get(function() {
  return this.installments.filter(i => i.status === 'pending' || i.status === 'overdue').length;
});

// Method to check for overdue installments
LoanSchema.methods.checkOverdueInstallments = function() {
  const today = new Date();
  let hasOverdue = false;
  
  this.installments.forEach(installment => {
    if (installment.status === 'pending' && installment.dueDate < today) {
      installment.status = 'overdue';
      hasOverdue = true;
    }
  });
  
  return hasOverdue ? this.save() : Promise.resolve(this);
};

module.exports = mongoose.model('Loan', LoanSchema);