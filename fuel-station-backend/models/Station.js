const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    },
    postalCode: {
      type: String
    },
    coordinates: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      }
    }
  },
  contact: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    alternatePhone: {
      type: String
    }
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  operatingHours: {
    weekdays: {
      open: {
        type: String,
        default: '06:00'
      },
      close: {
        type: String,
        default: '22:00'
      }
    },
    weekends: {
      open: {
        type: String,
        default: '07:00'
      },
      close: {
        type: String,
        default: '21:00'
      }
    },
    holidays: {
      open: {
        type: String,
        default: '08:00'
      },
      close: {
        type: String,
        default: '20:00'
      }
    }
  },
  facilities: {
    hasConvenienceStore: {
      type: Boolean,
      default: false
    },
    hasCarWash: {
      type: Boolean,
      default: false
    },
    hasATM: {
      type: Boolean,
      default: false
    },
    hasRestrooms: {
      type: Boolean,
      default: true
    },
    hasServiceBay: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Under Maintenance', 'Closed'],
    default: 'Active'
  },
  fuelTypes: [{
    type: String,
    enum: ['Petrol 92', 'Petrol 95', 'Auto Diesel', 'Super Diesel', 'Kerosene']
  }],
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

// Pre-save hook to update timestamps
StationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to generate unique station ID
StationSchema.statics.generateStationId = function() {
  const prefix = 'ST';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
};

module.exports = mongoose.model('Station', StationSchema);