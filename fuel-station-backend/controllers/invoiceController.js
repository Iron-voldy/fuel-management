const { validationResult } = require('express-validator');
const moment = require('moment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Sales = require('../models/Sales');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');

/**
 * @desc    Get all invoices with optional filtering
 * @route   GET /api/invoices
 * @access  Private
 */
exports.getAllInvoices = async (req, res) => {
  try {
    const { 
      customerId, 
      paymentStatus, 
      startDate, 
      endDate,
      dueBefore,
      dueAfter,
      minAmount,
      maxAmount,
      limit = 50,
      skip = 0,
      sort = '-issueDate'
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (customerId) {
      filterObj.customerId = customerId;
    }
    
    if (paymentStatus) {
      filterObj.paymentStatus = paymentStatus;
    }
    
    // Issue date range filter
    if (startDate || endDate) {
      filterObj.issueDate = {};
      if (startDate) filterObj.issueDate.$gte = new Date(startDate);
      if (endDate) filterObj.issueDate.$lte = new Date(endDate);
    }
    
    // Due date range filter
    if (dueBefore || dueAfter) {
      filterObj.dueDate = {};
      if (dueAfter) filterObj.dueDate.$gte = new Date(dueAfter);
      if (dueBefore) filterObj.dueDate.$lte = new Date(dueBefore);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filterObj.totalAmount = {};
      if (minAmount) filterObj.totalAmount.$gte = Number(minAmount);
      if (maxAmount) filterObj.totalAmount.$lte = Number(maxAmount);
    }

    // Get total count for pagination
    const total = await Invoice.countDocuments(filterObj);

    // Get invoices with pagination and sorting
    const invoices = await Invoice.find(filterObj)
      .populate('customerId', 'customerId name')
      .sort(sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: invoices.length,
      data: invoices
    });
  } catch (err) {
    console.error('Error fetching invoices:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get a single invoice
 * @route   GET /api/invoices/:id
 * @access  Private
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'customerId name contactInfo businessInfo')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    console.error('Error fetching invoice:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Create a new invoice
 * @route   POST /api/invoices
 * @access  Private
 */
exports.createInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { 
      customerId, 
      stationId, 
      items, 
      taxRate, 
      discountType, 
      discountValue,
      notes,
      issueDate,
      billingPeriod
    } = req.body;

    // Check if customer exists and has credit account
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Calculate invoice due date based on customer payment terms
    const issueDateObj = issueDate ? new Date(issueDate) : new Date();
    const dueDateObj = new Date(issueDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + (customer.creditAccount?.paymentTerms || 30));

    // Calculate subtotal
    const calculatedItems = items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice
    }));

    const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);

    // Calculate tax amount
    const taxAmount = (subtotal * (taxRate || 0)) / 100;

    // Calculate discount amount
    let discountAmount = 0;
    if (discountType === 'Percentage') {
      discountAmount = (subtotal * (discountValue || 0)) / 100;
    } else if (discountType === 'Fixed') {
      discountAmount = discountValue || 0;
    }

    // Calculate total amount
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Generate a unique invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Create new invoice
    const newInvoice = new Invoice({
      invoiceNumber,
      customerId,
      stationId,
      issueDate: issueDateObj,
      dueDate: dueDateObj,
      items: calculatedItems,
      subtotal,
      taxRate: taxRate || 0,
      taxAmount,
      discountType: discountType || 'None',
      discountValue: discountValue || 0,
      discountAmount,
      totalAmount,
      amountDue: totalAmount,
      notes,
      billingPeriod,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    // Save the invoice
    const invoice = await newInvoice.save();

    // If customer has credit account, update credit balance
    if (customer.creditAccount && customer.creditAccount.isEnabled) {
      await customer.increaseCreditBalance(totalAmount, req.user.id);
    }

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    console.error('Error creating invoice:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update an invoice
 * @route   PUT /api/invoices/:id
 * @access  Private
 */
exports.updateInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Don't allow updating if invoice is paid
    if (invoice.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a paid invoice'
      });
    }

    // Get the old total amount for credit balance adjustment
    const oldTotalAmount = invoice.totalAmount;

    // Update fields that are allowed to be updated
    const allowedFields = ['notes', 'dueDate', 'taxRate', 'discountType', 'discountValue'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    // If items are updated
    if (req.body.items) {
      // Calculate new item amounts
      const calculatedItems = req.body.items.map(item => ({
        ...item,
        amount: item.quantity * item.unitPrice
      }));

      invoice.items = calculatedItems;
    }

    // Add audit info
    invoice.updatedBy = req.user.id;
    invoice.updatedAt = Date.now();

    // Save the updated invoice (pre-save hooks will recalculate amounts)
    await invoice.save();

    // If customer has credit account, adjust credit balance
    if (invoice.customerId) {
      const customer = await Customer.findById(invoice.customerId);
      
      if (customer && customer.creditAccount && customer.creditAccount.isEnabled) {
        // Adjust credit balance if total amount has changed
        if (invoice.totalAmount !== oldTotalAmount) {
          // Decrease by old amount and increase by new amount
          await customer.decreaseCreditBalance(oldTotalAmount, req.user.id);
          await customer.increaseCreditBalance(invoice.totalAmount, req.user.id);
        }
      }
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    console.error('Error updating invoice:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Cancel an invoice
 * @route   PUT /api/invoices/:id/cancel
 * @access  Private (Admin/Manager)
 */
exports.cancelInvoice = async (req, res) => {
  try {
    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel invoices'
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Don't allow cancelling if invoice is paid
    if (invoice.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a paid invoice'
      });
    }

    // Update invoice status
    invoice.paymentStatus = 'Cancelled';
    invoice.updatedBy = req.user.id;
    invoice.updatedAt = Date.now();
    invoice.notes = `${invoice.notes ? invoice.notes + '\n' : ''}Cancelled by ${req.user.name} on ${new Date().toISOString()}`;

    await invoice.save();

    // If customer has credit account, update credit balance
    const customer = await Customer.findById(invoice.customerId);
    
    if (customer && customer.creditAccount && customer.creditAccount.isEnabled) {
      await customer.decreaseCreditBalance(invoice.amountDue, req.user.id);
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    console.error('Error cancelling invoice:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Record payment for an invoice
 * @route   POST /api/invoices/:id/payment
 * @access  Private
 */
exports.recordPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { amount, method, reference, date, notes, accountId } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Check if invoice is cancelled
    if (invoice.paymentStatus === 'Cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot process payment for a cancelled invoice'
      });
    }

    // Check if amount is valid
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0'
      });
    }

    // Check if amount exceeds amount due
    if (amount > invoice.amountDue) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount exceeds amount due',
        amountDue: invoice.amountDue
      });
    }

    // Create payment data
    const paymentData = {
      date: date || new Date(),
      amount,
      method,
      reference,
      notes,
      receivedBy: req.user.id
    };

    // If payment is by bank transfer/deposit, create bank transaction
    if ((method === 'Bank Transfer' || method === 'Bank Deposit') && accountId) {
      // Find the bank account
      const account = await BankAccount.findById(accountId);
      
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Bank account not found'
        });
      }
      
      // Create a bank transaction
      const transactionId = `INV-PMT-${invoice.invoiceNumber}-${Date.now()}`;
      
      const bankTransaction = new BankTransaction({
        transactionId,
        user: req.user.id,
        account: accountId,
        amount,
        type: 'deposit',
        date: date || new Date(),
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        category: 'Sales',
        reference: reference || invoice.invoiceNumber,
        notes: notes || `Payment from ${invoice.customerId.name || 'customer'}`
      });
      
      // Update account balance
      account.currentBalance += amount;
      
      // Save bank transaction and update account
      await bankTransaction.save();
      await account.save();
      
      // Add transaction ID to payment data
      paymentData.transactionId = bankTransaction._id;
    }

    // Add payment to invoice
    invoice.payments.push(paymentData);
    
    // Update amounts (pre-save hook will recalculate payment status)
    invoice.amountPaid += amount;
    invoice.amountDue -= amount;
    
    // Update audit info
    invoice.updatedBy = req.user.id;
    invoice.updatedAt = Date.now();

    await invoice.save();

    // If customer has credit account, update credit balance
    const customer = await Customer.findById(invoice.customerId);
    
    if (customer && customer.creditAccount && customer.creditAccount.isEnabled) {
      await customer.decreaseCreditBalance(amount, req.user.id);
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    console.error('Error recording payment:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Generate invoices from sales
 * @route   POST /api/invoices/generate-from-sales
 * @access  Private (Admin/Manager)
 */
exports.generateFromSales = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to generate invoices'
      });
    }

    const { 
      customerId, 
      startDate, 
      endDate, 
      stationId 
    } = req.body;

    // Validate required fields
    if (!customerId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID, start date, and end date are required'
      });
    }

    // Check if customer exists and has credit account
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if customer has credit account
    if (!customer.creditAccount || !customer.creditAccount.isEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Customer does not have an active credit account'
      });
    }

    // Parse dates
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Build query for sales
    const salesQuery = {
      customerId,
      date: { $gte: startDateObj, $lte: endDateObj },
      paymentMethod: 'Credit' // Only include credit sales
    };
    
    if (stationId) {
      salesQuery.stationId = stationId;
    }

    // Get uninvoiced sales
    const sales = await Sales.find(salesQuery).sort({ date: 1 });

    // Check if there are sales to invoice
    if (sales.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No uninvoiced credit sales found for this customer in the specified period'
      });
    }

    // Group sales by fuel type for invoice items
    const salesByFuelType = {};
    
    sales.forEach(sale => {
      if (!salesByFuelType[sale.fuelType]) {
        salesByFuelType[sale.fuelType] = {
          description: `Fuel Sales - ${sale.fuelType}`,
          fuelType: sale.fuelType,
          quantity: 0,
          unitPrice: sale.unitPrice, // Use the latest unit price
          amount: 0,
          saleIds: []
        };
      }
      
      salesByFuelType[sale.fuelType].quantity += sale.quantity;
      salesByFuelType[sale.fuelType].amount += sale.totalAmount;
      salesByFuelType[sale.fuelType].saleIds.push(sale._id);
    });

    // Create invoice items
    const invoiceItems = Object.values(salesByFuelType).map(item => ({
      description: item.description,
      fuelType: item.fuelType,
      quantity: item.quantity,
      unitPrice: item.amount / item.quantity, // Calculate average unit price
      amount: item.amount,
      saleIds: item.saleIds
    }));

    // Calculate subtotal
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    // Generate a unique invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Calculate invoice due date based on customer payment terms
    const issueDateObj = new Date();
    const dueDateObj = new Date(issueDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + (customer.creditAccount.paymentTerms || 30));

    // Create new invoice
    const newInvoice = new Invoice({
      invoiceNumber,
      customerId,
      stationId: stationId || sales[0].stationId,
      issueDate: issueDateObj,
      dueDate: dueDateObj,
      items: invoiceItems,
      subtotal,
      totalAmount: subtotal, // No tax or discount for now
      amountDue: subtotal,
      billingPeriod: {
        startDate: startDateObj,
        endDate: endDateObj
      },
      notes: `Automatically generated invoice for credit sales from ${moment(startDateObj).format('YYYY-MM-DD')} to ${moment(endDateObj).format('YYYY-MM-DD')}`,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    // Save the invoice
    const invoice = await newInvoice.save();

    // Update sales with invoice reference (optional)
    await Sales.updateMany(
      { _id: { $in: sales.map(sale => sale._id) } },
      { $set: { invoiceId: invoice._id } }
    );

    // If customer has credit account, update credit balance
    if (customer.creditAccount.isEnabled) {
      await customer.increaseCreditBalance(subtotal, req.user.id);
    }

    res.status(201).json({
      success: true,
      message: `Successfully generated invoice for ${sales.length} sales transactions`,
      data: invoice
    });
  } catch (err) {
    console.error('Error generating invoice from sales:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get aging report
 * @route   GET /api/invoices/aging-report
 * @access  Private
 */
exports.getAgingReport = async (req, res) => {
  try {
    const { customerId } = req.query;

    // Build filter for unpaid/partial invoices
    const filterObj = {
      paymentStatus: { $in: ['Unpaid', 'Partial', 'Overdue'] }
    };
    
    if (customerId) {
      filterObj.customerId = customerId;
    }

    // Get all unpaid invoices
    const invoices = await Invoice.find(filterObj)
      .populate('customerId', 'name customerId')
      .sort({ dueDate: 1 });

    // Calculate current date for aging
    const currentDate = new Date();

    // Group invoices by aging buckets
    const agingBuckets = {
      current: [],  // Not yet due
      '1-30': [],   // 1-30 days overdue
      '31-60': [],  // 31-60 days overdue
      '61-90': [],  // 61-90 days overdue
      '90+': []     // Over 90 days overdue
    };

    // Process each invoice
    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysPastDue <= 0) {
        agingBuckets.current.push(invoice);
      } else if (daysPastDue <= 30) {
        agingBuckets['1-30'].push(invoice);
      } else if (daysPastDue <= 60) {
        agingBuckets['31-60'].push(invoice);
      } else if (daysPastDue <= 90) {
        agingBuckets['61-90'].push(invoice);
      } else {
        agingBuckets['90+'].push(invoice);
      }
    });

    // Calculate totals for each bucket
    const calculateBucketTotals = (bucket) => {
      return {
        count: bucket.length,
        totalAmount: bucket.reduce((sum, invoice) => sum + invoice.amountDue, 0)
      };
    };

    // Calculate totals by customer
    const customerTotals = {};
    
    invoices.forEach(invoice => {
      const customerId = invoice.customerId._id.toString();
      const customerName = invoice.customerId.name;
      
      if (!customerTotals[customerId]) {
        customerTotals[customerId] = {
          customerId: invoice.customerId.customerId,
          name: customerName,
          invoiceCount: 0,
          totalAmountDue: 0,
          current: 0,
          '1-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0
        };
      }
      
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      
      customerTotals[customerId].invoiceCount += 1;
      customerTotals[customerId].totalAmountDue += invoice.amountDue;
      
      if (daysPastDue <= 0) {
        customerTotals[customerId].current += invoice.amountDue;
      } else if (daysPastDue <= 30) {
        customerTotals[customerId]['1-30'] += invoice.amountDue;
      } else if (daysPastDue <= 60) {
        customerTotals[customerId]['31-60'] += invoice.amountDue;
      } else if (daysPastDue <= 90) {
        customerTotals[customerId]['61-90'] += invoice.amountDue;
      } else {
        customerTotals[customerId]['90+'] += invoice.amountDue;
      }
    });

    // Format the aging report
    const agingReport = {
      reportDate: currentDate,
      summary: {
        totalInvoices: invoices.length,
        totalAmountDue: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
        buckets: {
          current: calculateBucketTotals(agingBuckets.current),
          '1-30': calculateBucketTotals(agingBuckets['1-30']),
          '31-60': calculateBucketTotals(agingBuckets['31-60']),
          '61-90': calculateBucketTotals(agingBuckets['61-90']),
          '90+': calculateBucketTotals(agingBuckets['90+'])
        }
      },
      customerTotals: Object.values(customerTotals),
      details: {
        current: agingBuckets.current.map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId.name,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue
        })),
        '1-30': agingBuckets['1-30'].map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId.name,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue
        })),
        '31-60': agingBuckets['31-60'].map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId.name,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue
        })),
        '61-90': agingBuckets['61-90'].map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId.name,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue
        })),
        '90+': agingBuckets['90+'].map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId.name,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue
        }))
      }
    };

    res.json({
      success: true,
      data: agingReport
    });
  } catch (err) {
    console.error('Error generating aging report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};