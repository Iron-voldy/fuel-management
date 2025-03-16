const moment = require('moment');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Expense = require('../models/Expense');
const Sales = require('../models/Sales');
const Payroll = require('../models/Payroll');
const calculationHelpers = require('./calculationHelpers');

/**
 * Generate bank book report for a specific period
 * @param {String} accountId - Bank account ID (optional)
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 */
exports.generateBankBookReport = async (accountId, startDate, endDate) => {
  try {
    // Build query
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (accountId) {
      query.accountId = accountId;
    }
    
    // Get transactions
    const transactions = await BankTransaction.find(query)
      .sort({ date: 1 })
      .populate({
        path: 'accountId',
        select: 'bankName accountNumber accountType'
      });
      
    // Get accounts info
    const accounts = await BankAccount.find(accountId ? { _id: accountId } : {});
    
    // Group transactions by account
    const transactionsByAccount = transactions.reduce((acc, transaction) => {
      const accountIdStr = transaction.accountId._id.toString();
      
      if (!acc[accountIdStr]) {
        acc[accountIdStr] = {
          accountInfo: {
            id: transaction.accountId._id,
            bankName: transaction.accountId.bankName,
            accountNumber: transaction.accountId.accountNumber,
            accountType: transaction.accountId.accountType
          },
          transactions: [],
          summary: {
            deposits: 0,
            withdrawals: 0,
            transfers: 0,
            charges: 0,
            interest: 0,
            other: 0
          }
        };
      }
      
      acc[accountIdStr].transactions.push(transaction);
      
      // Update summary
      if (transaction.type === 'deposit') {
        acc[accountIdStr].summary.deposits += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        acc[accountIdStr].summary.withdrawals += transaction.amount;
      } else if (transaction.type === 'transfer') {
        acc[accountIdStr].summary.transfers += transaction.amount;
      } else if (transaction.type === 'charge') {
        acc[accountIdStr].summary.charges += transaction.amount;
      } else if (transaction.type === 'interest') {
        acc[accountIdStr].summary.interest += transaction.amount;
      } else {
        acc[accountIdStr].summary.other += transaction.amount;
      }
      
      return acc;
    }, {});
    
    // Add opening and closing balances for each account
    for (const account of accounts) {
      const accountIdStr = account._id.toString();
      
      if (!transactionsByAccount[accountIdStr]) {
        // No transactions for this account in this period
        transactionsByAccount[accountIdStr] = {
          accountInfo: {
            id: account._id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountType: account.accountType
          },
          transactions: [],
          summary: {
            deposits: 0,
            withdrawals: 0,
            transfers: 0,
            charges: 0,
            interest: 0,
            other: 0
          }
        };
      }
      
      // Get opening balance - find the latest transaction before the start date
      const openingBalanceTransaction = await BankTransaction.findOne({
        accountId: account._id,
        date: { $lt: new Date(startDate) }
      }).sort({ date: -1 });
      
      let openingBalance = account.openingBalance;
      if (openingBalanceTransaction) {
        openingBalance = openingBalanceTransaction.balanceAfterTransaction;
      }
      
      // Get closing balance - find the latest transaction in or before the end date
      const closingBalanceTransaction = await BankTransaction.findOne({
        accountId: account._id,
        date: { $lte: new Date(endDate) }
      }).sort({ date: -1 });
      
      let closingBalance = account.openingBalance;
      if (closingBalanceTransaction) {
        closingBalance = closingBalanceTransaction.balanceAfterTransaction;
      }
      
      transactionsByAccount[accountIdStr].summary.openingBalance = openingBalance;
      transactionsByAccount[accountIdStr].summary.closingBalance = closingBalance;
    }
    
    // Prepare the final report
    const report = {
      reportType: 'Bank Book Report',
      period: {
        startDate,
        endDate
      },
      generatedAt: new Date(),
      accounts: Object.values(transactionsByAccount),
      totals: {
        openingBalance: 0,
        deposits: 0,
        withdrawals: 0,
        transfers: 0,
        charges: 0,
        interest: 0,
        other: 0,
        closingBalance: 0
      }
    };
    
    // Calculate overall totals
    report.accounts.forEach(account => {
      report.totals.openingBalance += account.summary.openingBalance || 0;
      report.totals.deposits += account.summary.deposits || 0;
      report.totals.withdrawals += account.summary.withdrawals || 0;
      report.totals.transfers += account.summary.transfers || 0;
      report.totals.charges += account.summary.charges || 0;
      report.totals.interest += account.summary.interest || 0;
      report.totals.other += account.summary.other || 0;
      report.totals.closingBalance += account.summary.closingBalance || 0;
    });
    
    return report;
  } catch (error) {
    console.error('Error generating bank book report:', error);
    throw error;
  }
};

/**
 * Generate cash flow report for a specific period
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 * @param {String} stationId - Station ID (optional)
 */
exports.generateCashFlowReport = async (startDate, endDate, stationId = null) => {
  try {
    // Build base query
    const dateQuery = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (stationId) {
      dateQuery.stationId = stationId;
    }
    
    // Get inflows (sales, deposits)
    const salesQuery = { ...dateQuery };
    const sales = await Sales.find(salesQuery);
    
    // Get bank deposits
    const depositQuery = { 
      ...dateQuery,
      type: 'deposit' 
    };
    const deposits = await BankTransaction.find(depositQuery);
    
    // Get outflows (expenses, withdrawals)
    const expenseQuery = { ...dateQuery };
    const expenses = await Expense.find(expenseQuery);
    
    // Get bank withdrawals and charges
    const withdrawalQuery = { 
      ...dateQuery,
      type: { $in: ['withdrawal', 'charge'] } 
    };
    const withdrawals = await BankTransaction.find(withdrawalQuery);
    
    // Get payroll expenses
    const payrollQuery = { ...dateQuery };
    const payrolls = await Payroll.find(payrollQuery);
    
    // Format inflows
    const inflows = [
      // Format sales
      ...sales.map(sale => ({
        date: sale.date,
        type: 'sale',
        category: 'sales',
        description: `Fuel Sale - ${sale.fuelType}`,
        amount: sale.totalAmount,
        reference: sale.saleId
      })),
      
      // Format deposits
      ...deposits.map(deposit => ({
        date: deposit.date,
        type: 'deposit',
        category: deposit.category,
        description: deposit.description,
        amount: deposit.amount,
        reference: deposit.transactionId
      }))
    ];
    
    // Format outflows
    const outflows = [
      // Format expenses
      ...expenses.map(expense => ({
        date: expense.date,
        type: 'expense',
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        reference: expense.expenseId
      })),
      
      // Format withdrawals
      ...withdrawals.map(withdrawal => ({
        date: withdrawal.date,
        type: withdrawal.type,
        category: withdrawal.category,
        description: withdrawal.description,
        amount: withdrawal.amount,
        reference: withdrawal.transactionId
      })),
      
      // Format payroll
      ...payrolls.map(payroll => ({
        date: payroll.createdAt,
        type: 'payroll',
        category: 'salary',
        description: `Salary Payment - ${payroll.payPeriod.month}/${payroll.payPeriod.year}`,
        amount: payroll.netSalary,
        reference: payroll.payrollId
      }))
    ];
    
    // Calculate cash flow summary
    const cashFlowSummary = calculationHelpers.calculateCashFlow(inflows, outflows);
    
    // Group flows by month
    const inflowsByMonth = {};
    const outflowsByMonth = {};
    
    inflows.forEach(inflow => {
      const monthYear = moment(inflow.date).format('YYYY-MM');
      if (!inflowsByMonth[monthYear]) {
        inflowsByMonth[monthYear] = 0;
      }
      inflowsByMonth[monthYear] += inflow.amount;
    });
    
    outflows.forEach(outflow => {
      const monthYear = moment(outflow.date).format('YYYY-MM');
      if (!outflowsByMonth[monthYear]) {
        outflowsByMonth[monthYear] = 0;
      }
      outflowsByMonth[monthYear] += outflow.amount;
    });
    
    // Build month-by-month summary
    const monthlyBreakdown = [];
    const allMonths = [...new Set([...Object.keys(inflowsByMonth), ...Object.keys(outflowsByMonth)])].sort();
    
    allMonths.forEach(monthYear => {
      const inflow = inflowsByMonth[monthYear] || 0;
      const outflow = outflowsByMonth[monthYear] || 0;
      const netCashFlow = inflow - outflow;
      
      monthlyBreakdown.push({
        month: monthYear,
        displayMonth: moment(monthYear).format('MMMM YYYY'),
        inflow,
        outflow,
        netCashFlow
      });
    });
    
    // Prepare the final report
    const report = {
      reportType: 'Cash Flow Report',
      period: {
        startDate,
        endDate
      },
      generatedAt: new Date(),
      summary: cashFlowSummary,
      monthlyBreakdown,
      details: {
        inflows,
        outflows
      }
    };
    
    return report;
  } catch (error) {
    console.error('Error generating cash flow report:', error);
    throw error;
  }
};

/**
 * Generate profit and loss report for a specific period
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 * @param {String} stationId - Station ID (optional)
 */
exports.generateProfitLossReport = async (startDate, endDate, stationId = null) => {
  try {
    // Build base query
    const dateQuery = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (stationId) {
      dateQuery.stationId = stationId;
    }
    
    // Get revenue (sales)
    const salesQuery = { ...dateQuery };
    const sales = await Sales.find(salesQuery);
    
    // Get expenses
    const expenseQuery = { ...dateQuery };
    const expenses = await Expense.find(expenseQuery);
    
    // Get payroll expenses
    const payrollQuery = { ...dateQuery };
    const payrolls = await Payroll.find(payrollQuery);
    
    // Calculate revenue
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
    
    // Calculate cost of sales (TODO: need fuel cost data)
    const costOfSales = 0; // Placeholder
    
    // Calculate gross profit
    const grossProfit = totalRevenue - costOfSales;
    
    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      
      acc[expense.category] += expense.amount;
      
      return acc;
    }, {});
    
    // Calculate payroll expenses
    const payrollExpenses = payrolls.reduce((sum, payroll) => {
      // Include the gross salary plus employer contributions
      return sum + 
        payroll.earnings.totalEarnings + 
        payroll.contributions.epfEmployer + 
        payroll.contributions.etf;
    }, 0);
    
    // Add payroll to expenses by category
    expensesByCategory['payroll'] = payrollExpenses;
    
    // Calculate total expenses
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate net profit
    const netProfit = grossProfit - totalExpenses;
    
    // Prepare the final report
    const report = {
      reportType: 'Profit & Loss Report',
      period: {
        startDate,
        endDate
      },
      generatedAt: new Date(),
      revenue: {
        totalRevenue,
        salesByFuelType
      },
      costOfSales,
      grossProfit,
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      expenses: {
        byCategory: expensesByCategory,
        totalExpenses
      },
      netProfit,
      netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
    
    return report;
  } catch (error) {
    console.error('Error generating profit and loss report:', error);
    throw error;
  }
};