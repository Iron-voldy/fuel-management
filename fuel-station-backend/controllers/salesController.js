const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Sales = require('../models/Sales');
const Transaction = require('../models/Transaction');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');
const validators = require('../utils/validators');

// Helper function to generate unique sales ID
const generateSalesId = () => {
  const prefix = 'SL';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${dateStr}${randomNum}`;
};

// @desc    Get all sales with optional filtering
// @route   GET /api/sales
// @access  Private
exports.getAllSales = async (req, res) => {
  try {
    const { 
      stationId, 
      fuelType, 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      paymentMethod,
      customerId,
      employeeId,
      search,
      limit = 50,
      skip = 0,
      sort = '-date' // Default sort by date descending
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    // Only station managers should see their own station data
    if (req.user.role === 'manager' && req.user.stationId) {
      filterObj.stationId = req.user.stationId;
    } else if (stationId) {
      filterObj.stationId = stationId;
    }
    
    if (fuelType) filterObj.fuelType = fuelType;
    if (paymentMethod) filterObj.paymentMethod = paymentMethod;
    if (customerId) filterObj.customerId = customerId;
    if (employeeId) filterObj.employeeId = employeeId;
    
    // Date range filter
    if (startDate || endDate) {
      filterObj.date = {};
      if (startDate) filterObj.date.$gte = new Date(startDate);
      if (endDate) filterObj.date.$lte = new Date(endDate);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filterObj.totalAmount = {};
      if (minAmount) filterObj.totalAmount.$gte = Number(minAmount);
      if (maxAmount) filterObj.totalAmount.$lte = Number(maxAmount);
    }

    // Text search
    if (search) {
      filterObj.$or = [
        { saleId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'notes': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Sales.countDocuments(filterObj);

    // Get sales with pagination and sorting
    const sales = await Sales.find(filterObj)
      .populate('employeeId', 'personalInfo.name')
      .populate('customerId', 'name')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: sales.length,
      data: sales
    });
  } catch (err) {
    console.error('Error fetching sales:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get a single sale
// @route   GET /api/sales/:id
// @access  Private
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('employeeId', 'personalInfo.name position')
      .populate('customerId', 'name contactInfo')
      .populate('transactionId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    // Check authorization for non-admin users
    if (req.user.role === 'manager' && 
        req.user.stationId && 
        sale.stationId.toString() !== req.user.stationId.toString()) {
      return res.status(401).json({
        success: false, 
        error: 'Not authorized to view this sale'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (err) {
    console.error('Error fetching sale:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new sale record (manual entry)
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      stationId,
      fuelType,
      quantity,
      unitPrice,
      paymentMethod,
      customerId,
      vehicleNumber,
      notes
    } = req.body;

    // Validate station
    if (!stationId && req.user.stationId) {
      req.body.stationId = req.user.stationId;
    } else if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID is required'
      });
    }

    // Calculate total amount
    const totalAmount = quantity * unitPrice;

    // Generate a unique sale ID
    const saleId = generateSalesId();

    // Create sale record
    const newSale = new Sales({
      saleId,
      date: req.body.date || new Date(),
      stationId: req.body.stationId,
      fuelType,
      quantity,
      unitPrice,
      totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      customerId: customerId || null,
      employeeId: req.user.employeeId || null,
      vehicleNumber: vehicleNumber || null,
      notes: notes || '',
      manualEntry: true,
      enteredBy: req.user.id
    });

    // If payment method is BankCard or BankTransfer, create bank transaction
    if ((paymentMethod === 'BankCard' || paymentMethod === 'BankTransfer') && req.body.accountId) {
      // Find the bank account
      const account = await BankAccount.findById(req.body.accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Generate transaction ID
      const transactionId = await validators.generateTransactionId();
      
      // Create the bank transaction
      const bankTransaction = new BankTransaction({
        transactionId,
        user: req.user.id,
        account: req.body.accountId,
        amount: totalAmount,
        type: 'deposit',
        date: req.body.date || new Date(),
        description: `Fuel Sale - ${fuelType} - ${quantity} units`,
        category: 'Sales',
        reference: saleId,
        notes: notes || ''
      });
      
      // Update account balance
      account.currentBalance += totalAmount;
      
      // Save transaction and account
      await bankTransaction.save();
      await account.save();
      
      // Link the transaction to the sale
      newSale.bankTransactionId = bankTransaction._id;
    }

    // Create general financial transaction record
    const transaction = new Transaction({
      user: req.user.id,
      transactionId: `TR-${saleId}`,
      date: req.body.date || new Date(),
      stationId: req.body.stationId,
      type: 'sale',
      amount: totalAmount,
      description: `Fuel Sale - ${fuelType} - ${quantity} units`,
      category: 'Sales',
      paymentMethod: paymentMethod || 'Cash',
      relatedDocumentId: saleId,
      createdBy: req.user.id
    });

    await transaction.save();
    newSale.transactionId = transaction._id;

    // Save the sale
    const sale = await newSale.save();

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (err) {
    console.error('Error creating sale:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a sale record from IoT data
// @route   POST /api/sales/iot
// @access  Private (IoT Integration)
exports.createSaleFromIoT = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      stationId,
      fuelType,
      quantity,
      unitPrice,
      sensorId,
      timestamp,
      pumpId
    } = req.body;

    // Validate station and sensor data
    if (!stationId || !sensorId || !pumpId) {
      return res.status(400).json({
        success: false,
        error: 'Station ID, Sensor ID, and Pump ID are required'
      });
    }

    // Calculate total amount
    const totalAmount = quantity * unitPrice;

    // Generate a unique sale ID
    const saleId = generateSalesId();

    // Create sale record
    const newSale = new Sales({
      saleId,
      date: timestamp || new Date(),
      stationId,
      fuelType,
      quantity,
      unitPrice,
      totalAmount,
      paymentMethod: 'Cash', // Default for IoT - assumed cash unless updated later
      sensorData: {
        sensorId,
        pumpId,
        timestamp: timestamp || new Date()
      },
      manualEntry: false
    });

    // Create general financial transaction record
    const transaction = new Transaction({
      transactionId: `TR-${saleId}`,
      date: timestamp || new Date(),
      stationId,
      type: 'sale',
      amount: totalAmount,
      description: `Fuel Sale - ${fuelType} - ${quantity} units (IoT)`,
      category: 'Sales',
      paymentMethod: 'Cash',
      relatedDocumentId: saleId
    });

    await transaction.save();
    newSale.transactionId = transaction._id;

    // Save the sale
    const sale = await newSale.save();

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (err) {
    console.error('Error creating IoT sale:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update a sale record
// @route   PUT /api/sales/:id
// @access  Private
exports.updateSale = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    let sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    // Check authorization
    if (req.user.role === 'manager' && 
        req.user.stationId && 
        sale.stationId.toString() !== req.user.stationId.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this sale'
      });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['paymentMethod', 'customerId', 'vehicleNumber', 'notes'];
    
    // Allow admin to update more fields
    if (req.user.role === 'admin') {
      allowedUpdates.push('fuelType', 'quantity', 'unitPrice', 'date');
    }

    const updateData = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // If quantity or unitPrice is updated, recalculate totalAmount
    if (updateData.quantity || updateData.unitPrice) {
      const quantity = updateData.quantity || sale.quantity;
      const unitPrice = updateData.unitPrice || sale.unitPrice;
      updateData.totalAmount = quantity * unitPrice;
    }

    // Add audit info
    updateData.updatedAt = Date.now();
    updateData.updatedBy = req.user.id;

    // Handle payment method change if bank account is specified
    if (updateData.paymentMethod && 
        (updateData.paymentMethod === 'BankCard' || updateData.paymentMethod === 'BankTransfer') && 
        req.body.accountId && 
        !sale.bankTransactionId) {
      
      // Find the bank account
      const account = await BankAccount.findById(req.body.accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Generate transaction ID
      const transactionId = await validators.generateTransactionId();
      
      // Create the bank transaction
      const bankTransaction = new BankTransaction({
        transactionId,
        user: req.user.id,
        account: req.body.accountId,
        amount: sale.totalAmount,
        type: 'deposit',
        date: sale.date,
        description: `Fuel Sale - ${sale.fuelType} - ${sale.quantity} units`,
        category: 'Sales',
        reference: sale.saleId,
        notes: updateData.notes || sale.notes || ''
      });
      
      // Update account balance
      account.currentBalance += sale.totalAmount;
      
      // Save transaction and account
      await bankTransaction.save();
      await account.save();
      
      // Link the transaction to the sale
      updateData.bankTransactionId = bankTransaction._id;
    }

    // Update the sale
    sale = await Sales.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // If the general transaction exists, update it as well
    if (sale.transactionId) {
      const transactionUpdates = {};
      
      if (updateData.paymentMethod) {
        transactionUpdates.paymentMethod = updateData.paymentMethod;
      }
      
      if (updateData.totalAmount) {
        transactionUpdates.amount = updateData.totalAmount;
        transactionUpdates.description = `Fuel Sale - ${sale.fuelType} - ${sale.quantity} units`;
      }
      
      if (Object.keys(transactionUpdates).length > 0) {
        await Transaction.findByIdAndUpdate(
          sale.transactionId,
          { $set: transactionUpdates }
        );
      }
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (err) {
    console.error('Error updating sale:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete a sale record
// @route   DELETE /api/sales/:id
// @access  Private (Admin only)
exports.deleteSale = async (req, res) => {
  try {
    // Only admin can delete sales
    if (req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete sales'
      });
    }

    const sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    // If there's a linked bank transaction, delete it and update account balance
    if (sale.bankTransactionId) {
      const bankTransaction = await BankTransaction.findById(sale.bankTransactionId);
      
      if (bankTransaction) {
        // Get the account and reverse the transaction
        const account = await BankAccount.findById(bankTransaction.account);
        if (account) {
          account.currentBalance -= sale.totalAmount;
          await account.save();
        }
        
        await BankTransaction.findByIdAndDelete(sale.bankTransactionId);
      }
    }

    // If there's a linked transaction, delete it
    if (sale.transactionId) {
      await Transaction.findByIdAndDelete(sale.transactionId);
    }

    // Delete the sale
    await sale.remove();

    res.json({
      success: true,
      message: 'Sale record deleted'
    });
  } catch (err) {
    console.error('Error deleting sale:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get sales summary statistics
// @route   GET /api/sales/summary
// @access  Private
exports.getSalesSummary = async (req, res) => {
  try {
    const { 
      period = 'month',
      startDate,
      endDate,
      stationId
    } = req.query;

    // Set date range based on period
    const today = new Date();
    let periodStartDate, periodEndDate;

    if (!startDate) {
      switch(period) {
        case 'day':
          periodStartDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          periodStartDate = new Date(today);
          periodStartDate.setDate(periodStartDate.getDate() - periodStartDate.getDay());
          periodStartDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          periodStartDate = new Date(today.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          periodStartDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    } else {
      periodStartDate = new Date(startDate);
    }

    periodEndDate = endDate ? new Date(endDate) : new Date();

    // Build filter object
    const filterObj = {
      date: { $gte: periodStartDate, $lte: periodEndDate }
    };
    
    // Only station managers should see their own station data
    if (req.user.role === 'manager' && req.user.stationId) {
      filterObj.stationId = req.user.stationId;
    } else if (stationId) {
      filterObj.stationId = stationId;
    }

    // Calculate total sales and quantity
    const totalSalesAggregate = await Sales.aggregate([
      { $match: filterObj },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, quantity: { $sum: '$quantity' } } }
    ]);
    
    const totalSales = totalSalesAggregate.length > 0 ? totalSalesAggregate[0].total : 0;
    const totalQuantity = totalSalesAggregate.length > 0 ? totalSalesAggregate[0].quantity : 0;

    // Get sales by fuel type
    const salesByFuelType = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: '$fuelType', 
          amount: { $sum: '$totalAmount' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Get sales by payment method
    const salesByPaymentMethod = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: '$paymentMethod', 
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Get sales trend over time
    let groupFormat;
    switch(period) {
      case 'day':
        groupFormat = { $dateToString: { format: '%H:00', date: '$date' } };
        break;
      case 'week':
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
      case 'quarter':
      case 'year':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    const salesTrend = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: groupFormat,
          amount: { $sum: '$totalAmount' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get top 5 recent sales
    const recentSales = await Sales.find(filterObj)
      .sort({ date: -1 })
      .limit(5)
      .select('saleId date fuelType quantity unitPrice totalAmount paymentMethod');

    // Prepare the response
    res.json({
      success: true,
      data: {
        period: {
          start: periodStartDate,
          end: periodEndDate,
          name: period
        },
        summary: {
          totalSales,
          totalQuantity,
          averageTransactionValue: totalSalesAggregate.length > 0 ? 
            totalSales / totalSalesAggregate[0].count : 0,
          salesByFuelType,
          salesByPaymentMethod,
          salesTrend,
          recentSales
        }
      }
    });
  } catch (err) {
    console.error('Error getting sales summary:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Reconcile IoT data with sales records
// @route   POST /api/sales/reconcile
// @access  Private (Admin/Manager)
exports.reconcileIoTSales = async (req, res) => {
  // Only admins and managers can reconcile sales
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to reconcile sales'
    });
  }

  try {
    const { 
      stationId,
      startDate,
      endDate,
      fuelType
    } = req.body;

    // Validate required fields
    if (!stationId || !startDate || !endDate || !fuelType) {
      return res.status(400).json({
        success: false,
        error: 'Station ID, date range, and fuel type are required'
      });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build filter object
    const filterObj = {
      stationId,
      fuelType,
      date: { $gte: start, $lte: end }
    };

    // Get sales records from database
    const salesRecords = await Sales.find(filterObj);
    
    // Calculate total sales quantity from records
    const recordedSalesQuantity = salesRecords.reduce((sum, sale) => sum + sale.quantity, 0);

    // Get IoT sensor data for the same period
    // This would typically come from your IoT system/database
    // For this example, we'll assume some IoT data retrieval function
    const iotData = req.body.iotData || { 
      initialLevel: 1000, // Example initial fuel level
      finalLevel: 800,    // Example final fuel level
      deliveries: 0       // Example fuel deliveries during the period
    };

    // Calculate actual fuel dispensed according to IoT sensors
    const actualDispensedQuantity = iotData.initialLevel - iotData.finalLevel + iotData.deliveries;

    // Calculate discrepancy
    const discrepancy = actualDispensedQuantity - recordedSalesQuantity;
    const discrepancyPercentage = (discrepancy / actualDispensedQuantity) * 100;

    // Determine if the discrepancy is within acceptable limits
    // Typically 1-2% is considered acceptable due to evaporation, measurement errors, etc.
    const acceptableLimit = 2; // 2%
    const isWithinAcceptableLimit = Math.abs(discrepancyPercentage) <= acceptableLimit;

    // Generate reconciliation report
    const reconciliationReport = {
      stationId,
      fuelType,
      period: {
        startDate: start,
        endDate: end
      },
      salesRecords: {
        count: salesRecords.length,
        totalQuantity: recordedSalesQuantity
      },
      iotSensorData: {
        initialLevel: iotData.initialLevel,
        finalLevel: iotData.finalLevel,
        deliveries: iotData.deliveries,
        dispensedQuantity: actualDispensedQuantity
      },
      discrepancy: {
        amount: discrepancy,
        percentage: discrepancyPercentage,
        isWithinAcceptableLimit
      },
      reconciliationDate: new Date(),
      reconciledBy: req.user.id
    };

    // Save reconciliation report here if you have a model for it

    res.json({
      success: true,
      data: reconciliationReport
    });
  } catch (err) {
    console.error('Error reconciling IoT sales:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate sales report
// @route   GET /api/sales/report
// @access  Private
exports.generateSalesReport = async (req, res) => {
  try {
    const { 
      period = 'month',
      startDate,
      endDate,
      stationId,
      fuelType,
      groupBy = 'day',
      format = 'json'
    } = req.query;

    // Set date range based on period
    const today = new Date();
    let periodStartDate, periodEndDate;

    if (!startDate) {
      switch(period) {
        case 'day':
          periodStartDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          periodStartDate = new Date(today);
          periodStartDate.setDate(periodStartDate.getDate() - periodStartDate.getDay());
          periodStartDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          periodStartDate = new Date(today.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          periodStartDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          periodStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    } else {
      periodStartDate = new Date(startDate);
    }

    periodEndDate = endDate ? new Date(endDate) : new Date();

    // Build filter object
    const filterObj = {
      date: { $gte: periodStartDate, $lte: periodEndDate }
    };
    
    // Only station managers should see their own station data
    if (req.user.role === 'manager' && req.user.stationId) {
      filterObj.stationId = req.user.stationId;
    } else if (stationId) {
      filterObj.stationId = stationId;
    }

    if (fuelType) {
      filterObj.fuelType = fuelType;
    }

    // Determine grouping format
    let groupFormat;
    switch(groupBy) {
      case 'hour':
        groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$date' } };
        break;
      case 'day':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
      case 'week':
        // For week grouping, we'll use MongoDB's $week operator
        groupFormat = { 
          year: { $year: '$date' },
          week: { $week: '$date' }
        };
        break;
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    // Get sales data grouped by specified interval
    let salesData;
    
    if (groupBy === 'week') {
      salesData = await Sales.aggregate([
        { $match: filterObj },
        { $group: { 
            _id: {
              year: { $year: '$date' },
              week: { $week: '$date' }
            },
            amount: { $sum: '$totalAmount' },
            quantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]);
      
      // Format week data with ISO week numbers
      salesData = salesData.map(item => ({
        period: `${item._id.year}-W${item._id.week.toString().padStart(2, '0')}`,
        amount: item.amount,
        quantity: item.quantity,
        count: item.count
      }));
    } else {
      salesData = await Sales.aggregate([
        { $match: filterObj },
        { $group: { 
            _id: groupFormat,
            amount: { $sum: '$totalAmount' },
            quantity: { $sum: '$quantity' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      // Format data for consistent output
      salesData = salesData.map(item => ({
        period: item._id,
        amount: item.amount,
        quantity: item.quantity,
        count: item.count
      }));
    }

    // Get summary statistics
    const salesSummary = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: null, 
          totalSales: { $sum: '$totalAmount' },
          totalQuantity: { $sum: '$quantity' },
          count: { $sum: 1 },
          minSale: { $min: '$totalAmount' },
          maxSale: { $max: '$totalAmount' },
          avgSale: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get breakdown by fuel type
    const salesByFuelType = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: '$fuelType', 
          amount: { $sum: '$totalAmount' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Get breakdown by payment method
    const salesByPaymentMethod = await Sales.aggregate([
      { $match: filterObj },
      { $group: { 
          _id: '$paymentMethod', 
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Format report data
    const reportData = {
      reportType: 'Sales Report',
      period: {
        startDate: periodStartDate,
        endDate: periodEndDate,
        name: period
      },
      groupedBy: groupBy,
      summary: salesSummary.length > 0 ? {
        totalSales: salesSummary[0].totalSales,
        totalQuantity: salesSummary[0].totalQuantity,
        count: salesSummary[0].count,
        minSale: salesSummary[0].minSale,
        maxSale: salesSummary[0].maxSale,
        avgSale: salesSummary[0].avgSale
      } : {
        totalSales: 0,
        totalQuantity: 0,
        count: 0,
        minSale: 0,
        maxSale: 0,
        avgSale: 0
      },
      salesByFuelType,
      salesByPaymentMethod,
      data: salesData,
      generatedAt: new Date(),
      generatedBy: req.user.id
    };

    // Return report in requested format
    switch(format) {
      case 'csv':
        // Generate CSV format
        let csvContent = 'Period,Sales Amount,Quantity,Transaction Count\n';
        salesData.forEach(item => {
          csvContent += `${item.period},${item.amount},${item.quantity},${item.count}\n`;
        });
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`sales_report_${periodStartDate.toISOString().slice(0, 10)}_to_${periodEndDate.toISOString().slice(0, 10)}.csv`);
        return res.send(csvContent);

      case 'json':
      default:
        return res.json({
          success: true,
          data: reportData
        });
    }
  } catch (err) {
    console.error('Error generating sales report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};