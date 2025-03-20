const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
  saleId: {
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['Petrol 92', 'Petrol 95', 'Auto Diesel', 'Super Diesel', 'Kerosene']
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be greater than 0']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0.01, 'Unit price must be greater than 0']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0.01, 'Total amount must be greater than 0']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'BankCard', 'BankTransfer', 'Credit', 'Other'],
    default: 'Cash'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  vehicleNumber: {
    type: String,
    default: null
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  bankTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankTransaction',
    default: null
  },
  sensorData: {
    sensorId: {
      type: String,
      default: null
    },
    pumpId: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    }
  },
  manualEntry: {
    type: Boolean,
    default: true
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

// Indexes for faster queries (removed duplicate saleId index)
SalesSchema.index({ stationId: 1, date: -1 });
SalesSchema.index({ fuelType: 1 });
SalesSchema.index({ paymentMethod: 1 });
SalesSchema.index({ customerId: 1 });
SalesSchema.index({ employeeId: 1 });

// Pre-save hook to update the updatedAt field
SalesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted total amount
SalesSchema.virtual('formattedTotal').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR'
  }).format(this.totalAmount);
});

// Method to calculate profit (would need cost data)
SalesSchema.methods.calculateProfit = function(costPerUnit) {
  if (!costPerUnit) return null;
  const cost = this.quantity * costPerUnit;
  return this.totalAmount - cost;
};

module.exports = mongoose.model('Sales', SalesSchema);