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
const calculationHelpers = require('../utils/calculationHelpers');

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

    // 1. Get Sales Data
    const salesData = await getSalesData(dateFilter);

    // 2. Get Expense Data
    const expenseData = await getExpenseData(dateFilter);

    // 3. Get Cash Position Data
    const cashPosition = await getCashPosition(stationId);

    // 4. Get Financial Ratios
    const financialRatios = calculateFinancialRatios(salesData, expenseData);

    // 5. Get Performance Metrics
    const performanceMetrics = await getPerformanceMetrics(dateFilter, period);

    // 6. Get Staff Metrics
    const staffMetrics = await getStaffMetrics(stationId);

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
    console.error('Error fetching dashboard data:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get profit and loss statement
 * @route   GET /api/dashboard/profit-loss
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getProfitLossStatement = async (req, res) => {
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

    // Get revenues (sales)
    const salesQuery = { ...dateFilter };
    const sales = await Sales.find(salesQuery);
    
    // Calculate total revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    // Group sales by fuel type
    const salesByFuelType = sales.reduce((acc, sale) => {
      if (!acc[sale.fuelType]) {
        acc[sale.fuelType] = {
          quantity: 0,
          amount: 0
        };
      }
      
      acc[sale.fuelType].quantity += sale.quantity;
      acc[sale.fuelType].amount += sale.totalAmount;
      
      return acc;
    }, {});
    
    // Convert to array for easier consumption
    const salesByFuelTypeArray = Object.entries(salesByFuelType).map(([fuelType, data]) => ({
      fuelType,
      quantity: data.quantity,
      amount: data.amount,
      percentage: (data.amount / totalRevenue) * 100
    }));
    
    // Get expenses
    const expenseQuery = { ...dateFilter, approvalStatus: 'Approved' };
    const expenses = await Expense.find(expenseQuery);
    
    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      
      acc[expense.category] += expense.amount;
      
      return acc;
    }, {});
    
    // Convert to array for easier consumption
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expensesByCategoryArray = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExpenses) * 100
    }));
    
    // Get payroll expenses
    const payrollQuery = { 
      ...dateFilter,
      paymentStatus: 'Paid'
    };
    const payrolls = await Payroll.find(payrollQuery);
    
    // Calculate payroll expenses
    const payrollExpenses = payrolls.reduce((sum, payroll) => {
      // Include the gross salary plus employer contributions
      return sum + 
        payroll.earnings.totalEarnings + 
        payroll.contributions.epfEmployer + 
        payroll.contributions.etf;
    }, 0);
    
    // Add payroll to expenses by category if not empty
    if (payrollExpenses > 0) {
      expensesByCategoryArray.push({
        category: 'Payroll',
        amount: payrollExpenses,
        percentage: (payrollExpenses / (totalExpenses + payrollExpenses)) * 100
      });
    }
    
    // Calculate total expenses including payroll
    const grandTotalExpenses = totalExpenses + payrollExpenses;
    
    // Calculate gross profit and net profit
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - grandTotalExpenses;
    
    // Format the profit & loss statement
    const profitLossStatement = {
      period: {
        startDate,
        endDate,
        name: period
      },
      revenue: {
        totalRevenue,
        salesByFuelType: salesByFuelTypeArray
      },
      expenses: {
        totalExpenses: grandTotalExpenses,
        expensesByCategory: expensesByCategoryArray
      },
      summary: {
        grossProfit,
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netProfit,
        netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      }
    };
    
    // Group data by time periods (for trend analysis)
    let timeFormat;
    switch(period) {
      case 'day':
        timeFormat = 'YYYY-MM-DD HH:00'; // hourly
        break;
      case 'week':
      case 'month':
        timeFormat = 'YYYY-MM-DD'; // daily
        break;
      case 'quarter':
        timeFormat = 'YYYY-MM-W'; // weekly
        break;
      case 'year':
        timeFormat = 'YYYY-MM'; // monthly
        break;
      default:
        timeFormat = 'YYYY-MM-DD'; // daily
    }
    
    // Group sales by time period
    const salesByTimePeriod = {};
    sales.forEach(sale => {
      const timePeriod = moment(sale.date).format(timeFormat);
      if (!salesByTimePeriod[timePeriod]) {
        salesByTimePeriod[timePeriod] = 0;
      }
      salesByTimePeriod[timePeriod] += sale.totalAmount;
    });
    
    // Group expenses by time period
    const expensesByTimePeriod = {};
    expenses.forEach(expense => {
      const timePeriod = moment(expense.date).format(timeFormat);
      if (!expensesByTimePeriod[timePeriod]) {
        expensesByTimePeriod[timePeriod] = 0;
      }
      expensesByTimePeriod[timePeriod] += expense.amount;
    });
    
    // Combine for trend data
    const allTimePeriods = new Set([
      ...Object.keys(salesByTimePeriod),
      ...Object.keys(expensesByTimePeriod)
    ]);
    
    const trends = Array.from(allTimePeriods).map(timePeriod => {
      const periodRevenue = salesByTimePeriod[timePeriod] || 0;
      const periodExpense = expensesByTimePeriod[timePeriod] || 0;
      const periodProfit = periodRevenue - periodExpense;
      
      return {
        period: timePeriod,
        revenue: periodRevenue,
        expenses: periodExpense,
        profit: periodProfit,
        profitMargin: periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
    
    // Add trends to the statement
    profitLossStatement.trends = trends;
    
    res.json({
      success: true,
      data: profitLossStatement
    });
  } catch (err) {
    console.error('Error generating profit & loss statement:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get balance sheet data
 * @route   GET /api/dashboard/balance-sheet
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getBalanceSheet = async (req, res) => {
  try {
    // Get query parameters
    const { stationId, asOfDate } = req.query;
    const balanceSheetDate = asOfDate ? new Date(asOfDate) : new Date();
    
    // Prepare filter
    const filter = {};
    if (stationId) {
      filter.stationId = stationId;
    }
    
    // 1. Get cash and bank account assets
    const bankAccounts = await BankAccount.find(filter);
    const totalBankBalance = bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
    
    // 2. Get petty cash assets
    const pettyCashBalances = await PettyCashBalance.find(filter);
    const totalPettyCash = pettyCashBalances.reduce((sum, balance) => sum + balance.currentBalance, 0);
    
    // 3. Get accounts receivable (implement this based on your customer credit system)
    // This is a placeholder, you'll need to adapt it to your actual model
    const accountsReceivable = 0;
    
    // 4. Get fuel inventory value (placeholder - needs actual fuel inventory system)
    // This is a placeholder, you'll need to connect to your inventory system
    const fuelInventoryValue = 0;
    
    // 5. Get fixed assets (placeholder - needs fixed asset register)
    // This is a placeholder, you'll need to develop a fixed assets system
    const fixedAssets = {
      land: 0,
      buildings: 0,
      equipment: 0,
      vehicles: 0,
      totalFixedAssets: 0
    };
    
    // 6. Get liabilities
    // 6.1 Accounts payable (placeholder - needs supplier payment system)
    const accountsPayable = 0;
    
    // 6.2 Outstanding loans
    const loans = await Loan.find({
      status: 'active',
      startDate: { $lte: balanceSheetDate }
    });
    const totalLoanBalance = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
    
    // 6.3 Employee obligations (EPF/ETF payable)
    const payrollObligations = await calculatePayrollObligations(balanceSheetDate);
    
    // 7. Calculate totals
    const totalCurrentAssets = totalBankBalance + totalPettyCash + accountsReceivable + fuelInventoryValue;
    const totalAssets = totalCurrentAssets + fixedAssets.totalFixedAssets;
    
    const totalCurrentLiabilities = accountsPayable + payrollObligations.totalDue;
    const totalLongTermLiabilities = totalLoanBalance;
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    
    // 8. Calculate equity (assets - liabilities)
    const ownersEquity = totalAssets - totalLiabilities;
    
    // Format and return the balance sheet
    const balanceSheet = {
      asOfDate: balanceSheetDate,
      stationId: stationId || 'All Stations',
      assets: {
        currentAssets: {
          cashAndBankAccounts: {
            bankAccounts: bankAccounts.map(account => ({
              accountId: account._id,
              accountName: account.accountName,
              bankName: account.bankName,
              balance: account.currentBalance
            })),
            pettyCash: pettyCashBalances.map(balance => ({
              stationId: balance.stationId,
              balance: balance.currentBalance
            })),
            totalCashAndBank: totalBankBalance + totalPettyCash
          },
          accountsReceivable,
          inventory: {
            fuelInventoryValue,
            // Add other inventory types here
            totalInventory: fuelInventoryValue
          },
          totalCurrentAssets
        },
        fixedAssets: {
          ...fixedAssets
        },
        totalAssets
      },
      liabilities: {
        currentLiabilities: {
          accountsPayable,
          payrollObligations: {
            epfPayable: payrollObligations.epfPayable,
            etfPayable: payrollObligations.etfPayable,
            totalPayrollObligations: payrollObligations.totalDue
          },
          // Add other current liabilities here
          totalCurrentLiabilities
        },
        longTermLiabilities: {
          loans: loans.map(loan => ({
            loanId: loan._id,
            purpose: loan.purpose,
            outstandingBalance: loan.remainingAmount
          })),
          totalLongTermLiabilities
        },
        totalLiabilities
      },
      equity: {
        ownersEquity,
        totalEquity: ownersEquity
      },
      liabilitiesAndEquity: totalLiabilities + ownersEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + ownersEquity)) < 0.01 // Check if balance sheet balances
    };
    
    res.json({
      success: true,
      data: balanceSheet
    });
  } catch (err) {
    console.error('Error generating balance sheet:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get cash flow statement
 * @route   GET /api/dashboard/cash-flow
 * @access  Private (Admin/Manager/Accountant)
 */
exports.getCashFlowStatement = async (req, res) => {
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

    // Get initial cash balance (bank + petty cash at start date)
    const initialCashBalance = await getInitialCashBalance(stationId, startDate);

    // Get all bank transactions for the period
    const bankTransactions = await BankTransaction.find({
      ...dateFilter
    }).sort({ date: 1 });

    // Group transactions
    const operatingActivities = {
      inflows: [],
      outflows: []
    };

    const investingActivities = {
      inflows: [],
      outflows: []
    };

    const financingActivities = {
      inflows: [],
      outflows: []
    };

    // Categorize transactions
    bankTransactions.forEach(transaction => {
      // Determine category based on transaction properties
      const transactionData = {
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount
      };

      if (transaction.category === 'Sales' || 
          transaction.category === 'Income' || 
          transaction.category === 'Revenue') {
        // Operating inflows
        operatingActivities.inflows.push({
          ...transactionData,
          type: 'Operating Revenue'
        });
      } else if (transaction.category === 'Expense' || 
                transaction.category === 'Utilities' || 
                transaction.category === 'Maintenance' ||
                transaction.category === 'Salary') {
        // Operating outflows
        operatingActivities.outflows.push({
          ...transactionData,
          type: 'Operating Expense'
        });
      } else if (transaction.category === 'Equipment Purchase' || 
                transaction.category === 'Asset Sale') {
        // Investing activities
        if (transaction.type === 'deposit') {
          investingActivities.inflows.push({
            ...transactionData,
            type: 'Asset Sale'
          });
        } else {
          investingActivities.outflows.push({
            ...transactionData,
            type: 'Asset Purchase'
          });
        }
      } else if (transaction.category === 'Loan' || 
                transaction.category === 'Investment') {
        // Financing activities
        if (transaction.type === 'deposit') {
          financingActivities.inflows.push({
            ...transactionData,
            type: 'Financing Inflow'
          });
        } else {
          financingActivities.outflows.push({
            ...transactionData,
            type: 'Financing Outflow'
          });
        }
      } else {
        // Default to operating activities
        if (transaction.type === 'deposit') {
          operatingActivities.inflows.push({
            ...transactionData,
            type: 'Other Operating Inflow'
          });
        } else {
          operatingActivities.outflows.push({
            ...transactionData,
            type: 'Other Operating Outflow'
          });
        }
      }
    });

    // Calculate sums
    const operatingInflowTotal = operatingActivities.inflows.reduce((sum, item) => sum + item.amount, 0);
    const operatingOutflowTotal = operatingActivities.outflows.reduce((sum, item) => sum + item.amount, 0);
    const netOperatingCashFlow = operatingInflowTotal - operatingOutflowTotal;

    const investingInflowTotal = investingActivities.inflows.reduce((sum, item) => sum + item.amount, 0);
    const investingOutflowTotal = investingActivities.outflows.reduce((sum, item) => sum + item.amount, 0);
    const netInvestingCashFlow = investingInflowTotal - investingOutflowTotal;

    const financingInflowTotal = financingActivities.inflows.reduce((sum, item) => sum + item.amount, 0);
    const financingOutflowTotal = financingActivities.outflows.reduce((sum, item) => sum + item.amount, 0);
    const netFinancingCashFlow = financingInflowTotal - financingOutflowTotal;

    // Calculate net cash flow
    const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    // Calculate ending cash balance
    const endingCashBalance = initialCashBalance + netCashFlow;

    // Format cash flow statement
    const cashFlowStatement = {
      period: {
        startDate,
        endDate,
        name: period
      },
      initialCashBalance,
      operatingActivities: {
        inflows: operatingActivities.inflows,
        totalInflows: operatingInflowTotal,
        outflows: operatingActivities.outflows,
        totalOutflows: operatingOutflowTotal,
        netCashFlow: netOperatingCashFlow
      },
      investingActivities: {
        inflows: investingActivities.inflows,
        totalInflows: investingInflowTotal,
        outflows: investingActivities.outflows,
        totalOutflows: investingOutflowTotal,
        netCashFlow: netInvestingCashFlow
      },
      financingActivities: {
        inflows: financingActivities.inflows,
        totalInflows: financingInflowTotal,
        outflows: financingActivities.outflows,
        totalOutflows: financingOutflowTotal,
        netCashFlow: netFinancingCashFlow
      },
      summary: {
        netOperatingCashFlow,
        netInvestingCashFlow,
        netFinancingCashFlow,
        netCashFlow,
        endingCashBalance
      }
    };

    res.json({
      success: true,
      data: cashFlowStatement
    });
  } catch (err) {
    console.error('Error generating cash flow statement:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get fuel price and profit margin analysis
 * @route   GET /api/dashboard/fuel-price-analysis
 * @access  Private (Admin/Manager)
 */
exports.getFuelPriceAnalysis = async (req, res) => {
  try {
    // Get query parameters
    const {
      period = 'month',
      fuelType,
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

    if (fuelType) {
      dateFilter.fuelType = fuelType;
    }

    // Get sales data
    const sales = await Sales.find(dateFilter).sort({ date: 1 });

    // If no sales data
    if (sales.length === 0) {
      return res.json({
        success: true,
        data: {
          period: {
            startDate,
            endDate,
            name: period
          },
          message: 'No sales data found for the specified period'
        }
      });
    }

    // Group by fuel type and then by date to find price changes
    const salesByFuelType = {};

    sales.forEach(sale => {
      if (!salesByFuelType[sale.fuelType]) {
        salesByFuelType[sale.fuelType] = [];
      }
      
      salesByFuelType[sale.fuelType].push({
        date: sale.date,
        unitPrice: sale.unitPrice,
        quantity: sale.quantity,
        totalAmount: sale.totalAmount
      });
    });

    // Analyze price changes and profit margins for each fuel type
    const fuelPriceAnalysis = {};

    // Define cost price for each fuel type (placeholder - need actual cost data)
    // This should come from your inventory/purchase system
    const fuelCostPrices = {
      'Petrol 92': 300, // Example cost price
      'Petrol 95': 350,
      'Auto Diesel': 250,
      'Super Diesel': 300,
      'Kerosene': 200
    };

    Object.entries(salesByFuelType).forEach(([type, salesData]) => {
      // Sort sales by date
      salesData.sort((a, b) => a.date - b.date);
      
      // Identify price changes
      const priceChanges = [];
      let currentPrice = salesData[0].unitPrice;
      
      salesData.forEach((sale, index) => {
        if (index === 0 || sale.unitPrice !== currentPrice) {
          priceChanges.push({
            date: sale.date,
            oldPrice: index === 0 ? null : currentPrice,
            newPrice: sale.unitPrice,
            changeAmount: index === 0 ? 0 : sale.unitPrice - currentPrice,
            changePercentage: index === 0 ? 0 : ((sale.unitPrice - currentPrice) / currentPrice) * 100
          });
          
          currentPrice = sale.unitPrice;
        }
      });
      
      // Calculate profit margins
      const costPrice = fuelCostPrices[type] || 0;
      const latestPrice = salesData[salesData.length - 1].unitPrice;
      const profitPerUnit = latestPrice - costPrice;
      const profitMarginPercentage = latestPrice > 0 ? (profitPerUnit / latestPrice) * 100 : 0;
      
      // Calculate total sales and profit
      const totalQuantity = salesData.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalSales = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalProfit = salesData.reduce((sum, sale) => {
        const profit = sale.quantity * (sale.unitPrice - costPrice);
        return sum + profit;
      }, 0);
      
      // Save the analysis
      fuelPriceAnalysis[type] = {
        currentPrice: latestPrice,
        costPrice,
        profitPerUnit,
        profitMarginPercentage,
        totalQuantity,
        totalSales,
        totalProfit,
        salesCount: salesData.length,
        priceChanges
      };
    });

    // Summary for all fuel types
    const overallSummary = {
      totalSales: Object.values(fuelPriceAnalysis).reduce((sum, analysis) => sum + analysis.totalSales, 0),
      totalProfit: Object.values(fuelPriceAnalysis).reduce((sum, analysis) => sum + analysis.totalProfit, 0),
      totalQuantity: Object.values(fuelPriceAnalysis).reduce((sum, analysis) => sum + analysis.totalQuantity, 0),
      averageProfitMargin: Object.values(fuelPriceAnalysis).reduce((sum, analysis) => sum + analysis.profitMarginPercentage, 0) / Object.keys(fuelPriceAnalysis).length
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          name: period
        },
        fuelPriceAnalysis,
        summary: overallSummary
      }
    });
  } catch (err) {
    console.error('Error generating fuel price analysis:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error'
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
  // Get sales
  const sales = await Sales.find(dateFilter).sort({ date: -1 });
  
  // Calculate total sales
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  
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
  
  // Get recent sales
  const recentSales = sales.slice(0, 5).map(sale => ({
    id: sale._id,
    saleId: sale.saleId,
    date: sale.date,
    fuelType: sale.fuelType,
    quantity: sale.quantity,
    totalAmount: sale.totalAmount,
    paymentMethod: sale.paymentMethod
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
}

/**
 * Get expense data for dashboard
 * @param {Object} dateFilter - Date filter object
 * @returns {Object} - Expense data
 */
async function getExpenseData(dateFilter) {
  // Add approval status to filter
  const expenseFilter = {
    ...dateFilter,
    approvalStatus: 'Approved'
  };
  
  // Get expenses
  const expenses = await Expense.find(expenseFilter).sort({ date: -1 });
  
  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Group by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    
    acc[expense.category] += expense.amount;
    
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
  
  // Get recent expenses
  const recentExpenses = expenses.slice(0, 5).map(expense => ({
    id: expense._id,
    expenseId: expense.expenseId,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod
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
}

/**
 * Get cash position data
 * @param {String} stationId - Station ID (optional)
 * @returns {Object} - Cash position data
 */
async function getCashPosition(stationId) {
  // Prepare filter
  const filter = {};
  if (stationId) {
    filter.stationId = stationId;
  }
  
  // Get bank account balances
  const bankAccounts = await BankAccount.find(filter);
  const totalBankBalance = bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  
  // Get petty cash balances
  const pettyCashBalances = await PettyCashBalance.find(filter);
  const totalPettyCash = pettyCashBalances.reduce((sum, balance) => sum + balance.currentBalance, 0);
  
  // Calculate total cash position
  const totalCashPosition = totalBankBalance + totalPettyCash;
  
  return {
    bankAccounts: bankAccounts.map(account => ({
      id: account._id,
      accountName: account.accountName,
      bankName: account.bankName,
      balance: account.currentBalance
    })),
    totalBankBalance,
    pettyCash: pettyCashBalances.map(balance => ({
      stationId: balance.stationId,
      balance: balance.currentBalance
    })),
    totalPettyCash,
    totalCashPosition
  };
}

/**
 * Calculate financial ratios
 * @param {Object} salesData - Sales data object
 * @param {Object} expenseData - Expense data object
 * @returns {Object} - Financial ratios
 */
function calculateFinancialRatios(salesData, expenseData) {
  const revenue = salesData.summary.totalSales;
  const expenses = expenseData.summary.totalExpenses;
  const profit = revenue - expenses;
  
  return {
    profitability: {
      grossProfitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      operatingExpenseRatio: revenue > 0 ? (expenses / revenue) * 100 : 0
    }
  };
}

/**
 * Get performance metrics
 * @param {Object} dateFilter - Date filter object
 * @param {String} period - Period (day, week, month, quarter, year)
 * @returns {Object} - Performance metrics
 */
async function getPerformanceMetrics(dateFilter, period) {
  // Get sales for current period
  const currentPeriodSales = await Sales.find(dateFilter);
  const currentPeriodRevenue = currentPeriodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Get expenses for current period
  const currentPeriodExpenses = await Expense.find({
    ...dateFilter,
    approvalStatus: 'Approved'
  });
  const currentPeriodExpenseTotal = currentPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate profit for current period
  const currentPeriodProfit = currentPeriodRevenue - currentPeriodExpenseTotal;
  
  // Calculate previous period dates
  const { startDate, endDate } = dateFilter.date;
  const duration = endDate - startDate;
  const previousPeriodEndDate = new Date(startDate);
  const previousPeriodStartDate = new Date(previousPeriodEndDate - duration);
  
  // Get sales for previous period
  const previousPeriodSales = await Sales.find({
    date: {
      $gte: previousPeriodStartDate,
      $lt: startDate
    }
  });
  const previousPeriodRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Get expenses for previous period
  const previousPeriodExpenses = await Expense.find({
    date: {
      $gte: previousPeriodStartDate,
      $lt: startDate
    },
    approvalStatus: 'Approved'
  });
  const previousPeriodExpenseTotal = previousPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
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
}

/**
 * Get staff metrics
 * @param {String} stationId - Station ID (optional)
 * @returns {Object} - Staff metrics
 */
async function getStaffMetrics(stationId) {
  // Prepare filter
  const filter = {};
  if (stationId) {
    filter.stationId = stationId;
  }
  
  // Get employee count
  const employees = await Employee.find(filter);
  const employeeCount = employees.length;
  
  // Calculate salary expenses
  const totalBasicSalary = employees.reduce((sum, employee) => sum + employee.salary.basic, 0);
  const totalAllowances = employees.reduce((sum, employee) => {
    const allowances = employee.salary.allowances || [];
    return sum + allowances.reduce((allowanceSum, allowance) => allowanceSum + allowance.amount, 0);
  }, 0);
  
  const totalSalaryExpense = totalBasicSalary + totalAllowances;
  
  // Get active loans
  const activeLoans = await Loan.find({
    employeeId: { $in: employees.map(employee => employee._id) },
    status: 'active'
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
      totalOutstandingAmount: activeLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0)
    }
  };
}

/**
 * Get initial cash balance
 * @param {String} stationId - Station ID (optional)
 * @param {Date} startDate - Start date
 * @returns {Number} - Initial cash balance
 */
async function getInitialCashBalance(stationId, startDate) {
  // Prepare filter
  const filter = {};
  if (stationId) {
    filter.stationId = stationId;
  }
  
  // Get bank accounts
  const bankAccounts = await BankAccount.find(filter);
  
  // Get each account's balance as of the start date
  let initialBankBalance = 0;
  
  for (const account of bankAccounts) {
    // Find the latest transaction before the start date
    const latestTransaction = await BankTransaction.findOne({
      account: account._id,
      date: { $lt: startDate }
    }).sort({ date: -1 });
    
    // If there's a transaction, use its balance; otherwise, use opening balance
    if (latestTransaction) {
      // Simulate balance calculation
      const depositsBeforeStart = await BankTransaction.find({
        account: account._id,
        type: 'deposit',
        date: { $lte: latestTransaction.date }
      });
      
      const withdrawalsBeforeStart = await BankTransaction.find({
        account: account._id,
        type: 'withdrawal',
        date: { $lte: latestTransaction.date }
      });
      
      const totalDeposits = depositsBeforeStart.reduce((sum, tx) => sum + tx.amount, 0);
      const totalWithdrawals = withdrawalsBeforeStart.reduce((sum, tx) => sum + tx.amount, 0);
      
      initialBankBalance += account.openingBalance + totalDeposits - totalWithdrawals;
    } else {
      initialBankBalance += account.openingBalance;
    }
  }
  
  // Get petty cash balances
  const pettyCashBalances = await PettyCashBalance.find(filter);
  let initialPettyCashBalance = 0;
  
  // For simplicity, we'll use the current petty cash balance
  // In a real implementation, you'd need to calculate the balance as of the start date
  initialPettyCashBalance = pettyCashBalances.reduce((sum, balance) => sum + balance.currentBalance, 0);
  
  return initialBankBalance + initialPettyCashBalance;
}

/**
 * Calculate payroll obligations
 * @param {Date} asOfDate - Date for which to calculate obligations
 * @returns {Object} - Payroll obligations
 */
async function calculatePayrollObligations(asOfDate) {
  // Get all payrolls that have been generated but not paid
  const pendingPayrolls = await Payroll.find({
    paymentStatus: 'Pending',
    createdAt: { $lte: asOfDate }
  });
  
  // Calculate total EPF and ETF due
  let epfEmployeeDue = 0;
  let epfEmployerDue = 0;
  let etfDue = 0;
  
  pendingPayrolls.forEach(payroll => {
    epfEmployeeDue += payroll.deductions.epfEmployee;
    epfEmployerDue += payroll.contributions.epfEmployer;
    etfDue += payroll.contributions.etf;
  });
  
  const epfPayable = epfEmployeeDue + epfEmployerDue;
  
  return {
    epfPayable,
    etfPayable: etfDue,
    totalDue: epfPayable + etfDue
  };
}