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
const errorHandler = require('../utils/errorHandler').errorHandler;

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
          // Generate PDF
          try {
            // Note: You'll need to install a PDF generation library like pdfkit
            // npm install pdfkit
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.pdf"`);
            
            // Pipe the PDF document to the response
            doc.pipe(res);
            
            // Add content to the PDF
            doc.fontSize(20).text(`${reportData.reportType}`, { align: 'center' });
            doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
            doc.moveDown();
            
            // Add summary section
            doc.fontSize(16).text('Summary', { underline: true });
            doc.moveDown(0.5);
            
            if (reportData.summary) {
              Object.entries(reportData.summary).forEach(([key, value]) => {
                // Format the key as a readable title
                const formattedKey = key
                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                  .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                  
                doc.text(`${formattedKey}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
              });
            }
            
            doc.moveDown();
            
            // Add additional sections based on report type
            if (reportType === 'fuel' && reportData.details) {
              doc.fontSize(16).text('Fuel Type Breakdown', { underline: true });
              doc.moveDown(0.5);
              
              reportData.details.forEach(item => {
                doc.text(`${item.fuelType}: ${item.amount.toFixed(2)} (${item.percentageOfTotal.toFixed(2)}%)`);
              });
            }
            
            // Add more sections for other report types
            
            // Finalize the PDF
            doc.end();
            return;
          } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            return res.status(500).json({
              success: false,
              error: 'Error generating PDF'
            });
          }
        
        case 'xlsx':
          // Generate Excel
          try {
            // Note: You'll need to install an Excel generation library like exceljs
            // npm install exceljs
            const Excel = require('exceljs');
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');
            
            // Add title and period
            worksheet.mergeCells('A1:E1');
            worksheet.getCell('A1').value = reportData.reportType;
            worksheet.getCell('A1').font = { bold: true, size: 16 };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            
            worksheet.mergeCells('A2:E2');
            worksheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
            worksheet.getCell('A2').alignment = { horizontal: 'center' };
            
            // Add summary section
            worksheet.addRow([]);
            worksheet.addRow(['Summary']);
            worksheet.getRow(4).font = { bold: true, underline: true };
            
            if (reportData.summary) {
              Object.entries(reportData.summary).forEach(([key, value], index) => {
                // Format the key as a readable title
                const formattedKey = key
                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                  .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                  
                worksheet.addRow([formattedKey, typeof value === 'number' ? value.toFixed(2) : value]);
              });
            }
            
            // Add additional sections based on report type
            worksheet.addRow([]);
            
            if (reportType === 'fuel' && reportData.details) {
              worksheet.addRow(['Fuel Type Breakdown']);
              worksheet.getRow(worksheet.rowCount).font = { bold: true, underline: true };
              worksheet.addRow(['Fuel Type', 'Quantity', 'Amount', 'Percentage', 'Count']);
              
              reportData.details.forEach(item => {
                worksheet.addRow([
                  item.fuelType,
                  item.quantity,
                  item.amount,
                  `${item.percentageOfTotal.toFixed(2)}%`,
                  item.count
                ]);
              });
            }
            
            // Add more sections for other report types
            
            // Set content type and disposition
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.xlsx"`);
            
            // Write to response
            await workbook.xlsx.write(res);
            res.end();
            return;
          } catch (xlsxError) {
            console.error('Error generating Excel:', xlsxError);
            return res.status(500).json({
              success: false,
              error: 'Error generating Excel'
            });
          }
          
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
    // This is the code to be inserted into the reportController.js file
// to enable PDF generation functionality

const { generatePDFReport } = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

// For the generateSalesReport method
// Replace the existing switch (format) case with this:

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
    // Generate PDF using the utility
    try {
      reportData.generatedOn = new Date();
      reportData.generatedBy = req.user ? req.user.name : 'System';
      
      const pdfBuffer = await generatePDFReport(reportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return res.status(500).json({
        success: false,
        error: 'Error generating PDF report'
      });
    }

  case 'xlsx':
    // Generate Excel file
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Fuel Station Management System';
      workbook.created = new Date();
      
      // Create a worksheet
      const worksheet = workbook.addWorksheet('Sales Report');
      
      // Add title
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = reportData.reportType;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add period
      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = `Period: ${moment(startDate).format('MMM DD, YYYY')} to ${moment(endDate).format('MMM DD, YYYY')}`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Add summary section
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      worksheet.getRow(4).font = { bold: true };
      
      if (reportData.summary) {
        Object.entries(reportData.summary).forEach(([key, value], index) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          
          worksheet.addRow([formattedKey, value]);
        });
      }
      
      // Add sales data if available
      if (sales && sales.length > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['Transactions']);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add headers
        const headers = ['Sale ID', 'Date', 'Fuel Type', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Method', 'Customer'];
        worksheet.addRow(headers);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add data rows
        sales.forEach(sale => {
          worksheet.addRow([
            sale.saleId,
            moment(sale.date).format('YYYY-MM-DD'),
            sale.fuelType,
            sale.quantity,
            sale.unitPrice,
            sale.totalAmount,
            sale.paymentMethod,
            sale.customerId ? (typeof sale.customerId === 'object' ? sale.customerId.name : sale.customerId) : ''
          ]);
        });
        
        // Format the cells
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength;
        });
      }
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.xlsx"`);
      return res.send(buffer);
    } catch (excelError) {
      console.error('Error generating Excel file:', excelError);
      return res.status(500).json({
        success: false,
        error: 'Error generating Excel report'
      });
    }

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

// Similar changes should be made to the other report generation functions (generateFinancialReport, generateInventoryReport, etc.)
// to use the PDF generator for PDF format and Excel.js for XLSX format.

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

/**
 * @desc    Generate inventory report
 * @route   GET /api/reports/inventory
 * @access  Private
 */
exports.generateInventoryReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      reportType = 'status',
      fuelType,
      stationId,
      format = 'json',
      includeCharts = true,
      includeDetails = true
    } = req.query;

    // Build query
    const query = {};

    if (fuelType) {
      query.fuelType = fuelType;
    }

    if (stationId) {
      query.stationId = stationId;
    }

    // Get inventory data
    const inventoryItems = await FuelInventory.find(query);

    // Prepare report based on report type
    let reportData = {};
    
    switch (reportType) {
      case 'status':
        // Current inventory status report
        reportData = await generateInventoryStatusReport(inventoryItems, includeDetails);
        break;

      case 'movement':
        // Stock movement report for the period
        reportData = await generateStockMovementReport(inventoryItems, startDate, endDate, includeDetails);
        break;

      case 'price-analysis':
        // Fuel price analysis report
        reportData = await generatePriceAnalysisReport(inventoryItems, startDate, endDate, includeDetails);
        break;

      case 'low-stock':
        // Low stock alert report
        reportData = await generateLowStockReport(inventoryItems, includeDetails);
        break;

      case 'valuation':
        // Inventory valuation report
        reportData = await generateInventoryValuationReport(inventoryItems, includeDetails);
        break;

      default:
        // Default to status report
        reportData = await generateInventoryStatusReport(inventoryItems, includeDetails);
    }

    // Add generation metadata
    reportData.generatedAt = new Date();
    reportData.generatedBy = req.user ? req.user.name : 'System';
    reportData.period = { startDate, endDate };

    // Return report in requested format
 // This is the code to be inserted into the reportController.js file
// to enable PDF generation functionality

const { generatePDFReport } = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

// For the generateSalesReport method
// Replace the existing switch (format) case with this:

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
    // Generate PDF using the utility
    try {
      reportData.generatedOn = new Date();
      reportData.generatedBy = req.user ? req.user.name : 'System';
      
      const pdfBuffer = await generatePDFReport(reportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return res.status(500).json({
        success: false,
        error: 'Error generating PDF report'
      });
    }

  case 'xlsx':
    // Generate Excel file
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Fuel Station Management System';
      workbook.created = new Date();
      
      // Create a worksheet
      const worksheet = workbook.addWorksheet('Sales Report');
      
      // Add title
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = reportData.reportType;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add period
      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = `Period: ${moment(startDate).format('MMM DD, YYYY')} to ${moment(endDate).format('MMM DD, YYYY')}`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Add summary section
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      worksheet.getRow(4).font = { bold: true };
      
      if (reportData.summary) {
        Object.entries(reportData.summary).forEach(([key, value], index) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          
          worksheet.addRow([formattedKey, value]);
        });
      }
      
      // Add sales data if available
      if (sales && sales.length > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['Transactions']);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add headers
        const headers = ['Sale ID', 'Date', 'Fuel Type', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Method', 'Customer'];
        worksheet.addRow(headers);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add data rows
        sales.forEach(sale => {
          worksheet.addRow([
            sale.saleId,
            moment(sale.date).format('YYYY-MM-DD'),
            sale.fuelType,
            sale.quantity,
            sale.unitPrice,
            sale.totalAmount,
            sale.paymentMethod,
            sale.customerId ? (typeof sale.customerId === 'object' ? sale.customerId.name : sale.customerId) : ''
          ]);
        });
        
        // Format the cells
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength;
        });
      }
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.xlsx"`);
      return res.send(buffer);
    } catch (excelError) {
      console.error('Error generating Excel file:', excelError);
      return res.status(500).json({
        success: false,
        error: 'Error generating Excel report'
      });
    }

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

// Similar changes should be made to the other report generation functions (generateFinancialReport, generateInventoryReport, etc.)
// to use the PDF generator for PDF format and Excel.js for XLSX format.   
  } catch (err) {
    console.error('Error generating inventory report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Helper function to generate inventory status report
 */
async function generateInventoryStatusReport(inventoryItems, includeDetails) {
  const summary = {
    totalTanks: inventoryItems.length,
    totalCapacity: inventoryItems.reduce((sum, item) => sum + item.tankCapacity, 0),
    totalCurrentVolume: inventoryItems.reduce((sum, item) => sum + item.currentVolume, 0),
    averageUsage: 0,
    criticalItems: inventoryItems.filter(item => item.status === 'Critical').length,
    lowItems: inventoryItems.filter(item => item.status === 'Low').length
  };

  // Calculate average usage
  summary.averageUsage = (summary.totalCurrentVolume / summary.totalCapacity) * 100;

  // Group by fuel type
  const byFuelType = {};
  inventoryItems.forEach(item => {
    if (!byFuelType[item.fuelType]) {
      byFuelType[item.fuelType] = {
        totalCapacity: 0,
        totalVolume: 0,
        count: 0,
        value: 0
      };
    }
    byFuelType[item.fuelType].totalCapacity += item.tankCapacity;
    byFuelType[item.fuelType].totalVolume += item.currentVolume;
    byFuelType[item.fuelType].count += 1;
    byFuelType[item.fuelType].value += item.currentVolume * item.costPrice;
  });

  // Format items for detailed view
  const formattedItems = inventoryItems.map(item => ({
    id: item._id,
    tankId: item.tankId,
    fuelType: item.fuelType,
    stationId: item.stationId,
    tankCapacity: item.tankCapacity,
    currentVolume: item.currentVolume,
    usagePercentage: (item.currentVolume / item.tankCapacity) * 100,
    status: item.status,
    sellingPrice: item.sellingPrice,
    costPrice: item.costPrice,
    reorderLevel: item.reorderLevel,
    lastStockUpdate: item.lastStockUpdate,
    inventoryValue: item.currentVolume * item.costPrice
  }));

  return {
    reportType: 'Inventory Status Report',
    summary,
    byFuelType: Object.keys(byFuelType).map(fuelType => ({
      fuelType,
      totalCapacity: byFuelType[fuelType].totalCapacity,
      totalVolume: byFuelType[fuelType].totalVolume,
      usagePercentage: (byFuelType[fuelType].totalVolume / byFuelType[fuelType].totalCapacity) * 100,
      count: byFuelType[fuelType].count,
      value: byFuelType[fuelType].value
    })),
    items: includeDetails ? formattedItems : []
  };
}

/**
 * Helper function to generate stock movement report
 */
async function generateStockMovementReport(inventoryItems, startDate, endDate, includeDetails) {
  // Extract all stock history entries within the date range
  let allMovements = [];
  
  inventoryItems.forEach(item => {
    const itemMovements = item.stockHistory
      .filter(history => {
        const historyDate = new Date(history.date);
        return historyDate >= new Date(startDate) && historyDate <= new Date(endDate);
      })
      .map(history => ({
        date: history.date,
        tankId: item.tankId,
        fuelType: item.fuelType,
        stationId: item.stationId,
        type: history.type,
        volume: Math.abs(history.volume), // Absolute value for reporting
        direction: history.volume >= 0 ? 'in' : 'out',
        costPrice: history.costPrice || item.costPrice,
        reference: history.reference,
        notes: history.notes
      }));
    
    allMovements = [...allMovements, ...itemMovements];
  });

  // Sort movements by date
  allMovements.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate summary data
  const summary = {
    totalMovements: allMovements.length,
    inflow: allMovements.filter(m => m.direction === 'in').reduce((sum, m) => sum + m.volume, 0),
    outflow: allMovements.filter(m => m.direction === 'out').reduce((sum, m) => sum + m.volume, 0),
    netChange: 0
  };
  
  summary.netChange = summary.inflow - summary.outflow;

  // Group by type
  const byType = {
    Purchase: {
      count: 0,
      volume: 0
    },
    Sale: {
      count: 0,
      volume: 0
    },
    Adjustment: {
      count: 0,
      volume: 0
    },
    Loss: {
      count: 0,
      volume: 0
    }
  };

  allMovements.forEach(movement => {
    if (byType[movement.type]) {
      byType[movement.type].count += 1;
      byType[movement.type].volume += movement.volume;
    }
  });

  return {
    reportType: 'Stock Movement Report',
    summary,
    byType: Object.keys(byType).map(type => ({
      type,
      count: byType[type].count,
      volume: byType[type].volume,
      percentage: allMovements.length > 0 ? 
        (byType[type].count / allMovements.length) * 100 : 0
    })),
    movements: includeDetails ? allMovements : []
  };
}

/**
 * Helper function to generate fuel price analysis report
 */
async function generatePriceAnalysisReport(inventoryItems, startDate, endDate, includeDetails) {
  // Extract all price history entries within the date range
  let allPriceChanges = [];
  
  inventoryItems.forEach(item => {
    const itemPriceChanges = item.priceHistory
      .filter(history => {
        const historyDate = new Date(history.date);
        return historyDate >= new Date(startDate) && historyDate <= new Date(endDate);
      })
      .map(history => ({
        date: history.date,
        tankId: item.tankId,
        fuelType: item.fuelType,
        stationId: item.stationId,
        oldPrice: history.oldPrice,
        newPrice: history.newPrice,
        change: history.newPrice - history.oldPrice,
        percentageChange: ((history.newPrice - history.oldPrice) / history.oldPrice) * 100,
        reason: history.reason
      }));
    
    allPriceChanges = [...allPriceChanges, ...itemPriceChanges];
  });

  // Sort price changes by date
  allPriceChanges.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate summary data
  const summary = {
    totalChanges: allPriceChanges.length,
    averageChange: 0,
    maxIncrease: 0,
    maxDecrease: 0
  };
  
  if (allPriceChanges.length > 0) {
    const changes = allPriceChanges.map(pc => pc.change);
    summary.averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    summary.maxIncrease = Math.max(...changes);
    summary.maxDecrease = Math.min(...changes);
  }

  // Group by fuel type
  const byFuelType = {};
  
  allPriceChanges.forEach(priceChange => {
    if (!byFuelType[priceChange.fuelType]) {
      byFuelType[priceChange.fuelType] = {
        count: 0,
        totalChange: 0,
        changes: []
      };
    }
    byFuelType[priceChange.fuelType].count += 1;
    byFuelType[priceChange.fuelType].totalChange += priceChange.change;
    byFuelType[priceChange.fuelType].changes.push(priceChange);
  });

  // Get current prices
  const currentPrices = inventoryItems.reduce((prices, item) => {
    prices[item.fuelType] = item.sellingPrice;
    return prices;
  }, {});

  return {
    reportType: 'Fuel Price Analysis Report',
    summary,
    currentPrices,
    byFuelType: Object.keys(byFuelType).map(fuelType => ({
      fuelType,
      count: byFuelType[fuelType].count,
      averageChange: byFuelType[fuelType].count > 0 ? 
        byFuelType[fuelType].totalChange / byFuelType[fuelType].count : 0,
      currentPrice: currentPrices[fuelType]
    })),
    priceChanges: includeDetails ? allPriceChanges : []
  };
}

/**
 * Helper function to generate low stock report
 */
async function generateLowStockReport(inventoryItems, includeDetails) {
  // Filter items below reorder level
  const lowStockItems = inventoryItems.filter(item => 
    item.currentVolume <= item.reorderLevel
  );

  // Calculate summary
  const summary = {
    totalTanks: inventoryItems.length,
    lowStockCount: lowStockItems.length,
    lowStockPercentage: (lowStockItems.length / inventoryItems.length) * 100,
    criticalCount: inventoryItems.filter(item => item.status === 'Critical').length,
    totalTopUpRequired: lowStockItems.reduce((sum, item) => sum + (item.tankCapacity - item.currentVolume), 0)
  };

  // Format items for detailed view
  const formattedItems = lowStockItems.map(item => ({
    id: item._id,
    tankId: item.tankId,
    fuelType: item.fuelType,
    stationId: item.stationId,
    currentVolume: item.currentVolume,
    tankCapacity: item.tankCapacity,
    reorderLevel: item.reorderLevel,
    usagePercentage: (item.currentVolume / item.tankCapacity) * 100,
    status: item.status,
    shortfall: item.reorderLevel - item.currentVolume > 0 ? item.reorderLevel - item.currentVolume : 0,
    recommendedTopUp: item.tankCapacity - item.currentVolume,
    lastStockUpdate: item.lastStockUpdate
  }));

  // Group by fuel type
  const byFuelType = {};
  lowStockItems.forEach(item => {
    if (!byFuelType[item.fuelType]) {
      byFuelType[item.fuelType] = {
        count: 0,
        totalShortfall: 0,
        totalRequired: 0
      };
    }
    byFuelType[item.fuelType].count += 1;
    const shortfall = item.reorderLevel - item.currentVolume > 0 ? item.reorderLevel - item.currentVolume : 0;
    byFuelType[item.fuelType].totalShortfall += shortfall;
    byFuelType[item.fuelType].totalRequired += item.tankCapacity - item.currentVolume;
  });

  return {
    reportType: 'Low Stock Alert Report',
    summary,
    byFuelType: Object.keys(byFuelType).map(fuelType => ({
      fuelType,
      count: byFuelType[fuelType].count,
      totalShortfall: byFuelType[fuelType].totalShortfall,
      totalRequired: byFuelType[fuelType].totalRequired
    })),
    items: includeDetails ? formattedItems : []
  };
}

/**
 * Helper function to generate inventory valuation report
 */
async function generateInventoryValuationReport(inventoryItems, includeDetails) {
  // Calculate total valuation
  const totalValuation = inventoryItems.reduce((sum, item) => 
    sum + (item.currentVolume * item.costPrice), 0
  );

  const summary = {
    totalItems: inventoryItems.length,
    totalVolume: inventoryItems.reduce((sum, item) => sum + item.currentVolume, 0),
    totalValuation,
    averageValuePerLiter: inventoryItems.reduce((sum, item) => sum + item.currentVolume, 0) > 0 ?
      totalValuation / inventoryItems.reduce((sum, item) => sum + item.currentVolume, 0) : 0
  };

  // Format items for detailed view
  const formattedItems = inventoryItems.map(item => ({
    id: item._id,
    tankId: item.tankId,
    fuelType: item.fuelType,
    stationId: item.stationId,
    currentVolume: item.currentVolume,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    grossMargin: ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100,
    inventoryValue: item.currentVolume * item.costPrice,
    potentialRevenue: item.currentVolume * item.sellingPrice,
    potentialProfit: item.currentVolume * (item.sellingPrice - item.costPrice)
  }));

  // Group by fuel type
  const byFuelType = {};
  inventoryItems.forEach(item => {
    if (!byFuelType[item.fuelType]) {
      byFuelType[item.fuelType] = {
        volume: 0,
        value: 0,
        potentialRevenue: 0,
        potentialProfit: 0
      };
    }
    byFuelType[item.fuelType].volume += item.currentVolume;
    byFuelType[item.fuelType].value += item.currentVolume * item.costPrice;
    byFuelType[item.fuelType].potentialRevenue += item.currentVolume * item.sellingPrice;
    byFuelType[item.fuelType].potentialProfit += item.currentVolume * (item.sellingPrice - item.costPrice);
  });

  return {
    reportType: 'Inventory Valuation Report',
    summary,
    byFuelType: Object.keys(byFuelType).map(fuelType => ({
      fuelType,
      volume: byFuelType[fuelType].volume,
      value: byFuelType[fuelType].value,
      percentageOfTotal: (byFuelType[fuelType].value / totalValuation) * 100,
      potentialRevenue: byFuelType[fuelType].potentialRevenue,
      potentialProfit: byFuelType[fuelType].potentialProfit
    })),
    items: includeDetails ? formattedItems : []
  };
}

// Fix for the generateCustomerReport function in controllers/reportController.js

// The issue is that reportData is used but not defined in the function
// Here's the corrected version of the function:

/**
 * @desc    Generate customer report
 * @route   GET /api/reports/customers
 * @access  Private
 */

const { generatePDFReport } = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

exports.generateCustomerReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      reportType = 'customer-list',
      customerId,
      format = 'json',
      includeDetails = true
    } = req.query;

    // Handle different customer report types
    let report;
    
    switch (reportType) {
      case 'list':
      case 'customer-list':
        report = await generateCustomerListReport(includeDetails);
        break;
        
      case 'credit-customers':
        report = await generateCreditCustomersReport(includeDetails);
        break;
        
      case 'outstanding-invoices':
        report = await generateOutstandingInvoicesReport(startDate, endDate, customerId, includeDetails);
        break;
        
      case 'customer-aging':
        report = await generateCustomerAgingReport(includeDetails);
        break;
        
      case 'top-customers':
        report = await generateTopCustomersReport(startDate, endDate, includeDetails);
        break;
        
      default:
        report = await generateCustomerListReport(includeDetails);
    }

    // Add generation metadata
    report.generatedAt = new Date();
    report.generatedBy = req.user ? req.user.name : 'System';
    report.period = { startDate, endDate };

    // Return report in requested format
    switch (format) {
      case 'csv':
        // Generate CSV based on report type
        let csv = `Report Type,${report.reportType}\nPeriod,${startDate} to ${endDate}\n\n`;
        
        // Add CSV data based on report type
        if (reportType === 'customer-list' || reportType === 'list') {
          csv += 'Customer ID,Name,Email,Phone,Credit Limit,Status\n';
          report.customers.forEach(customer => {
            csv += `${customer.customerId},${customer.name},${customer.email},${customer.phone},${customer.creditLimit || 0},${customer.status}\n`;
          });
        } else if (reportType === 'outstanding-invoices') {
          csv += 'Invoice Number,Customer,Issue Date,Due Date,Amount,Amount Due,Days Overdue\n';
          report.invoices.forEach(invoice => {
            csv += `${invoice.invoiceNumber},${invoice.customer},${moment(invoice.issueDate).format('YYYY-MM-DD')},${moment(invoice.dueDate).format('YYYY-MM-DD')},${invoice.totalAmount},${invoice.amountDue},${invoice.daysOverdue}\n`;
          });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="customer-${reportType}-${startDate}-to-${endDate}.csv"`);
        return res.send(csv);

      case 'pdf':
        try {
          // Generate PDF using the utility
          const pdfBuffer = await generatePDFReport(report);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="customer-${reportType}-${startDate}-to-${endDate}.pdf"`);
          return res.send(pdfBuffer);
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          return res.status(500).json({
            success: false,
            error: 'Error generating PDF report'
          });
        }

      case 'xlsx':
        try {
          // Generate Excel file
          const workbook = new ExcelJS.Workbook();
          workbook.creator = 'Fuel Station Management System';
          workbook.created = new Date();
          
          // Create a worksheet
          const worksheet = workbook.addWorksheet('Customer Report');
          
          // Add title
          worksheet.mergeCells('A1:H1');
          worksheet.getCell('A1').value = report.reportType;
          worksheet.getCell('A1').font = { size: 16, bold: true };
          worksheet.getCell('A1').alignment = { horizontal: 'center' };
          
          // Add period
          worksheet.mergeCells('A2:H2');
          worksheet.getCell('A2').value = `Period: ${moment(startDate).format('MMM DD, YYYY')} to ${moment(endDate).format('MMM DD, YYYY')}`;
          worksheet.getCell('A2').font = { size: 12 };
          worksheet.getCell('A2').alignment = { horizontal: 'center' };
          
          // Add summary section
          worksheet.addRow([]);
          worksheet.addRow(['Summary']);
          worksheet.getRow(4).font = { bold: true };
          
          if (report.summary) {
            Object.entries(report.summary).forEach(([key, value]) => {
              const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
              
              worksheet.addRow([formattedKey, value]);
            });
          }
          
          // Add specific data based on report type
          if (reportType === 'customer-list' || reportType === 'list') {
            // Add customer list data
            worksheet.addRow([]);
            worksheet.addRow(['Customer List']);
            worksheet.getRow(worksheet.rowCount).font = { bold: true };
            
            const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Credit Limit', 'Status'];
            worksheet.addRow(headers);
            worksheet.getRow(worksheet.rowCount).font = { bold: true };
            
            if (report.customers && report.customers.length > 0) {
              report.customers.forEach(customer => {
                worksheet.addRow([
                  customer.customerId,
                  customer.name,
                  customer.email,
                  customer.phone,
                  customer.creditLimit || 0,
                  customer.status
                ]);
              });
            }
          } else if (reportType === 'outstanding-invoices') {
            // Add invoice data
            worksheet.addRow([]);
            worksheet.addRow(['Outstanding Invoices']);
            worksheet.getRow(worksheet.rowCount).font = { bold: true };
            
            const headers = ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Total Amount', 'Amount Due', 'Days Overdue'];
            worksheet.addRow(headers);
            worksheet.getRow(worksheet.rowCount).font = { bold: true };
            
            if (report.invoices && report.invoices.length > 0) {
              report.invoices.forEach(invoice => {
                worksheet.addRow([
                  invoice.invoiceNumber,
                  invoice.customer,
                  moment(invoice.issueDate).format('YYYY-MM-DD'),
                  moment(invoice.dueDate).format('YYYY-MM-DD'),
                  invoice.totalAmount,
                  invoice.amountDue,
                  invoice.daysOverdue
                ]);
              });
            }
          }
          
          // Format the cells
          worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) {
                maxLength = columnLength;
              }
            });
            column.width = maxLength < 10 ? 10 : maxLength;
          });
          
          // Generate Excel file
          const buffer = await workbook.xlsx.writeBuffer();
          
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="customer-${reportType}-${startDate}-to-${endDate}.xlsx"`);
          return res.send(buffer);
        } catch (excelError) {
          console.error('Error generating Excel file:', excelError);
          return res.status(500).json({
            success: false,
            error: 'Error generating Excel report'
          });
        }

      case 'json':
      default:
        // Return JSON
        return res.json({
          success: true,
          data: report
        });
    }
  } catch (err) {
    console.error('Error generating customer report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Helper function to generate customer list report
 */
async function generateCustomerListReport(includeDetails) {
  // Get all customers
  const customers = await Customer.find({});

  // Calculate summary data
  const summary = {
    totalCustomers: customers.length,
    individualCustomers: customers.filter(c => !c.isCompany).length,
    companyCustomers: customers.filter(c => c.isCompany).length,
    customersWithCredit: customers.filter(c => c.creditAccount && c.creditAccount.creditLimit > 0).length
  };

  // Format customers for detailed view
  const formattedCustomers = customers.map(customer => ({
    id: customer._id,
    customerId: customer.customerId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    isCompany: customer.isCompany,
    creditLimit: customer.creditAccount ? customer.creditAccount.creditLimit : 0,
    currentBalance: customer.creditAccount ? customer.creditAccount.currentBalance : 0,
    status: customer.status,
    registrationDate: customer.createdAt
  }));

  return {
    reportType: 'Customer List Report',
    summary,
    customers: includeDetails ? formattedCustomers : []
  };
}

/**
 * Helper function to generate credit customers report
 */
async function generateCreditCustomersReport(includeDetails) {
  // Get all customers with credit accounts
  const customers = await Customer.find({
    'creditAccount.creditLimit': { $gt: 0 }
  });

  // Calculate summary data
  const summary = {
    totalCreditCustomers: customers.length,
    totalCreditLimit: customers.reduce((sum, customer) => 
      sum + (customer.creditAccount ? customer.creditAccount.creditLimit : 0), 0
    ),
    totalOutstandingBalance: customers.reduce((sum, customer) => 
      sum + (customer.creditAccount ? customer.creditAccount.currentBalance : 0), 0
    ),
    averageCreditLimit: customers.length > 0 ? 
      customers.reduce((sum, customer) => 
        sum + (customer.creditAccount ? customer.creditAccount.creditLimit : 0), 0
      ) / customers.length : 0
  };

  // Format customers for detailed view
  const formattedCustomers = customers.map(customer => ({
    id: customer._id,
    customerId: customer.customerId,
    name: customer.name,
    isCompany: customer.isCompany,
    creditLimit: customer.creditAccount ? customer.creditAccount.creditLimit : 0,
    currentBalance: customer.creditAccount ? customer.creditAccount.currentBalance : 0,
    availableCredit: customer.creditAccount ? 
      customer.creditAccount.creditLimit - customer.creditAccount.currentBalance : 0,
    utilizationPercentage: customer.creditAccount && customer.creditAccount.creditLimit > 0 ? 
      (customer.creditAccount.currentBalance / customer.creditAccount.creditLimit) * 100 : 0,
    lastPaymentDate: customer.creditAccount ? customer.creditAccount.lastPaymentDate : null,
    status: customer.creditAccount ? customer.creditAccount.status : 'Inactive'
  }));

  return {
    reportType: 'Credit Customers Report',
    summary,
    customers: includeDetails ? formattedCustomers : []
  };
}

/**
 * Helper function to generate outstanding invoices report
 */
async function generateOutstandingInvoicesReport(startDate, endDate, customerId, includeDetails) {
  // Build query
  const query = {
    paymentStatus: { $in: ['Unpaid', 'Partial', 'Overdue'] },
    issueDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (customerId) {
    query.customerId = customerId;
  }

  // Get outstanding invoices
  const invoices = await Invoice.find(query)
    .populate('customerId', 'name customerId');

  // Calculate summary data
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalAmountDue = invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);
  
  const summary = {
    totalInvoices: invoices.length,
    totalAmount,
    totalAmountDue,
    percentageOutstanding: totalAmount > 0 ? (totalAmountDue / totalAmount) * 100 : 0,
    overdueInvoices: invoices.filter(invoice => 
      invoice.paymentStatus === 'Overdue' || 
      (invoice.dueDate < new Date() && invoice.amountDue > 0)
    ).length
  };

  // Group by customer
  const byCustomer = {};
  invoices.forEach(invoice => {
    const customerId = invoice.customerId._id.toString();
    
    if (!byCustomer[customerId]) {
      byCustomer[customerId] = {
        customerId: invoice.customerId._id,
        name: invoice.customerId.name,
        invoiceCount: 0,
        totalAmount: 0,
        totalAmountDue: 0
      };
    }
    
    byCustomer[customerId].invoiceCount += 1;
    byCustomer[customerId].totalAmount += invoice.totalAmount;
    byCustomer[customerId].totalAmountDue += invoice.amountDue;
  });

  // Format invoices for detailed view
  const formattedInvoices = invoices.map(invoice => {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = dueDate < now ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customerId.name,
      customerId: invoice.customerId._id,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      paymentStatus: invoice.paymentStatus,
      daysOverdue
    };
  });

  return {
    reportType: 'Outstanding Invoices Report',
    summary,
    byCustomer: Object.values(byCustomer),
    invoices: includeDetails ? formattedInvoices : []
  };
}

/**
 * Helper function to generate customer aging report
 */
async function generateCustomerAgingReport(includeDetails) {
  // Get all outstanding invoices
  const invoices = await Invoice.find({
    paymentStatus: { $in: ['Unpaid', 'Partial', 'Overdue'] }
  }).populate('customerId', 'name customerId');

  // Group invoices by aging buckets
  const agingBuckets = {
    'current': 0, // Not yet due
    '1-30': 0, // 1-30 days overdue
    '31-60': 0, // 31-60 days overdue
    '61-90': 0, // 61-90 days overdue
    '90+': 0 // 90+ days overdue
  };

  const customerAging = {};
  const now = new Date();
  
  // Process each invoice
  invoices.forEach(invoice => {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = dueDate < now ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
    let bucket = 'current';
    
    if (daysOverdue > 0) {
      if (daysOverdue <= 30) bucket = '1-30';
      else if (daysOverdue <= 60) bucket = '31-60';
      else if (daysOverdue <= 90) bucket = '61-90';
      else bucket = '90+';
    } // <-- Missing closing curly brace was here
    
    // Add to aging buckets total
    agingBuckets[bucket] += invoice.amountDue;
    
    // Add to customer aging data
    const customerId = invoice.customerId._id.toString();
    
    if (!customerAging[customerId]) {
      customerAging[customerId] = {
        customerId: invoice.customerId._id,
        name: invoice.customerId.name,
        total: 0,
        buckets: {
          'current': 0,
          '1-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0
        }
      };
    }
    
    customerAging[customerId].buckets[bucket] += invoice.amountDue;
    customerAging[customerId].total += invoice.amountDue;
  });

  // Calculate summary data
  const totalOutstanding = Object.values(agingBuckets).reduce((sum, amount) => sum + amount, 0);
  
  const summary = {
    totalOutstanding,
    agingBuckets,
    customerCount: Object.keys(customerAging).length,
    highRiskAmount: agingBuckets['61-90'] + agingBuckets['90+'],
    highRiskPercentage: totalOutstanding > 0 ? 
      ((agingBuckets['61-90'] + agingBuckets['90+']) / totalOutstanding) * 100 : 0
  };

  return {
    reportType: 'Customer Aging Report',
    summary,
    agingBuckets,
    customerAging: includeDetails ? Object.values(customerAging) : []
  };
}

/**
 * Helper function to generate top customers report
 */
async function generateTopCustomersReport(startDate, endDate, includeDetails) {
  // Get sales data for the period
  const sales = await Sales.find({
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    customerId: { $ne: null }
  }).populate('customerId', 'name customerId');

  // Group sales by customer
  const customerSales = {};
  
  sales.forEach(sale => {
    if (sale.customerId) {
      const customerId = typeof sale.customerId === 'object' ? 
        sale.customerId._id.toString() : 
        sale.customerId.toString();
      
      if (!customerSales[customerId]) {
        customerSales[customerId] = {
          customerId: sale.customerId,
          name: typeof sale.customerId === 'object' ? sale.customerId.name : 'Unknown',
          saleCount: 0,
          totalAmount: 0,
          totalQuantity: 0,
          sales: []
        };
      }
      
      customerSales[customerId].saleCount += 1;
      customerSales[customerId].totalAmount += sale.totalAmount;
      customerSales[customerId].totalQuantity += sale.quantity;
      customerSales[customerId].sales.push(sale);
    }
  });

  // Sort customers by total amount
  const topCustomers = Object.values(customerSales)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 20);

  // Calculate summary data
  const totalSales = sales.length;
  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalCustomers = Object.keys(customerSales).length;
  
  const summary = {
    totalSales,
    totalAmount,
    totalCustomers,
    topCustomerShare: totalAmount > 0 && topCustomers.length > 0 ? 
      (topCustomers[0].totalAmount / totalAmount) * 100 : 0,
    top10Share: totalAmount > 0 ? 
      (topCustomers.slice(0, 10).reduce((sum, c) => sum + c.totalAmount, 0) / totalAmount) * 100 : 0
  };

  return {
    reportType: 'Top Customers Report',
    summary,
    topCustomers: topCustomers.map(customer => ({
      customerId: customer.customerId,
      name: customer.name,
      saleCount: customer.saleCount,
      totalAmount: customer.totalAmount,
      totalQuantity: customer.totalQuantity,
      averageSaleAmount: customer.saleCount > 0 ? customer.totalAmount / customer.saleCount : 0,
      percentageOfTotal: totalAmount > 0 ? (customer.totalAmount / totalAmount) * 100 : 0
    })),
    details: includeDetails ? topCustomers.map(customer => ({
      customerId: customer.customerId,
      name: customer.name,
      saleCount: customer.saleCount,
      totalAmount: customer.totalAmount,
      sales: customer.sales.map(sale => ({
        id: sale._id,
        saleId: sale.saleId,
        date: sale.date,
        fuelType: sale.fuelType,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod
      }))
    })) : []
  };
}

/**
 * @desc    Generate banking report
 * @route   GET /api/reports/banking
 * @access  Private
 */
exports.generateBankingReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      reportType = 'bank-accounts-summary',
      bankAccountId,
      format = 'json',
      includeDetails = true
    } = req.query;

    // Handle different banking report types
    let report;
    
    switch (reportType) {
      case 'bank-accounts-summary':
        report = await generateBankAccountsSummaryReport(includeDetails);
        break;
        
      case 'bank-transactions':
        report = await generateBankTransactionsReport(startDate, endDate, bankAccountId, includeDetails);
        break;
        
      case 'reconciliation-report':
        report = await generateReconciliationReport(startDate, endDate, bankAccountId, includeDetails);
        break;
        
      case 'petty-cash':
        report = await generatePettyCashReport(startDate, endDate, includeDetails);
        break;
        
      default:
        report = await generateBankAccountsSummaryReport(includeDetails);
    }

    // Add generation metadata
    report.generatedAt = new Date();
    report.generatedBy = req.user ? req.user.name : 'System';
    report.period = { startDate, endDate };

    // Return report in requested format
   // This is the code to be inserted into the reportController.js file
// to enable PDF generation functionality

const { generatePDFReport } = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

// For the generateSalesReport method
// Replace the existing switch (format) case with this:

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
    // Generate PDF using the utility
    try {
      reportData.generatedOn = new Date();
      reportData.generatedBy = req.user ? req.user.name : 'System';
      
      const pdfBuffer = await generatePDFReport(reportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return res.status(500).json({
        success: false,
        error: 'Error generating PDF report'
      });
    }

  case 'xlsx':
    // Generate Excel file
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Fuel Station Management System';
      workbook.created = new Date();
      
      // Create a worksheet
      const worksheet = workbook.addWorksheet('Sales Report');
      
      // Add title
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = reportData.reportType;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add period
      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = `Period: ${moment(startDate).format('MMM DD, YYYY')} to ${moment(endDate).format('MMM DD, YYYY')}`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Add summary section
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      worksheet.getRow(4).font = { bold: true };
      
      if (reportData.summary) {
        Object.entries(reportData.summary).forEach(([key, value], index) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          
          worksheet.addRow([formattedKey, value]);
        });
      }
      
      // Add sales data if available
      if (sales && sales.length > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['Transactions']);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add headers
        const headers = ['Sale ID', 'Date', 'Fuel Type', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Method', 'Customer'];
        worksheet.addRow(headers);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add data rows
        sales.forEach(sale => {
          worksheet.addRow([
            sale.saleId,
            moment(sale.date).format('YYYY-MM-DD'),
            sale.fuelType,
            sale.quantity,
            sale.unitPrice,
            sale.totalAmount,
            sale.paymentMethod,
            sale.customerId ? (typeof sale.customerId === 'object' ? sale.customerId.name : sale.customerId) : ''
          ]);
        });
        
        // Format the cells
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength;
        });
      }
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${startDate}-to-${endDate}.xlsx"`);
      return res.send(buffer);
    } catch (excelError) {
      console.error('Error generating Excel file:', excelError);
      return res.status(500).json({
        success: false,
        error: 'Error generating Excel report'
      });
    }

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

// Similar changes should be made to the other report generation functions (generateFinancialReport, generateInventoryReport, etc.)
// to use the PDF generator for PDF format and Excel.js for XLSX format.

  } catch (err) {
    console.error('Error generating banking report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * Helper function to generate bank accounts summary report
 */
async function generateBankAccountsSummaryReport(includeDetails) {
  // Get all bank accounts
  const bankAccounts = await BankAccount.find({});

  // Calculate summary data
  const totalCurrentBalance = bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const totalOpeningBalance = bankAccounts.reduce((sum, account) => sum + account.openingBalance, 0);
  
  const summary = {
    accountCount: bankAccounts.length,
    totalCurrentBalance,
    totalOpeningBalance,
    netChange: totalCurrentBalance - totalOpeningBalance,
    percentageChange: totalOpeningBalance > 0 ? 
      ((totalCurrentBalance - totalOpeningBalance) / totalOpeningBalance) * 100 : 0
  };

  // Format accounts for detailed view
  const formattedAccounts = bankAccounts.map(account => ({
    id: account._id,
    accountId: account.accountId,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    accountHolderName: account.accountHolderName,
    branchName: account.branchName,
    openingBalance: account.openingBalance,
    currentBalance: account.currentBalance,
    availableCredit: account.accountType === 'Credit Card' ? account.creditLimit - account.currentBalance : null,
    netChange: account.currentBalance - account.openingBalance,
    percentageChange: account.openingBalance > 0 ? 
      ((account.currentBalance - account.openingBalance) / account.openingBalance) * 100 : 0,
    status: account.isActive ? 'Active' : 'Inactive',
    lastUpdated: account.updatedAt
  }));

  return {
    reportType: 'Bank Accounts Summary Report',
    summary,
    accounts: includeDetails ? formattedAccounts : []
  };
}

/**
 * Helper function to generate bank transactions report
 */
async function generateBankTransactionsReport(startDate, endDate, bankAccountId, includeDetails) {
  // Build query
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (bankAccountId) {
    query.accountId = bankAccountId;
  }

  // Get transactions
  const transactions = await BankTransaction.find(query)
    .populate('accountId', 'bankName accountNumber')
    .sort({ date: 1 });

  // Group by transaction type
  const byType = {};
  transactions.forEach(tx => {
    if (!byType[tx.type]) {
      byType[tx.type] = {
        count: 0,
        amount: 0
      };
    }
    byType[tx.type].count += 1;
    byType[tx.type].amount += tx.amount;
  });

  // Group by category
  const byCategory = {};
  transactions.forEach(tx => {
    if (!byCategory[tx.category]) {
      byCategory[tx.category] = {
        count: 0,
        amount: 0
      };
    }
    byCategory[tx.category].count += 1;
    byCategory[tx.category].amount += tx.amount;
  });

  // Calculate net inflow/outflow
  const inflow = transactions
    .filter(tx => ['deposit', 'transfer', 'interest'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const outflow = transactions
    .filter(tx => ['withdrawal', 'charge', 'fee'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate summary data
  const summary = {
    transactionCount: transactions.length,
    totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    inflow,
    outflow,
    netCashFlow: inflow - outflow,
    byType,
    byCategory
  };

  // Format transactions for detailed view
  const formattedTransactions = transactions.map(tx => ({
    id: tx._id,
    transactionId: tx.transactionId,
    accountId: tx.accountId._id,
    accountName: `${tx.accountId.bankName} - ${tx.accountId.accountNumber}`,
    date: tx.date,
    type: tx.type,
    category: tx.category,
    description: tx.description,
    amount: tx.amount,
    reference: tx.reference,
    balanceAfterTransaction: tx.balanceAfterTransaction,
    isReconciled: tx.isReconciled
  }));

  return {
    reportType: 'Bank Transactions Report',
    summary,
    byType: Object.keys(byType).map(type => ({
      type,
      count: byType[type].count,
      amount: byType[type].amount,
      percentage: transactions.length > 0 ? 
        (byType[type].count / transactions.length) * 100 : 0
    })),
    byCategory: Object.keys(byCategory).map(category => ({
      category,
      count: byCategory[category].count,
      amount: byCategory[category].amount,
      percentage: transactions.length > 0 ? 
        (byCategory[category].count / transactions.length) * 100 : 0
    })),
    transactions: includeDetails ? formattedTransactions : []
  };
}

/**
 * Helper function to generate reconciliation report
 */
async function generateReconciliationReport(startDate, endDate, bankAccountId, includeDetails) {
  // Build query
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (bankAccountId) {
    query.accountId = bankAccountId;
  }

  // Get all transactions for the period
  const transactions = await BankTransaction.find(query)
    .populate('accountId', 'bankName accountNumber')
    .sort({ date: 1 });

  // Split into reconciled and unreconciled
  const reconciledTransactions = transactions.filter(tx => tx.isReconciled);
  const unreconciledTransactions = transactions.filter(tx => !tx.isReconciled);

  // Calculate summary data
  const reconciledAmount = reconciledTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const unreconciledAmount = unreconciledTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const summary = {
    totalTransactions: transactions.length,
    reconciledCount: reconciledTransactions.length,
    unreconciledCount: unreconciledTransactions.length,
    reconciledPercentage: transactions.length > 0 ? 
      (reconciledTransactions.length / transactions.length) * 100 : 0,
    reconciledAmount,
    unreconciledAmount,
    oldestUnreconciled: unreconciledTransactions.length > 0 ? 
      unreconciledTransactions[0].date : null
  };

  // Group by account
  const byAccount = {};
  transactions.forEach(tx => {
    const accountId = tx.accountId._id.toString();
    
    if (!byAccount[accountId]) {
      byAccount[accountId] = {
        accountId: tx.accountId._id,
        accountName: `${tx.accountId.bankName} - ${tx.accountId.accountNumber}`,
        totalCount: 0,
        reconciledCount: 0,
        unreconciledCount: 0,
        reconciledAmount: 0,
        unreconciledAmount: 0
      };
    }
    
    byAccount[accountId].totalCount += 1;
    
    if (tx.isReconciled) {
      byAccount[accountId].reconciledCount += 1;
      byAccount[accountId].reconciledAmount += tx.amount;
    } else {
      byAccount[accountId].unreconciledCount += 1;
      byAccount[accountId].unreconciledAmount += tx.amount;
    }
  });

  return {
    reportType: 'Bank Reconciliation Report',
    summary,
    byAccount: Object.values(byAccount),
    unreconciledTransactions: includeDetails ? unreconciledTransactions.map(tx => ({
      id: tx._id,
      transactionId: tx.transactionId,
      accountId: tx.accountId._id,
      accountName: `${tx.accountId.bankName} - ${tx.accountId.accountNumber}`,
      date: tx.date,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount: tx.amount,
      reference: tx.reference
    })) : []
  };
}

/**
 * Helper function to generate petty cash report
 */
async function generatePettyCashReport(startDate, endDate, includeDetails) {
  // Use the utility function to generate petty cash reports
  const params = {
    startDate,
    endDate,
    format: 'json'
  };
  
  const transactionReport = await pettyCashReportGenerator.generateTransactionReport(params);
  const balanceReport = await pettyCashReportGenerator.generateBalanceReport();
  
  // Combine the reports
  return {
    reportType: 'Petty Cash Report',
    transactionSummary: transactionReport.summary,
    balanceSummary: balanceReport.summary,
    stationBalances: balanceReport.stationBalances,
    transactions: includeDetails ? transactionReport.transactions : []
  };
}

/**
 * @desc    Generate petty cash transaction report
 * @route   GET /api/reports/petty-cash/transactions
 * @access  Private
 */
exports.generatePettyCashTransactionReport = async (req, res) => {
  try {
    const {
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      stationId,
      transactionType,
      category,
      format = 'json'
    } = req.query;

    const reportOptions = {
      startDate,
      endDate,
      stationId,
      transactionType,
      category,
      format
    };

    const report = await pettyCashReportGenerator.generateTransactionReport(reportOptions);

    // Return report in requested format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="petty-cash-transactions-${startDate}-to-${endDate}.csv"`);
      return res.send(report.content);
    } else if (format === 'pdf') {
      return res.json({
        success: true,
        data: report,
        message: 'PDF report data ready for generation'
      });
    } else {
      return res.json({
        success: true,
        data: report
      });
    }
  } catch (err) {
    console.error('Error generating petty cash transaction report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Generate petty cash balance report
 * @route   GET /api/reports/petty-cash/balance
 * @access  Private
 */
exports.generatePettyCashBalanceReport = async (req, res) => {
  try {
    const reportDate = req.query.reportDate || new Date();
    const format = req.query.format || 'json';

    const report = await pettyCashReportGenerator.generateBalanceReport(reportDate);

    // Return report in requested format
    if (format === 'pdf') {
      return res.json({
        success: true,
        data: report,
        message: 'PDF report data ready for generation'
      });
    } else {
      return res.json({
        success: true,
        data: report
      });
    }
  } catch (err) {
    console.error('Error generating petty cash balance report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Generate petty cash replenishment recommendation report
 * @route   GET /api/reports/petty-cash/replenishment-recommendation
 * @access  Private
 */
exports.generatePettyCashReplenishmentReport = async (req, res) => {
  try {
    const format = req.query.format || 'json';

    const report = await pettyCashReportGenerator.generateReplenishmentRecommendationReport();

    // Return report in requested format
    if (format === 'pdf') {
      return res.json({
        success: true,
        data: report,
        message: 'PDF report data ready for generation'
      });
    } else {
      return res.json({
        success: true,
        data: report
      });
    }
  } catch (err) {
    console.error('Error generating petty cash replenishment report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Schedule a report
 * @route   POST /api/reports/schedule
 * @access  Private
 */
exports.scheduleReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      reportType,
      frequency,
      recipients,
      format,
      filters
    } = req.body;

    // TODO: Implement report scheduling functionality
    // This would typically involve creating a scheduled task in a database
    // For now, we'll return a success message

    res.json({
      success: true,
      message: 'Report scheduled successfully',
      data: {
        reportType,
        frequency,
        recipients,
        format,
        filters,
        scheduledBy: req.user.id,
        scheduledAt: new Date()
      }
    });
  } catch (err) {
    console.error('Error scheduling report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get scheduled reports
 * @route   GET /api/reports/schedule
 * @access  Private
 */
exports.getScheduledReports = async (req, res) => {
  try {
    // TODO: Implement retrieving scheduled reports
    // For now, return empty array
    
    res.json({
      success: true,
      data: []
    });
  } catch (err) {
    console.error('Error getting scheduled reports:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Delete a scheduled report
 * @route   DELETE /api/reports/schedule/:id
 * @access  Private
 */
exports.deleteScheduledReport = async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Implement deleting scheduled report
    // For now, return success
    
    res.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting scheduled report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};