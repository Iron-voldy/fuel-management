const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  personalInfo: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    contact: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    joinDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  position: {
    type: String,
    required: true
  },
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  salary: {
    basic: {
      type: Number,
      required: true
    },
    allowances: [
      {
        type: {
          type: String,
          required: true
        },
        amount: {
          type: Number,
          required: true
        }
      }
    ],
    totalGross: {
      type: Number,
      required: true
    }
  },
  bankDetails: {
    bankName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    branchCode: {
      type: String,
      required: true
    }
  },
  userId: {
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

module.exports = mongoose.model('Employee', EmployeeSchema);