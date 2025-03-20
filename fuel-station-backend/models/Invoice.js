const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  stationId: {
    type: String,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    fuelType: {
      type: String
    },
    quantity: {
      type: Number,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    saleIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sales'
    }]
  }],
  subtotal: {
    type: Number,
    required: true
  },
  taxRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountType: {
    type: String,
    enum: ['Percentage', 'Fixed', 'None'],
    default: 'None'
  },
  discountValue: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Unpaid'
  },
  payments: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      required: true,
      enum: ['Cash', 'Bank Transfer', 'Check', 'Credit Card', 'Debit Card']
    },
    reference: {
      type: String
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankTransaction'
    },
    notes: {
      type: String
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  amountPaid: {
    type: Number,
    default: 0
  },
  amountDue: {
    type: Number,
    default: 0
  },
  billingPeriod: {
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Indexes for efficient queries
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ issueDate: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ paymentStatus: 1 });

// Pre-save hook to update timestamps and calculate amounts
InvoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate amounts
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate tax amount
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  
  // Calculate discount amount
  if (this.discountType === 'Percentage') {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else if (this.discountType === 'Fixed') {
    this.discountAmount = this.discountValue;
  } else {
    this.discountAmount = 0;
  }
  
  // Calculate total amount
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  
  // Calculate amount due
  this.amountPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  this.amountDue = this.totalAmount - this.amountPaid;
  
  // Update payment status
  if (this.amountDue <= 0) {
    this.paymentStatus = 'Paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'Partial';
  } else if (this.dueDate < new Date() && this.amountDue > 0) {
    this.paymentStatus = 'Overdue';
  } else {
    this.paymentStatus = 'Unpaid';
  }
  
  next();
});

// Method to add payment
InvoiceSchema.methods.addPayment = function(paymentData, userId) {
  if (paymentData.amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }
  
  if (paymentData.amount > this.amountDue) {
    throw new Error('Payment amount exceeds the amount due');
  }
  
  this.payments.push({
    ...paymentData,
    receivedBy: userId
  });
  
  this.updatedBy = userId;
  
  return this.save();
};

// Generate invoice number
InvoiceSchema.statics.generateInvoiceNumber = function() {
  const prefix = 'INV';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);