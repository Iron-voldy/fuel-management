const moment = require('moment');
const mongoose = require('mongoose');
const Sales = require('../models/Sales');
const Expense = require('../models/Expense');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const PettyCashBalance = require('../models/PettyCashBalance');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');

/**
 * @desc    Get financial dashboard summary
 * @route   GET /api/dashboard/financial-summary
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    // Get query parameters
    const {
      period = 'month',
      stationId,
      startDate: queryStartDate,
      endDate: queryEndDate
    } = req.query;

    // Determine date range based on period
    const today = new Date();
    let startDate, endDate = today;

    if (!queryStartDate) {
      switch(period) {
        case 'day':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - startDate.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    } else {
      startDate = new Date(queryStartDate);
    }

    if (queryEndDate) {
      endDate = new Date(queryEndDate);
    }

    // Build filter object
    const dateFilter = {
      date: { $gte: startDate, $lte: endDate }
    };

    if (stationId) {
      dateFilter.stationId = stationId;
    }

    // 1. Get Sales Data with safe error handling
    let salesData = {
      summary: {
        totalSales: 0,
        totalQuantity: 0,
        salesCount: 0,
        averageSaleAmount: 0
      },
      topSellingFuels: [],
      recentSales: []
    };
    
    try {
      salesData = await getSalesData(dateFilter);
    } catch (err) {
      console.error('Error fetching sales data:', err.message);
      // Continue execution with default empty data
    }

    // 2. Get Expense Data with safe error handling
    let expenseData = {
      summary: {
        totalExpenses: 0,
        expenseCount: 0,
        averageExpenseAmount: 0
      },
      topCategories: [],
      recentExpenses: []
    };
    
    try {
      expenseData = await getExpenseData(dateFilter);
    } catch (err) {
      console.error('Error fetching expense data:', err.message);
      // Continue execution with default empty data
    }

    // 3. Get Cash Position Data with safe error handling
    let cashPosition = {
      bankAccounts: [],
      totalBankBalance: 0,
      pettyCash: [],
      totalPettyCash: 0,
      totalCashPosition: 0
    };
    
    try {
      cashPosition = await getCashPosition(stationId);
    } catch (err) {
      console.error('Error fetching cash position data:', err.message);
      // Continue execution with default empty data
    }

    // 4. Get Financial Ratios
    const financialRatios = calculateFinancialRatios(salesData, expenseData);

    // 5. Get Performance Metrics with safe error handling
    let performanceMetrics = {
      currentPeriod: {
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0
      },
      previousPeriod: {
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0
      },
      changes: {
        revenueChange: 0,
        expenseChange: 0,
        profitChange: 0
      }
    };
    
    try {
      performanceMetrics = await getPerformanceMetrics(dateFilter, period);
    } catch (err) {
      console.error('Error fetching performance metrics:', err.message);
      // Continue execution with default empty data
    }

    // 6. Get Staff Metrics with safe error handling
    let staffMetrics = {
      employeeCount: 0,
      payroll: {
        totalBasicSalary: 0,
        totalAllowances: 0,
        totalSalaryExpense: 0
      },
      loans: {
        activeLoansCount: 0,
        totalOutstandingAmount: 0
      }
    };
    
    try {
      staffMetrics = await getStaffMetrics(stationId);
    } catch (err) {
      console.error('Error fetching staff metrics:', err.message);
      // Continue execution with default empty data
    }

    // Prepare the final response
    const dashboardData = {
      period: {
        name: period,
        startDate: startDate,
        endDate: endDate
      },
      salesSummary: salesData.summary,
      topSellingFuels: salesData.topSellingFuels,
      expenseSummary: expenseData.summary,
      topExpenseCategories: expenseData.topCategories,
      profitSummary: {
        revenue: salesData.summary.totalSales,
        expenses: expenseData.summary.totalExpenses,
        grossProfit: salesData.summary.totalSales - expenseData.summary.totalExpenses,
        profitMargin: salesData.summary.totalSales > 0 ? 
          ((salesData.summary.totalSales - expenseData.summary.totalExpenses) / salesData.summary.totalSales) * 100 : 0
      },
      cashPosition,
      financialRatios,
      performanceMetrics,
      staffMetrics,
      recentActivity: {
        sales: salesData.recentSales,
        expenses: expenseData.recentExpenses
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message
    });
  }
};

// ------ HELPER FUNCTIONS ------

/**
 * Get sales data for dashboard
 * @param {Object} dateFilter - Date filter object
 * @returns {Object} - Sales data
 */
async function getSalesData(dateFilter) {
  try {
    // Check if Sales model exists
    if (!Sales) {
      throw new Error('Sales model not found');
    }

    // Get sales with validation
    const sales = await Sales.find(dateFilter).sort({ date: -1 }).catch(err => {
      console.error('Error querying Sales collection:', err.message);
      return [];
    });
    
    // Calculate total sales
    const totalSales = sales.reduce((sum, sale) => sum + (parseFloat(sale.totalAmount) || 0), 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + (parseFloat(sale.quantity) || 0), 0);
    
    // Group by fuel type
    const salesByFuelType = sales.reduce((acc, sale) => {
      const fuelType = sale.fuelType || 'Unknown';
      if (!acc[fuelType]) {
        acc[fuelType] = {
          quantity: 0,
          amount: 0,
          count: 0
        };
      }
      
      acc[fuelType].quantity += parseFloat(sale.quantity) || 0;
      acc[fuelType].amount += parseFloat(sale.totalAmount) || 0;
      acc[fuelType].count += 1;
      
      return acc;
    }, {});
    
    // Get top selling fuels
    const topSellingFuels = Object.entries(salesByFuelType)
      .map(([fuelType, data]) => ({
        fuelType,
        quantity: data.quantity,
        amount: data.amount,
        count: data.count,
        percentage: totalSales > 0 ? (data.amount / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Get recent sales (limit to 5)
    const recentSales = sales.slice(0, 5).map(sale => ({
      id: sale._id,
      saleId: sale.saleId || 'N/A',
      date: sale.date,
      fuelType: sale.fuelType || 'Unknown',
      quantity: parseFloat(sale.quantity) || 0,
      totalAmount: parseFloat(sale.totalAmount) || 0,
      paymentMethod: sale.paymentMethod || 'Unknown'
    }));
    
    return {
      summary: {
        totalSales,
        totalQuantity,
        salesCount: sales.length,
        averageSaleAmount: sales.length > 0 ? totalSales / sales.length : 0
      },
      topSellingFuels,
      recentSales
    };
  } catch (error) {
    console.error('Error in getSalesData:', error);
    throw error;
  }
}

/**
 * Get expense data for dashboard
 * @param {Object} dateFilter - Date filter object
 * @returns {Object} - Expense data
 */
async function getExpenseData(dateFilter) {
  try {
    // Check if Expense model exists
    if (!Expense) {
      throw new Error('Expense model not found');
    }

    // Add approval status to filter
    const expenseFilter = {
      ...dateFilter,
      approvalStatus: 'Approved'
    };
    
    // Get expenses with validation
    const expenses = await Expense.find(expenseFilter).sort({ date: -1 }).catch(err => {
      console.error('Error querying Expense collection:', err.message);
      return [];
    });
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    
    // Group by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      
      acc[category] += parseFloat(expense.amount) || 0;
      
      return acc;
    }, {});
    
    // Get top expense categories
    const topCategories = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Get recent expenses (limit to 5)
    const recentExpenses = expenses.slice(0, 5).map(expense => ({
      id: expense._id,
      expenseId: expense.expenseId || 'N/A',
      date: expense.date,
      category: expense.category || 'Other',
      description: expense.description || '',
      amount: parseFloat(expense.amount) || 0,
      paymentMethod: expense.paymentMethod || 'Unknown'
    }));
    
    return {
      summary: {
        totalExpenses,
        expenseCount: expenses.length,
        averageExpenseAmount: expenses.length > 0 ? totalExpenses / expenses.length : 0
      },
      topCategories,
      recentExpenses
    };
  } catch (error) {
    console.error('Error in getExpenseData:', error);
    throw error;
  }
}

/**
 * Get cash position data
 * @param {String} stationId - Station ID (optional)
 * @returns {Object} - Cash position data
 */
async function getCashPosition(stationId) {
  try {
    // Check if BankAccount and PettyCashBalance models exist
    if (!BankAccount || !PettyCashBalance) {
      throw new Error('BankAccount or PettyCashBalance model not found');
    }

    // Prepare filter
    const filter = {};
    if (stationId) {
      filter.stationId = stationId;
    }
    
    // Get bank account balances with validation
    const bankAccounts = await BankAccount.find(filter).catch(err => {
      console.error('Error querying BankAccount collection:', err.message);
      return [];
    });
    
    const totalBankBalance = bankAccounts.reduce((sum, account) => sum + (parseFloat(account.currentBalance) || 0), 0);
    
    // Get petty cash balances with validation
    const pettyCashBalances = await PettyCashBalance.find(filter).catch(err => {
      console.error('Error querying PettyCashBalance collection:', err.message);
      return [];
    });
    
    const totalPettyCash = pettyCashBalances.reduce((sum, balance) => sum + (parseFloat(balance.currentBalance) || 0), 0);
    
    // Calculate total cash position
    const totalCashPosition = totalBankBalance + totalPettyCash;
    
    return {
      bankAccounts: bankAccounts.map(account => ({
        id: account._id,
        accountName: account.accountName || 'No Name',
        bankName: account.bankName || 'Unknown Bank',
        balance: parseFloat(account.currentBalance) || 0
      })),
      totalBankBalance,
      pettyCash: pettyCashBalances.map(balance => ({
        stationId: balance.stationId || 'Unknown',
        balance: parseFloat(balance.currentBalance) || 0
      })),
      totalPettyCash,
      totalCashPosition
    };
  } catch (error) {
    console.error('Error in getCashPosition:', error);
    throw error;
  }
}

/**
 * Calculate financial ratios
 * @param {Object} salesData - Sales data object
 * @param {Object} expenseData - Expense data object
 * @returns {Object} - Financial ratios
 */
function calculateFinancialRatios(salesData, expenseData) {
  try {
    const revenue = salesData.summary.totalSales || 0;
    const expenses = expenseData.summary.totalExpenses || 0;
    const profit = revenue - expenses;
    
    return {
      profitability: {
        grossProfitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        operatingExpenseRatio: revenue > 0 ? (expenses / revenue) * 100 : 0
      }
    };
  } catch (error) {
    console.error('Error in calculateFinancialRatios:', error);
    return {
      profitability: {
        grossProfitMargin: 0,
        operatingExpenseRatio: 0
      }
    };
  }
}

/**
 * Get performance metrics
 * @param {Object} dateFilter - Date filter object
 * @param {String} period - Period (day, week, month, quarter, year)
 * @returns {Object} - Performance metrics
 */
async function getPerformanceMetrics(dateFilter, period) {
  try {
    // Check if Sales and Expense models exist
    if (!Sales || !Expense) {
      throw new Error('Sales or Expense model not found');
    }

    // Get sales for current period with validation
    const currentPeriodSales = await Sales.find(dateFilter).catch(err => {
      console.error('Error querying Sales for current period:', err.message);
      return [];
    });
    
    const currentPeriodRevenue = currentPeriodSales.reduce((sum, sale) => sum + (parseFloat(sale.totalAmount) || 0), 0);
    
    // Get expenses for current period with validation
    const currentPeriodExpenses = await Expense.find({
      ...dateFilter,
      approvalStatus: 'Approved'
    }).catch(err => {
      console.error('Error querying Expenses for current period:', err.message);
      return [];
    });
    
    const currentPeriodExpenseTotal = currentPeriodExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    
    // Calculate profit for current period
    const currentPeriodProfit = currentPeriodRevenue - currentPeriodExpenseTotal;
    
    // Calculate previous period dates
    const { startDate, endDate } = dateFilter.date;
    const duration = endDate - startDate;
    const previousPeriodEndDate = new Date(startDate);
    const previousPeriodStartDate = new Date(previousPeriodEndDate - duration);
    
    // Get sales for previous period with validation
    const previousPeriodSales = await Sales.find({
      date: {
        $gte: previousPeriodStartDate,
        $lt: startDate
      }
    }).catch(err => {
      console.error('Error querying Sales for previous period:', err.message);
      return [];
    });
    
    const previousPeriodRevenue = previousPeriodSales.reduce((sum, sale) => sum + (parseFloat(sale.totalAmount) || 0), 0);
    
    // Get expenses for previous period with validation
    const previousPeriodExpenses = await Expense.find({
      date: {
        $gte: previousPeriodStartDate,
        $lt: startDate
      },
      approvalStatus: 'Approved'
    }).catch(err => {
      console.error('Error querying Expenses for previous period:', err.message);
      return [];
    });
    
    const previousPeriodExpenseTotal = previousPeriodExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    
    // Calculate profit for previous period
    const previousPeriodProfit = previousPeriodRevenue - previousPeriodExpenseTotal;
    
    // Calculate changes
    const revenueChange = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 100;
    
    const expenseChange = previousPeriodExpenseTotal > 0 
      ? ((currentPeriodExpenseTotal - previousPeriodExpenseTotal) / previousPeriodExpenseTotal) * 100 
      : 100;
    
    const profitChange = previousPeriodProfit > 0 
      ? ((currentPeriodProfit - previousPeriodProfit) / previousPeriodProfit) * 100 
      : 100;
    
    return {
      currentPeriod: {
        revenue: currentPeriodRevenue,
        expenses: currentPeriodExpenseTotal,
        profit: currentPeriodProfit,
        profitMargin: currentPeriodRevenue > 0 ? (currentPeriodProfit / currentPeriodRevenue) * 100 : 0
      },
      previousPeriod: {
        revenue: previousPeriodRevenue,
        expenses: previousPeriodExpenseTotal,
        profit: previousPeriodProfit,
        profitMargin: previousPeriodRevenue > 0 ? (previousPeriodProfit / previousPeriodRevenue) * 100 : 0
      },
      changes: {
        revenueChange,
        expenseChange,
        profitChange
      }
    };
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    throw error;
  }
}

/**
 * Get staff metrics
 * @param {String} stationId - Station ID (optional)
 * @returns {Object} - Staff metrics
 */
async function getStaffMetrics(stationId) {
  try {
    // Check if Employee and Loan models exist
    if (!Employee || !Loan) {
      throw new Error('Employee or Loan model not found');
    }

    // Prepare filter
    const filter = {};
    if (stationId) {
      filter.stationId = stationId;
    }
    
    // Get employee count with validation
    const employees = await Employee.find(filter).catch(err => {
      console.error('Error querying Employee collection:', err.message);
      return [];
    });
    
    const employeeCount = employees.length;
    
    // Calculate salary expenses with validation
    const totalBasicSalary = employees.reduce((sum, employee) => {
      return sum + (employee.salary && employee.salary.basic ? parseFloat(employee.salary.basic) : 0);
    }, 0);
    
    const totalAllowances = employees.reduce((sum, employee) => {
      const allowances = employee.salary && employee.salary.allowances ? employee.salary.allowances : [];
      return sum + allowances.reduce((allowanceSum, allowance) => {
        return allowanceSum + (parseFloat(allowance.amount) || 0);
      }, 0);
    }, 0);
    
    const totalSalaryExpense = totalBasicSalary + totalAllowances;
    
    // Get active loans with validation
    const activeLoans = await Loan.find({
      employeeId: { $in: employees.map(employee => employee._id) },
      status: 'active'
    }).catch(err => {
      console.error('Error querying Loan collection:', err.message);
      return [];
    });
    
    return {
      employeeCount,
      payroll: {
        totalBasicSalary,
        totalAllowances,
        totalSalaryExpense
      },
      loans: {
        activeLoansCount: activeLoans.length,
        totalOutstandingAmount: activeLoans.reduce((sum, loan) => sum + (parseFloat(loan.remainingAmount) || 0), 0)
      } 
    };
  } catch (error) {
    console.error('Error in getStaffMetrics:', error);
    throw error;
  }
}