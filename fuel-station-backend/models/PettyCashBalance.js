const mongoose = require('mongoose');

const PettyCashBalanceSchema = new mongoose.Schema({
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true,
    unique: true
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0
  },
  maxLimit: {
    type: Number,
    required: true,
    default: 10000 // Default maximum petty cash limit (LKR)
  },
  minLimit: {
    type: Number,
    required: true,
    default: 2000 // Default minimum balance threshold for replenishment
  },
  lastReplenishmentDate: {
    type: Date
  },
  lastReplenishmentAmount: {
    type: Number
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
}, {
  timestamps: true
});

// Method to check if balance is below minimum threshold
PettyCashBalanceSchema.methods.isBelowMinimum = function() {
  return this.currentBalance < this.minLimit;
};

// Method to check if a withdrawal can be made
PettyCashBalanceSchema.methods.canWithdraw = function(amount) {
  return this.currentBalance >= amount;
};

// Method to update balance
PettyCashBalanceSchema.methods.updateBalance = function(amount, isReplenishment, user) {
  if (isReplenishment) {
    // Check if new balance would exceed max limit
    if (this.currentBalance + amount > this.maxLimit) {
      throw new Error(`Replenishment would exceed maximum limit of ${this.maxLimit}`);
    }
    this.currentBalance += amount;
    this.lastReplenishmentDate = new Date();
    this.lastReplenishmentAmount = amount;
  } else {
    // Check if there's enough balance
    if (this.currentBalance < amount) {
      throw new Error('Insufficient petty cash balance');
    }
    this.currentBalance -= amount;
  }
  
  this.updatedBy = user;
  this.updatedAt = Date.now();
  
  return this.save();
};

module.exports = mongoose.model('PettyCashBalance', PettyCashBalanceSchema);