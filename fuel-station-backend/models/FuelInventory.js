const mongoose = require('mongoose');

const FuelInventorySchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['Petrol 92', 'Petrol 95', 'Auto Diesel', 'Super Diesel', 'Kerosene']
  },
  tankId: {
    type: String,
    required: true
  },
  tankCapacity: {
    type: Number,
    required: true,
    min: [0, 'Tank capacity must be greater than 0']
  },
  currentVolume: {
    type: Number,
    required: true,
    min: [0, 'Current volume cannot be negative']
  },
  costPrice: {
    type: Number,
    required: true,
    min: [0, 'Cost price must be greater than 0']
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: [0, 'Selling price must be greater than 0']
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: [0, 'Reorder level must be greater than 0']
  },
  lastStockUpdate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Normal', 'Low', 'Critical', 'Replenishing'],
    default: 'Normal'
  },
  stockHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['Purchase', 'Sale', 'Adjustment', 'Loss'],
      required: true
    },
    volume: {
      type: Number,
      required: true
    },
    costPrice: {
      type: Number
    },
    reference: {
      type: String
    },
    notes: {
      type: String
    }
  }],
  priceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    oldPrice: {
      type: Number
    },
    newPrice: {
      type: Number,
      required: true
    },
    reason: {
      type: String
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for efficient queries
FuelInventorySchema.index({ stationId: 1, fuelType: 1 });
FuelInventorySchema.index({ stationId: 1, tankId: 1 }, { unique: true });
FuelInventorySchema.index({ status: 1 });

// Middleware to update status based on current volume
FuelInventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update status based on current volume vs reorder level
  if (this.currentVolume <= 0) {
    this.status = 'Critical';
  } else if (this.currentVolume < this.reorderLevel) {
    this.status = 'Low';
  } else {
    this.status = 'Normal';
  }
  
  next();
});

// Virtual for inventory value
FuelInventorySchema.virtual('inventoryValue').get(function() {
  return this.currentVolume * this.costPrice;
});

// Method to add stock
FuelInventorySchema.methods.addStock = function(volume, costPrice, reference, notes) {
  if (volume <= 0) {
    throw new Error('Volume must be greater than 0');
  }
  
  // Add stock history entry
  this.stockHistory.push({
    date: new Date(),
    type: 'Purchase',
    volume,
    costPrice,
    reference,
    notes
  });
  
  // Update current volume
  this.currentVolume += volume;
  
  // Update cost price (weighted average)
  const oldValue = (this.currentVolume - volume) * this.costPrice;
  const newValue = volume * costPrice;
  this.costPrice = (oldValue + newValue) / this.currentVolume;
  
  // Update last stock update
  this.lastStockUpdate = new Date();
  
  return this.save();
};

// Method to reduce stock
FuelInventorySchema.methods.reduceStock = function(volume, reference, notes) {
  if (volume <= 0) {
    throw new Error('Volume must be greater than 0');
  }
  
  if (volume > this.currentVolume) {
    throw new Error('Insufficient stock');
  }
  
  // Add stock history entry
  this.stockHistory.push({
    date: new Date(),
    type: 'Sale',
    volume: -volume,
    reference,
    notes
  });
  
  // Update current volume
  this.currentVolume -= volume;
  
  // Update last stock update
  this.lastStockUpdate = new Date();
  
  return this.save();
};

// Method to update price
FuelInventorySchema.methods.updatePrice = function(newPrice, reason) {
  if (newPrice <= 0) {
    throw new Error('Price must be greater than 0');
  }
  
  // Add price history entry
  this.priceHistory.push({
    date: new Date(),
    oldPrice: this.sellingPrice,
    newPrice,
    reason
  });
  
  // Update selling price
  this.sellingPrice = newPrice;
  
  return this.save();
};

module.exports = mongoose.model('FuelInventory', FuelInventorySchema);