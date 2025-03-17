const moment = require('moment');
const PettyCash = require('../models/PettyCash');
const PettyCashBalance = require('../models/PettyCashBalance');

/**
 * Generate petty cash ledger report
 * @param {String} stationId - Station ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Petty cash ledger report
 */
exports.generatePettyCashLedger = async (stationId, startDate, endDate) => {
  try {
    // Build query
    const query = {
      approvalStatus: 'Approved',
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (stationId) {
      query.stationId = stationId;
    }
    
    // Get transactions sorted by date
    const transactions = await PettyCash.find(query)
      .sort({ date: 1 })
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');
    
    // Get initial balance at start date
    let openingBalance = 0;
    
    // If stationId is specified, get the balance for that station
    if (stationId) {
      // Find the latest transaction before the start date
      const lastTransactionBeforeStart = await PettyCash.findOne({
        stationId,
        approvalStatus: 'Approved',
        date: { $lt: new Date(startDate) }
      }).sort({ date: -1 });
      
      if (lastTransactionBeforeStart) {
        // Calculate balance
        const withdrawalsBeforeStart = await PettyCash.find({
          stationId,
          approvalStatus: 'Approved',
          transactionType: 'withdrawal',
          date: { $lte: lastTransactionBeforeStart.date }
        });
        
        const replenishmentsBeforeStart = await PettyCash.find({
          stationId,
          approvalStatus: 'Approved',
          transactionType: 'replenishment',
          date: { $lte: lastTransactionBeforeStart.date }
        });
        
        const totalWithdrawals = withdrawalsBeforeStart.reduce((sum, tx) => sum + tx.amount, 0);
        const totalReplenishments = replenishmentsBeforeStart.reduce((sum, tx) => sum + tx.amount, 0);
        
        openingBalance = totalReplenishments - totalWithdrawals;
      }
    }
    
    // Format transactions for the report
    let runningBalance = openingBalance;
    const formattedTransactions = transactions.map(transaction => {
      if (transaction.transactionType === 'withdrawal') {
        runningBalance -= transaction.amount;
      } else {
        runningBalance += transaction.amount;
      }
      
      return {
        date: transaction.date,
        transactionId: transaction.transactionId,
        type: transaction.transactionType,
        description: transaction.description,
        category: transaction.category,
        withdrawal: transaction.transactionType === 'withdrawal' ? transaction.amount : 0,
        replenishment: transaction.transactionType === 'replenishment' ? transaction.amount : 0,
        balance: runningBalance,
        requestedBy: transaction.requestedBy ? transaction.requestedBy.name : 'Unknown',
        approvedBy: transaction.approvedBy ? transaction.approvedBy.name : 'Unknown'
      };
    });
    
    // Calculate totals
    const totalWithdrawals = formattedTransactions.reduce((sum, tx) => sum + tx.withdrawal, 0);
    const totalReplenishments = formattedTransactions.reduce((sum, tx) => sum + tx.replenishment, 0);
    const closingBalance = openingBalance + totalReplenishments - totalWithdrawals;
    
    // Group transactions by category
    const withdrawalsByCategory = {};
    
    formattedTransactions.forEach(tx => {
      if (tx.withdrawal > 0) {
        if (!withdrawalsByCategory[tx.category]) {
          withdrawalsByCategory[tx.category] = 0;
        }
        withdrawalsByCategory[tx.category] += tx.withdrawal;
      }
    });
    
    // Prepare the final report
    const report = {
      reportType: 'Petty Cash Ledger',
      period: {
        startDate,
        endDate
      },
      stationId,
      generatedAt: new Date(),
      summary: {
        openingBalance,
        totalWithdrawals,
        totalReplenishments,
        closingBalance,
        withdrawalsByCategory
      },
      transactions: formattedTransactions
    };
    
    return report;
  } catch (error) {
    console.error('Error generating petty cash ledger:', error);
    throw error;
  }
};

/**
 * Calculate petty cash statistics
 * @param {String} stationId - Station ID (optional)
 * @param {String} period - Period (day, week, month, quarter, year)
 * @returns {Object} - Petty cash statistics
 */
exports.calculatePettyCashStats = async (stationId, period = 'month') => {
  try {
    // Set date range based on period
    const today = new Date();
    let startDate, endDate = today;
    
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
    
    // Build query
    const query = {
      approvalStatus: 'Approved',
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (stationId) {
      query.stationId = stationId;
    }
    
    // Get withdrawals
    const withdrawals = await PettyCash.find({
      ...query,
      transactionType: 'withdrawal'
    });
    
    // Get replenishments
    const replenishments = await PettyCash.find({
      ...query,
      transactionType: 'replenishment'
    });
    
    // Calculate totals
    const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReplenishments = replenishments.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Group withdrawals by category
    const withdrawalsByCategory = {};
    
    withdrawals.forEach(withdrawal => {
      if (!withdrawalsByCategory[withdrawal.category]) {
        withdrawalsByCategory[withdrawal.category] = 0;
      }
      withdrawalsByCategory[withdrawal.category] += withdrawal.amount;
    });
    
    // Get top categories
    const topCategories = Object.entries(withdrawalsByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Group by time period (daily, weekly, monthly)
    const withdrawalsByDate = {};
    const replenishmentsByDate = {};
    
    let dateFormat;
    switch(period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD HH:00'; // Hourly
        break;
      case 'week':
        dateFormat = 'YYYY-MM-DD'; // Daily
        break;
      case 'month':
        dateFormat = 'YYYY-MM-DD'; // Daily
        break;
      case 'quarter':
      case 'year':
        dateFormat = 'YYYY-MM'; // Monthly
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }
    
    withdrawals.forEach(withdrawal => {
      const dateKey = moment(withdrawal.date).format(dateFormat);
      if (!withdrawalsByDate[dateKey]) {
        withdrawalsByDate[dateKey] = 0;
      }
      withdrawalsByDate[dateKey] += withdrawal.amount;
    });
    
    replenishments.forEach(replenishment => {
      const dateKey = moment(replenishment.date).format(dateFormat);
      if (!replenishmentsByDate[dateKey]) {
        replenishmentsByDate[dateKey] = 0;
      }
      replenishmentsByDate[dateKey] += replenishment.amount;
    });
    
    // Combine for trend data
    const allDates = new Set([
      ...Object.keys(withdrawalsByDate),
      ...Object.keys(replenishmentsByDate)
    ]);
    
    const trendData = Array.from(allDates).map(dateKey => ({
      date: dateKey,
      withdrawals: withdrawalsByDate[dateKey] || 0,
      replenishments: replenishmentsByDate[dateKey] || 0,
      net: (replenishmentsByDate[dateKey] || 0) - (withdrawalsByDate[dateKey] || 0)
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Get current balances
    const balances = await PettyCashBalance.find(stationId ? { stationId } : {});
    const totalCurrentBalance = balances.reduce((sum, balance) => sum + balance.currentBalance, 0);
    
    // Calculate stations that need replenishment
    const stationsNeedingReplenishment = balances.filter(balance => 
      balance.currentBalance < balance.minLimit
    ).map(balance => ({
      stationId: balance.stationId,
      currentBalance: balance.currentBalance,
      minLimit: balance.minLimit,
      shortfall: balance.minLimit - balance.currentBalance
    }));
    
    return {
      period: {
        name: period,
        startDate,
        endDate
      },
      summary: {
        currentBalance: totalCurrentBalance,
        totalWithdrawals,
        totalReplenishments,
        netChange: totalReplenishments - totalWithdrawals,
        withdrawalCount: withdrawals.length,
        replenishmentCount: replenishments.length,
        withdrawalsByCategory,
        topCategories
      },
      trend: trendData,
      stationsNeedingReplenishment
    };
  } catch (error) {
    console.error('Error calculating petty cash statistics:', error);
    throw error;
  }
};

/**
 * Check if petty cash needs replenishment and create reorder report
 * @returns {Object} - Replenishment needs report
 */
exports.checkReplenishmentNeeds = async () => {
  try {
    // Find all stations with balance below minimum threshold
    const lowBalanceStations = await PettyCashBalance.find({
      $expr: { $lt: ['$currentBalance', '$minLimit'] }
    });
    
    if (lowBalanceStations.length === 0) {
      return {
        needsReplenishment: false,
        stations: []
      };
    }
    
    // Calculate replenishment amounts
    const replenishmentNeeds = lowBalanceStations.map(station => {
      // Calculate how much to replenish - typically to max limit, can be adjusted
      const replenishmentAmount = station.maxLimit - station.currentBalance;
      
      return {
        stationId: station.stationId,
        currentBalance: station.currentBalance,
        minLimit: station.minLimit,
        maxLimit: station.maxLimit,
        shortfall: station.minLimit - station.currentBalance,
        recommendedReplenishment: replenishmentAmount,
        lastReplenishmentDate: station.lastReplenishmentDate,
        lastReplenishmentAmount: station.lastReplenishmentAmount
      };
    });
    
    return {
      needsReplenishment: true,
      stations: replenishmentNeeds,
      totalReplenishmentNeeded: replenishmentNeeds.reduce((sum, station) => sum + station.recommendedReplenishment, 0),
      reportDate: new Date()
    };
  } catch (error) {
    console.error('Error checking replenishment needs:', error);
    throw error;
  }
};