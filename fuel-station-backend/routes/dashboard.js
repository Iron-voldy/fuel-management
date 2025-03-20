const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

/**
 * @route   GET api/dashboard/financial-summary
 * @desc    Get financial dashboard summary
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/financial-summary', auth, dashboardController.getFinancialSummary);

/**
 * @route   GET api/dashboard/profit-loss
 * @desc    Get profit and loss statement
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/profit-loss', auth, dashboardController.getProfitLossStatement);

/**
 * @route   GET api/dashboard/balance-sheet
 * @desc    Get balance sheet data
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/balance-sheet', auth, dashboardController.getBalanceSheet);

/**
 * @route   GET api/dashboard/cash-flow
 * @desc    Get cash flow statement
 * @access  Private (Admin/Manager/Accountant)
 */
router.get('/cash-flow', auth, dashboardController.getCashFlowStatement);

/**
 * @route   GET api/dashboard/fuel-price-analysis
 * @desc    Get fuel price and profit margin analysis
 * @access  Private (Admin/Manager)
 */
router.get('/fuel-price-analysis', auth, dashboardController.getFuelPriceAnalysis);

module.exports = router;