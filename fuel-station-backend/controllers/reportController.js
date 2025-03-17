const moment = require('moment');
const { validationResult } = require('express-validator');
const bankBookReportGenerator = require('../utils/reportGenerator');
const pettyCashReportGenerator = require('../utils/pettyCashReportGenerator');

// Existing report controller functions...

// @desc    Generate petty cash transaction report
// @route   GET /api/reports/petty-cash/transactions
// @access  Private
exports.generatePettyCashTransactionReport = async (req, res) => {
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
      startDate = moment().startOf('month').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      transactionType,
      category,
      format = 'json'
    } = req.query;

    // Check if user has access to the station (for non-admin users)
    if (stationId && req.user.role !== 'admin' && req.user.stationId && req.user.stationId !== stationId) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access reports for this station'
      });
    }

    const report = await pettyCashReportGenerator.generateTransactionReport({
      stationId: stationId || req.user.stationId,
      startDate,
      endDate,
      transactionType,
      category,
      format
    });

    // Handle different formats
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="petty-cash-transactions-${startDate}-to-${endDate}.csv"`);
      return res.send(report.content);
    }

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Error generating petty cash transaction report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate petty cash balance report
// @route   GET /api/reports/petty-cash/balance
// @access  Private
exports.generatePettyCashBalanceReport = async (req, res) => {
  try {
    const { reportDate } = req.query;

    // Generate report
    const report = await pettyCashReportGenerator.generateBalanceReport(
      reportDate ? new Date(reportDate) : new Date()
    );

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Error generating petty cash balance report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Generate petty cash replenishment recommendation report
// @route   GET /api/reports/petty-cash/replenishment-recommendation
// @access  Private (Admin/Manager)
exports.generatePettyCashReplenishmentReport = async (req, res) => {
  // Only admins and managers can access this report
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this report'
    });
  }

  try {
    // Generate report
    const report = await pettyCashReportGenerator.generateReplenishmentRecommendationReport();

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Error generating petty cash replenishment report:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};