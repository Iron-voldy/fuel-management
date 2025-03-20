const { validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Sales = require('../models/Sales');

/**
 * @desc    Get all customers with optional filtering
 * @route   GET /api/customers
 * @access  Private
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      status, 
      hasCreditAccount, 
      city, 
      limit = 50,
      skip = 0,
      sort = 'name'
    } = req.query;

    // Build filter object
    const filterObj = {};
    
    if (name) {
      filterObj.name = { $regex: name, $options: 'i' };
    }
    
    if (type) {
      filterObj.type = type;
    }
    
    if (status) {
      filterObj.status = status;
    }
    
    if (city) {
      filterObj['contactInfo.city'] = { $regex: city, $options: 'i' };
    }
    
    if (hasCreditAccount === 'true') {
      filterObj['creditAccount.isEnabled'] = true;
    } else if (hasCreditAccount === 'false') {
      filterObj['creditAccount.isEnabled'] = false;
    }

    // Get total count for pagination
    const total = await Customer.countDocuments(filterObj);

    // Get customers with pagination and sorting
    const customers = await Customer.find(filterObj)
      .sort(sort.startsWith('-') ? sort : sort)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      count: customers.length,
      data: customers
    });
  } catch (err) {
    console.error('Error fetching customers:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get a single customer
 * @route   GET /api/customers/:id
 * @access  Private
 */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error fetching customer:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Create a new customer
 * @route   POST /api/customers
 * @access  Private
 */
exports.createCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Generate a unique customer ID
    const customerId = await Customer.generateCustomerId();
    
    // Create new customer
    const newCustomer = new Customer({
      ...req.body,
      customerId,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    const customer = await newCustomer.save();

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error creating customer:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update a customer
 * @route   PUT /api/customers/:id
 * @access  Private
 */
exports.updateCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    let customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Update fields
    const fieldsToUpdate = [
      'name', 'type', 'contactInfo', 'businessInfo', 'authorizedVehicles', 
      'authorizedPersonnel', 'notes', 'status'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });
    
    // Add audit info
    customer.updatedBy = req.user.id;
    customer.updatedAt = Date.now();

    await customer.save();

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error updating customer:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Delete a customer
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin)
 */
exports.deleteCustomer = async (req, res) => {
  try {
    // Only admin can delete customers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to delete customers' 
      });
    }

    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if customer has any invoices
    const invoiceCount = await Invoice.countDocuments({ customerId: req.params.id });
    
    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete customer with ${invoiceCount} invoices. Please deactivate instead.`
      });
    }
    
    // Check if customer has any sales
    const salesCount = await Sales.countDocuments({ customerId: req.params.id });
    
    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete customer with ${salesCount} sales records. Please deactivate instead.`
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error deleting customer:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Set up credit account for a customer
 * @route   POST /api/customers/:id/credit-account
 * @access  Private (Admin/Manager)
 */
exports.setupCreditAccount = async (req, res) => {
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
        error: 'Not authorized to set up credit accounts'
      });
    }

    const { creditLimit, paymentTerms } = req.body;

    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Update credit account settings
    customer.creditAccount = {
      ...customer.creditAccount,
      isEnabled: true,
      creditLimit,
      paymentTerms: paymentTerms || 30,
      availableCredit: creditLimit,
      approvedBy: req.user.id,
      approvalDate: new Date(),
      status: 'Active'
    };
    
    customer.updatedBy = req.user.id;
    customer.updatedAt = Date.now();

    await customer.save();

    res.json({
      success: true,
      message: `Credit account enabled with limit of ${creditLimit}`,
      data: customer
    });
  } catch (err) {
    console.error('Error setting up credit account:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Update credit account settings
 * @route   PUT /api/customers/:id/credit-account
 * @access  Private (Admin/Manager)
 */
exports.updateCreditAccount = async (req, res) => {
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
        error: 'Not authorized to update credit accounts'
      });
    }

    const { creditLimit, paymentTerms, status } = req.body;

    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if credit account is enabled
    if (!customer.creditAccount.isEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Credit account is not enabled for this customer'
      });
    }

    // Update credit account settings
    if (creditLimit !== undefined) {
      customer.creditAccount.creditLimit = creditLimit;
      customer.creditAccount.availableCredit = creditLimit - customer.creditAccount.currentBalance;
    }
    
    if (paymentTerms !== undefined) {
      customer.creditAccount.paymentTerms = paymentTerms;
    }
    
    if (status !== undefined) {
      customer.creditAccount.status = status;
    }
    
    customer.updatedBy = req.user.id;
    customer.updatedAt = Date.now();

    await customer.save();

    res.json({
      success: true,
      message: 'Credit account updated successfully',
      data: customer
    });
  } catch (err) {
    console.error('Error updating credit account:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get customer credit usage report
 * @route   GET /api/customers/:id/credit-report
 * @access  Private
 */
exports.getCreditReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Set default date range (last 3 months) if not provided
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);
    
    if (!startDate) {
      startDateObj.setMonth(startDateObj.getMonth() - 3);
    }

    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if credit account is enabled
    if (!customer.creditAccount.isEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Credit account is not enabled for this customer'
      });
    }

    // Get invoices for the customer within date range
    const invoices = await Invoice.find({
      customerId: req.params.id,
      issueDate: { $gte: startDateObj, $lte: endDateObj }
    }).sort({ issueDate: 1 });

    // Get sales for the customer within date range
    const sales = await Sales.find({
      customerId: req.params.id,
      date: { $gte: startDateObj, $lte: endDateObj }
    }).sort({ date: 1 });

    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    // Group sales by fuel type
    const salesByFuelType = {};
    
    sales.forEach(sale => {
      if (!salesByFuelType[sale.fuelType]) {
        salesByFuelType[sale.fuelType] = {
          quantity: 0,
          amount: 0,
          count: 0
        };
      }
      
      salesByFuelType[sale.fuelType].quantity += sale.quantity;
      salesByFuelType[sale.fuelType].amount += sale.totalAmount;
      salesByFuelType[sale.fuelType].count += 1;
    });

    // Format credit usage report
    const creditReport = {
      period: {
        startDate: startDateObj,
        endDate: endDateObj
      },
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        type: customer.type
      },
      creditAccount: {
        creditLimit: customer.creditAccount.creditLimit,
        currentBalance: customer.creditAccount.currentBalance,
        availableCredit: customer.creditAccount.availableCredit,
        paymentTerms: customer.creditAccount.paymentTerms,
        status: customer.creditAccount.status
      },
      activity: {
        invoiceCount: invoices.length,
        totalInvoiced,
        totalPaid,
        totalOutstanding: totalInvoiced - totalPaid,
        salesCount: sales.length,
        totalSales,
        salesByFuelType: Object.entries(salesByFuelType).map(([fuelType, data]) => ({
          fuelType,
          quantity: data.quantity,
          amount: data.amount,
          count: data.count
        }))
      },
      paymentHistory: invoices.filter(invoice => invoice.payments.length > 0).map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        payments: invoice.payments.map(payment => ({
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference
        }))
      })),
      recentInvoices: invoices.slice(0, 5).map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        amountDue: invoice.amountDue,
        status: invoice.paymentStatus
      }))
    };

    res.json({
      success: true,
      data: creditReport
    });
  } catch (err) {
    console.error('Error generating credit report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Upload customer document
 * @route   POST /api/customers/:id/documents
 * @access  Private
 */
exports.uploadDocument = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Add document to customer
    customer.documents.push({
      type: req.body.type || 'Other',
      name: req.file.originalname || 'Document',
      path: req.file.path,
      uploadDate: new Date()
    });
    
    customer.updatedBy = req.user.id;
    customer.updatedAt = Date.now();

    await customer.save();

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error uploading document:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Delete customer document
 * @route   DELETE /api/customers/:id/documents/:documentId
 * @access  Private
 */
exports.deleteDocument = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Find document index
    const documentIndex = customer.documents.findIndex(
      doc => doc._id.toString() === req.params.documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Remove document from array
    customer.documents.splice(documentIndex, 1);
    customer.updatedBy = req.user.id;
    customer.updatedAt = Date.now();
    
    await customer.save();

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error deleting document:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};