const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Individual', 'Corporate', 'Government'],
    default: 'Individual'
  },
  contactInfo: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    alternatePhone: {
      type: String
    }
  },
  businessInfo: {
    businessRegistrationNumber: {
      type: String
    },
    taxId: {
      type: String
    },
    industry: {
      type: String
    },
    yearEstablished: {
      type: Number
    }
  },
  creditAccount: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    creditLimit: {
      type: Number,
      default: 0
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    availableCredit: {
      type: Number,
      default: 0
    },
    paymentTerms: {
      type: Number, // Days
      default: 30
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Closed'],
      default: 'Active'
    }
  },
  authorizedVehicles: [{
    vehicleNumber: {
      type: String,
      required: true
    },
    vehicleType: {
      type: String
    },
    driverName: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  authorizedPersonnel: [{
    name: {
      type: String,
      required: true
    },
    designation: {
      type: String
    },
    contactNumber: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  notes: {
    type: String
  },
  documents: [{
    type: {
      type: String,
      required: true,
      enum: ['Registration', 'Contract', 'ID', 'Other']
    },
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Blacklisted'],
    default: 'Active'
  },
  createdBy: {
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

// Pre-save hook to update timestamps and available credit
CustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate available credit
  if (this.creditAccount && this.creditAccount.isEnabled) {
    this.creditAccount.availableCredit = this.creditAccount.creditLimit - this.creditAccount.currentBalance;
  }
  
  next();
});

// Index for efficient queries
CustomerSchema.index({ customerId: 1 });
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ 'contactInfo.email': 1 });
CustomerSchema.index({ 'contactInfo.phone': 1 });
CustomerSchema.index({ 'creditAccount.status': 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ 'authorizedVehicles.vehicleNumber': 1 });

// Method to check credit limit
CustomerSchema.methods.hasSufficientCredit = function(amount) {
  if (!this.creditAccount.isEnabled || this.creditAccount.status !== 'Active') {
    return false;
  }
  
  return this.creditAccount.availableCredit >= amount;
};

// Method to increase credit balance (after a credit purchase)
CustomerSchema.methods.increaseCreditBalance = function(amount, userId) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  this.creditAccount.currentBalance += amount;
  this.creditAccount.availableCredit = this.creditAccount.creditLimit - this.creditAccount.currentBalance;
  this.updatedBy = userId;
  
  return this.save();
};

// Method to decrease credit balance (after payment)
CustomerSchema.methods.decreaseCreditBalance = function(amount, userId) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  if (amount > this.creditAccount.currentBalance) {
    throw new Error('Payment amount exceeds current balance');
  }
  
  this.creditAccount.currentBalance -= amount;
  this.creditAccount.availableCredit = this.creditAccount.creditLimit - this.creditAccount.currentBalance;
  this.updatedBy = userId;
  
  return this.save();
};

// Generate customer ID
CustomerSchema.statics.generateCustomerId = function() {
  const prefix = 'CUST';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
};

module.exports = mongoose.model('Customer', CustomerSchema);