const moment = require('moment');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Sales = require('../models/Sales');
const FuelInventory = require('../models/FuelInventory');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');
const PettyCash = require('../models/PettyCash');
const calculationHelpers = require('../utils/calculationHelpers');
const bankBookReportGenerator = require('../utils/reportGenerator');
const pettyCashReportGenerator = require('../utils/pettyCashReportGenerator');

// --------------------------
// SALES REPORTS
// --------------------------

/**
 * @desc    Generate sales report
 * @route   GET /api/reports/sales
 * @access  Private
 */
exports.generateSalesReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      reportType = 'summary',
      fuelType,
      paymentMethod,
      customerId,
      stationId,
      format = 'json',
      includeCharts = true,
      includeDetails = true,
      includeSummary = true
    } = req.query;

    // Build query
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (stationId) {
      query.stationId = stationId;
    }

    // Get sales data
    const sales = await Sales.find(query)
      .populate('customerId', 'name customerId')
      .sort({ date: 1 });

    // Calculate summary data
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const averageSaleAmount = totalSales > 0 ? totalAmount / totalSales : 0;

    // Group by fuel type
    const salesByFuelType = sales.reduce((acc, sale) => {
      if (!acc[sale.fuelType]) {
        acc[sale.fuelType] = {
          quantity: 0,
          amount: 0,
          count: 0
        };
      }
      acc[sale.fuelType].quantity += sale.quantity;
      acc[sale.fuelType].amount += sale.totalAmount;
      acc[sale.fuelType].count += 1;
      return acc;
    }, {});

    // Calculate percentages for fuel type
    const totalFuelTypes = Object.keys(salesByFuelType).length;
    Object.keys(salesByFuelType).forEach(fuelType => {
      salesByFuelType[fuelType].percentageOfTotal = 
        (salesByFuelType[fuelType].amount / totalAmount) * 100;
    });

    // Group by payment method
    const salesByPaymentMethod = sales.reduce((acc, sale) => {
      if (!acc[sale.paymentMethod]) {
        acc[sale.paymentMethod] = {
          amount: 0,
          count: 0
        };
      }
      acc[sale.paymentMethod].amount += sale.totalAmount;
      acc[sale.paymentMethod].count += 1;
      return acc;
    }, {});

    // Group by date for trend analysis
    const salesByDate = {};
    const salesByMonth = {};
    
    sales.forEach(sale => {
      // Daily grouping
      const dateKey = moment(sale.date).format('YYYY-MM-DD');
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          amount: 0,
          quantity: 0,
          count: 0
        };
      }
      salesByDate[dateKey].amount += sale.totalAmount;
      salesByDate[dateKey].quantity += sale.quantity;
      salesByDate[dateKey].count += 1;
      
      // Monthly grouping
      const monthKey = moment(sale.date).format('YYYY-MM');
      if (!salesByMonth[monthKey]) {
        salesByMonth[monthKey] = {
          amount: 0,
          quantity: 0,
          count: 0
        };
      }
      salesByMonth[monthKey].amount += sale.totalAmount;
      salesByMonth[monthKey].quantity += sale.quantity;
      salesByMonth[monthKey].count += 1;
    });

    // Format the data as an array for charting
    const dailyTrend = Object.keys(salesByDate).map(date => ({
      date,
      displayDate: moment(date).format('MMM DD'),
      amount: salesByDate[date].amount,
      quantity: salesByDate[date].quantity,
      count: salesByDate[date].count
    })).sort((a, b) => moment(a.date).diff(moment(b.date)));

    const monthlyTrend = Object.keys(salesByMonth).map(month => ({
      month,
      displayMonth: moment(month).format('MMM YYYY'),
      amount: salesByMonth[month].amount,
      quantity: salesByMonth[month].quantity,
      count: salesByMonth[month].count
    })).sort((a, b) => moment(a.month).diff(moment(b.month)));

    // Group by customer (for the top customers report)
    const salesByCustomer = {};
    
    sales.forEach(sale => {
      if (sale.customerId) {
        const customerId = typeof sale.customerId === 'object' ? 
          sale.customerId._id.toString() : 
          sale.customerId.toString();
        
        if (!salesByCustomer[customerId]) {
          salesByCustomer[customerId] = {
            customerId: sale.customerId,
            name: sale.customerId.name || 'Unknown',
            amount: 0,
            quantity: 0,
            count: 0
          };
        }
        
        salesByCustomer[customerId].amount += sale.totalAmount;
        salesByCustomer[customerId].quantity += sale.quantity;
        salesByCustomer[customerId].count += 1;
      }
    });

    const topCustomers = Object.values(salesByCustomer)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Prepare the report data based on report type
    let reportData = {};
    
    switch (reportType) {
      case 'summary':
        reportData = {
          reportType: 'Sales Summary Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity,
            averageSaleAmount,
            salesByFuelType,
            salesByPaymentMethod
          },
          trends: {
            daily: dailyTrend,
            monthly: monthlyTrend
          }
        };
        break;
        
      case 'fuel':
        reportData = {
          reportType: 'Sales by Fuel Type Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity
          },
          salesByFuelType,
          details: includeDetails ? Object.keys(salesByFuelType).map(fuelType => ({
            fuelType,
            quantity: salesByFuelType[fuelType].quantity,
            amount: salesByFuelType[fuelType].amount,
            count: salesByFuelType[fuelType].count,
            percentageOfTotal: salesByFuelType[fuelType].percentageOfTotal
          })) : []
        };
        break;
        
      case 'payment':
        reportData = {
          reportType: 'Sales by Payment Method Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount
          },
          salesByPaymentMethod,
          details: includeDetails ? Object.keys(salesByPaymentMethod).map(method => ({
            paymentMethod: method,
            amount: salesByPaymentMethod[method].amount,
            count: salesByPaymentMethod[method].count,
            percentageOfTotal: (salesByPaymentMethod[method].amount / totalAmount) * 100
          })) : []
        };
        break;
        
      case 'daily':
        reportData = {
          reportType: 'Daily Sales Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity,
            averageSaleAmount
          },
          dailySales: dailyTrend,
          details: includeDetails ? Object.keys(salesByDate).map(date => ({
            date,
            displayDate: moment(date).format('MMM DD, YYYY'),
            amount: salesByDate[date].amount,
            quantity: salesByDate[date].quantity,
            count: salesByDate[date].count
          })).sort((a, b) => moment(a.date).diff(moment(b.date))) : []
        };
        break;
        
      case 'monthly':
        reportData = {
          reportType: 'Monthly Sales Trend Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity,
            averageSaleAmount
          },
          monthlySales: monthlyTrend,
          details: includeDetails ? Object.keys(salesByMonth).map(month => ({
            month,
            displayMonth: moment(month).format('MMMM YYYY'),
            amount: salesByMonth[month].amount,
            quantity: salesByMonth[month].quantity,
            count: salesByMonth[month].count
          })).sort((a, b) => moment(a.month).diff(moment(b.month))) : []
        };
        break;
        
      case 'customer':
        // For customer sales analysis
        reportData = {
          reportType: 'Customer Sales Analysis Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity,
            averageSaleAmount,
            uniqueCustomers: Object.keys(salesByCustomer).length
          },
          topCustomers,
          details: includeDetails ? Object.values(salesByCustomer)
            .sort((a, b) => b.amount - a.amount) : []
        };
        break;
        
      default:
        reportData = {
          reportType: 'Sales Report',
          period: { startDate, endDate },
          summary: {
            totalSales,
            totalAmount,
            totalQuantity,
            averageSaleAmount
          }
        };
    }

    // Add sales transactions if detailed report is requested
    if (includeDetails && !['fuel', 'payment', 'daily', 'monthly', 'customer'].includes(reportType)) {
      reportData.transactions = sales.map(sale => ({
        id: sale._id,
        saleId: sale.saleId,
        date: sale.date,
        fuelType: sale.fuelType,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        customer: sale.customerId ? sale.customerId.name : null,
        station: sale.stationId,
        createdAt: sale.createdAt
      }));
    }

    // Generate report based on format
    switch (format) {
      case 'csv':
        // Generate CSV
        const fields = ['saleId', 'date', 'fuelType', 'quantity', 'unitPrice', 'totalAmount', 'paymentMethod', 'customerId', 'stationId'];
        const csv = [
          fields.join(','),
          ...sales.map(sale => {
            return fields.map(field => {
              if (field === 'date') {
                return moment(sale[field]).format('YYYY-MM-DD HH:mm:ss');
              }
              if (field === 'customerId' && sale.customerId) {
                return typeof sale.customerId === 'object' ? sale.customerId.name : sale.customerId;
              }
              return sale[field];
            }).join(',');
          })
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.csv"`);
        return res.send(csv);

      case 'pdf':
        // Return data for PDF generation
        reportData.generatedOn = new Date();
        reportData.generatedBy = req.user ? req.user.name : 'System';
        
        // In a real system, you'd generate a PDF here
        // For now, we'll just return the data that would be used for the PDF
        return res.json({
          success: true,
          data: reportData,
          message: 'PDF report data ready for generation'
        });

      case 'xlsx':
        // Return data for Excel generation
        reportData.generatedOn = new Date();
        reportData.generatedBy = req.user ? req.user.name : 'System';
        
        // In a real system, you'd generate an Excel file here
        return res.json({
          success: true,
          data: reportData,
          message: 'Excel report data ready for generation'
        });

      case 'json':
      default:
        // Return JSON
        reportData.generatedOn = new Date();
        reportData.generatedBy = req.user ? req.user.name : 'System';
        
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

// --------------------------
// FINANCIAL REPORTS
// --------------------------

/**
 * @desc    Generate financial report (P&L, Cash Flow, etc.)
 * @route   GET /api/reports/financial
 * @access  Private
 */
exports.generateFinancialReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      reportType = 'profit-loss',
      stationId,
      format = 'json',
      includeCharts = true,
      includeDetails = true,
      includeSummary = true
    } = req.query;

    // Validate report type
    const validReportTypes = ['profit-loss', 'cash-flow', 'expense-analysis', 'revenue-analysis', 'tax-report'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report type. Valid types are: ${validReportTypes.join(', ')}`
      });
    }

    // Handle different financial report types
    let report;
    
    switch (reportType) {
      case 'profit-loss':
        report = await bankBookReportGenerator.generateProfitLossReport(startDate, endDate, stationId);
        break;
        
      case 'cash-flow':
        report = await bankBookReportGenerator.generateCashFlowReport(startDate, endDate, stationId);
        break;
        
      case 'expense-analysis':
        report = await generateExpenseAnalysisReport(startDate, endDate, stationId);
        break;
        
      case 'revenue-analysis':
        report = await generateRevenueAnalysisReport(startDate, endDate, stationId);
        break;
        
      case 'tax-report':
        report = await generateTaxReport(startDate, endDate, stationId);
        break;
    }

    // Handle different output formats
    switch (format) {
      case 'csv':
        // Generate CSV based on report type
        let csv = '';
        
        // Generate CSV content based on report type (simplified example)
        if (reportType === 'expense-analysis') {
          const fields = ['category', 'amount', 'percentage'];
          csv = [
            fields.join(','),
            ...report.expensesByCategory.map(expense => 
              `${expense.category},${expense.amount},${expense.percentage}`
            )
          ].join('\n');
        } else {
          // Default CSV format for other report types
          csv = `Report Type,${report.reportType}\nPeriod,${startDate} to ${endDate}\n\n`;
          
          // Add relevant data based on report type
          if (report.summary) {
            csv += 'Summary\n';
            Object.entries(report.summary).forEach(([key, value]) => {
              csv += `${key},${value}\n`;
            });
          }
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${startDate}-to-${endDate}.csv"`);
        return res.send(csv);

      case 'pdf':
      case 'xlsx':
        // Return data for PDF/Excel generation
        return res.json({
          success: true,
          data: report,
          message: `${format.toUpperCase()} report data ready for generation`
        });

      case 'json':
      default:
        // Return JSON
        return res.json({
          success: true,
          data: report
        });
    }
  } catch (err) {
    console.error(`Error generating ${req.query.reportType || 'financial'} report:`, err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Helper function to generate expense analysis report
 */
async function generateExpenseAnalysisReport(startDate, endDate, stationId) {
  // Build query
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    approvalStatus: 'Approved'
  };

  if (stationId) {
    query.stationId = stationId;
  }

  // Get expenses
  const expenses = await Expense.find(query)
    .sort({ date: 1 });

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Group by category
  const expensesByCategory = {};
  
  expenses.forEach(expense => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = {
        amount: 0,
        count: 0
      };
    }
    expensesByCategory[expense.category].amount += expense.amount;
    expensesByCategory[expense.category].count += 1;
  });

  // Format for report
  const categorySummary = Object.keys(expensesByCategory).map(category => ({
    category,
    amount: expensesByCategory[category].amount,
    count: expensesByCategory[category].count,
    percentage: (expensesByCategory[category].amount / totalExpenses) * 100
  })).sort((a, b) => b.amount - a.amount);

  // Group by month
  const expensesByMonth = {};
  
  expenses.forEach(expense => {
    const monthKey = moment(expense.date).format('YYYY-MM');
    if (!expensesByMonth[monthKey]) {
      expensesByMonth[monthKey] = {
        amount: 0,
        count: 0
      };
    }
    expensesByMonth[monthKey].amount += expense.amount;
    expensesByMonth[monthKey].count += 1;
  });

  // Format monthly data for trend analysis
  const monthlyTrend = Object.keys(expensesByMonth).map(month => ({
    month,
    displayMonth: moment(month).format('MMM YYYY'),
    amount: expensesByMonth[month].amount,
    count: expensesByMonth[month].count
  })).sort((a, b) => moment(a.month).diff(moment(b.month)));

  // Group by payment method
  const expensesByPaymentMethod = {};
  
  expenses.forEach(expense => {
    if (!expensesByPaymentMethod[expense.paymentMethod]) {
      expensesByPaymentMethod[expense.paymentMethod] = {
        amount: 0,
        count: 0
      };
    }
    expensesByPaymentMethod[expense.paymentMethod].amount += expense.amount;
    expensesByPaymentMethod[expense.paymentMethod].count += 1;
  });

  return {
    reportType: 'Expense Analysis Report',
    period: { startDate, endDate },
    stationId,
    generatedAt: new Date(),
    summary: {
      totalExpenses,
      totalCount: expenses.length,
      avgExpenseAmount: totalExpenses / (expenses.length || 1),
      topCategory: categorySummary.length > 0 ? categorySummary[0].category : 'N/A'
    },
    expensesByCategory: categorySummary,
    expensesByMonth: monthlyTrend,
    expensesByPaymentMethod: Object.keys(expensesByPaymentMethod).map(method => ({
      paymentMethod: method,
      amount: expensesByPaymentMethod[method].amount,
      count: expensesByPaymentMethod[method].count,
      percentage: (expensesByPaymentMethod[method].amount / totalExpenses) * 100
    })).sort((a, b) => b.amount - a.amount),
    details: expenses.map(expense => ({
      id: expense._id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      stationId: expense.stationId,
      approvedBy: expense.approvedBy
    }))
  };
}

/**
 * Helper function to generate revenue analysis report
 */
async function generateRevenueAnalysisReport(startDate, endDate, stationId) {
  // Build query for sales
  const salesQuery = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (stationId) {
    salesQuery.stationId = stationId;
  }

  // Get sales
  const sales = await Sales.find(salesQuery)
    .sort({ date: 1 });

  // Calculate total revenue
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Calculate total quantity
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  // Group by fuel type
  const revenueByFuelType = {};
  
  sales.forEach(sale => {
    if (!revenueByFuelType[sale.fuelType]) {
      revenueByFuelType[sale.fuelType] = {
        amount: 0,
        quantity: 0,
        count: 0
      };
    }
    revenueByFuelType[sale.fuelType].amount += sale.totalAmount;
    revenueByFuelType[sale.fuelType].quantity += sale.quantity;
    revenueByFuelType[sale.fuelType].count += 1;
  });

  // Format for report
  const fuelTypeSummary = Object.keys(revenueByFuelType).map(fuelType => ({
    fuelType,
    amount: revenueByFuelType[fuelType].amount,
    quantity: revenueByFuelType[fuelType].quantity,
    count: revenueByFuelType[fuelType].count,
    percentage: (revenueByFuelType[fuelType].amount / totalRevenue) * 100,
    avgPrice: revenueByFuelType[fuelType].quantity > 0 ? 
      revenueByFuelType[fuelType].amount / revenueByFuelType[fuelType].quantity : 0
  })).sort((a, b) => b.amount - a.amount);

  // Group by month
  const revenueByMonth = {};
  
  sales.forEach(sale => {
    const monthKey = moment(sale.date).format('YYYY-MM');
    if (!revenueByMonth[monthKey]) {
      revenueByMonth[monthKey] = {
        amount: 0,
        quantity: 0,
        count: 0
      };
    }
    revenueByMonth[monthKey].amount += sale.totalAmount;
    revenueByMonth[monthKey].quantity += sale.quantity;
    revenueByMonth[monthKey].count += 1;
  });

  // Format monthly data for trend analysis
  const monthlyTrend = Object.keys(revenueByMonth).map(month => ({
    month,
    displayMonth: moment(month).format('MMM YYYY'),
    amount: revenueByMonth[month].amount,
    quantity: revenueByMonth[month].quantity,
    count: revenueByMonth[month].count
  })).sort((a, b) => moment(a.month).diff(moment(b.month)));

  // Get invoice data for credit sales analysis
  const invoiceQuery = {
    issueDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (stationId) {
    invoiceQuery.stationId = stationId;
  }

  const invoices = await Invoice.find(invoiceQuery)
    .populate('customerId', 'name customerId');

  // Calculate credit sales totals
  const totalInvoices = invoices.length;
  const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalOutstandingAmount = invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);

  return {
    reportType: 'Revenue Analysis Report',
    period: { startDate, endDate },
    stationId,
    generatedAt: new Date(),
    summary: {
      totalRevenue,
      totalQuantity,
      totalSales: sales.length,
      avgSaleAmount: sales.length > 0 ? totalRevenue / sales.length : 0,
      totalInvoices,
      totalInvoiceAmount,
      totalOutstandingAmount
    },
    revenueByFuelType: fuelTypeSummary,
    monthlyTrend,
    creditSalesSummary: {
      totalInvoices,
      totalInvoiceAmount,
      totalOutstandingAmount,
      percentageOutstanding: totalInvoiceAmount > 0 ? 
        (totalOutstandingAmount / totalInvoiceAmount) * 100 : 0
    }
  };
}

/**
 * Helper function to generate tax report
 */
async function generateTaxReport(startDate, endDate, stationId) {
  // Build query for sales
  const salesQuery = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (stationId) {
    salesQuery.stationId = stationId;
  }

  // Get sales
  const sales = await Sales.find(salesQuery);

  // Calculate total sales for tax calculations
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Assuming a simplified tax structure with VAT
  const vatRate = 15; // 15% VAT rate
  const vatAmount = (totalSales * vatRate) / 100;
  
  // Group sales by month for monthly tax calculations
  const salesByMonth = {};
  
  sales.forEach(sale => {
    const monthKey = moment(sale.date).format('YYYY-MM');
    if (!salesByMonth[monthKey]) {
      salesByMonth[monthKey] = {
        amount: 0,
        vatAmount: 0
      };
    }
    salesByMonth[monthKey].amount += sale.totalAmount;
    salesByMonth[monthKey].vatAmount += (sale.totalAmount * vatRate) / 100;
  });

  // Format monthly data
  const monthlyTaxData = Object.keys(salesByMonth).map(month => ({
    month,
    displayMonth: moment(month).format('MMM YYYY'),
    salesAmount: salesByMonth[month].amount,
    vatAmount: salesByMonth[month].vatAmount,
    netAmount: salesByMonth[month].amount - salesByMonth[month].vatAmount
  })).sort((a, b) => moment(a.month).diff(moment(b.month)));

  // Build query for expenses
  const expenseQuery = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    approvalStatus: 'Approved'
  };

  if (stationId) {
    expenseQuery.stationId = stationId;
  }

  // Get expenses
  const expenses = await Expense.find(expenseQuery);

  // Total deductible expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Simplified income tax calculation
  const taxableIncome = totalSales - totalExpenses;
  const incomeTaxRate = 24; // 24% corporate tax rate
  const incomeTaxAmount = taxableIncome > 0 ? (taxableIncome * incomeTaxRate) / 100 : 0;

  return {
    reportType: 'Tax Report',
    period: { startDate, endDate },
    stationId,
    generatedAt: new Date(),
    summary: {
      totalSales,
      vatRate,
      vatAmount,
      totalExpenses,
      taxableIncome,
      incomeTaxRate,
      incomeTaxAmount,
      netProfit: taxableIncome - incomeTaxAmount
    },
    monthlyTaxData,
    taxLiabilities: {
      vat: vatAmount,
      incomeTax: incomeTaxAmount,
      totalTaxLiability: vatAmount + incomeTaxAmount
    }
  };
}