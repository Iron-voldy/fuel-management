const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  payrollId: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  payPeriod: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    }
  },
  earnings: {
    basicSalary: {
      type: Number,
      required: true
    },
    allowances: [{
      type: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    }],
    overtimeHours: {
      type: Number,
      default: 0
    },
    overtimeAmount: {
      type: Number,
      default: 0
    },
    bonuses: {
      type: Number,
      default: 0
    },
    otherEarnings: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      required: true
    }
  },
  deductions: {
    epfEmployee: {
      type: Number,
      required: true
    },
    loanRepayment: {
      type: Number,
      default: 0
    },
    loanDeductions: [{
      loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true
      },
      installmentNumber: {
        type: Number,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    }],
    advances: {
      type: Number,
      default: 0
    },
    otherDeductions: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      required: true
    }
  },
  contributions: {
    epfEmployer: {
      type: Number,
      required: true
    },
    etf: {
      type: Number,
      required: true
    },
    totalContributions: {
      type: Number,
      required: true
    }
  },
  netSalary: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date
  },
  bankTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankTransaction'
  },
  remarks: {
    type: String,
    default: ''
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
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

// Create compound index for employee + pay period (month+year) to ensure uniqueness
PayrollSchema.index({ employeeId: 1, 'payPeriod.month': 1, 'payPeriod.year': 1 }, { unique: true });

// Create indexes for faster queries
PayrollSchema.index({ paymentStatus: 1 });
PayrollSchema.index({ 'payPeriod.month': 1, 'payPeriod.year': 1 });
PayrollSchema.index({ payrollId: 1 });

// Pre-save hook to update the updatedAt field
PayrollSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payroll', PayrollSchema);